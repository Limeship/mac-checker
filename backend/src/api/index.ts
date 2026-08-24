import { Hono } from "hono";
import { database } from "../db/database";
import { CONFIG } from "../config";
import { logger } from "../utils/logger";

const app = new Hono();

// ── AUTHENTICATED ROUTES ──

const authed = new Hono();

authed.use("*", async (c, next) => {
    const authHeader = c.req.header("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");
    if (!apiKey || !CONFIG.API_KEYS.includes(apiKey)) {
        return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
});

authed.get("/data", async (c) => {
    const days = c.req.query("days") || "7";
    const duration = `${days}d`;
    logger.info(`🔍 GET /data [days=${days}]`);
    try {
        const result = await database.withDb(async (db) => {
            const res = await db.query<[any[]]>(`
                RETURN array::flatten([
                    (SELECT device.user.name AS user,
                        device.description AS description,
                        time::group(timestamp, 'day') AS day,
                        time::min(timestamp) AS first_time,
                        time::max(timestamp) AS last_time
                    FROM device_logs
                    WHERE timestamp > time::now() - <duration>$duration
                    GROUP BY device.user.name, device.description, day
                    ORDER BY day),
                    (SELECT start AS first_time, end AS last_time, user.name AS user, 'Robin' AS description, time::group(start, 'day') AS day FROM robin_logs where start > time::now() - <duration>$duration)
                ]);
            `, { duration });
            return res[0] ?? [];
        });
        logger.info(`📦 /data returned ${Array.isArray(result) ? result.length : 0} records`);
        return c.json(result);
    } catch (err: any) {
        logger.error("API error in /data:", err);
        return c.json({ error: err.message }, 500);
    }
});

app.route("/", authed);

// ── PUBLIC ROUTES (no auth — for frontend via internal proxy) ──

const pub = new Hono();

pub.get("/presence", async (c) => {
    const start = c.req.query("start");
    const end = c.req.query("end");
    if (!start || !end) return c.json({ error: "start and end required" }, 400);
    if (isNaN(Date.parse(start)) || isNaN(Date.parse(end))) return c.json({ error: "start and end must be valid ISO dates" }, 400);

    logger.info(`🔍 GET /api/presence [start=${start}, end=${end}]`);
    try {
        const items = await database.withDb(async (db) => {
            const [deviceRes, robinRes] = await Promise.all([
                db.query<[any[]]>(`
                    SELECT
                        device.user.id AS userId,
                        device.user.name AS userName,
                        device.description AS deviceDesc,
                        time::group(timestamp, 'day') AS day,
                        time::format(time::min(timestamp), '%H:%M') AS firstTime,
                        time::format(time::max(timestamp), '%H:%M') AS lastTime
                    FROM device_logs
                    WHERE timestamp >= <datetime>$start
                      AND timestamp <= <datetime>$end
                      AND device.ignored != true
                      AND device.user != NONE
                    GROUP BY device.user.id, device.user.name, device.description, day
                    ORDER BY day
                `, { start, end }),
                db.query<[any[]]>(`
                    SELECT
                        user.id AS userId,
                        user.name AS userName,
                        'Robin' AS deviceDesc,
                        time::group(start, 'day') AS day,
                        time::format(start, '%H:%M') AS firstTime,
                        time::format(end, '%H:%M') AS lastTime
                    FROM robin_logs
                    WHERE start >= <datetime>$start
                      AND start <= <datetime>$end
                `, { start, end }),
            ]);

            const deviceCount = deviceRes[0]?.length ?? 0;
            const robinCount = robinRes[0]?.length ?? 0;
            logger.info(`📊 /api/presence query results: ${deviceCount} device rows, ${robinCount} robin rows`);

            return [
                ...(deviceRes[0] ?? []).map((row) => ({ ...row, type: "device" })),
                ...(robinRes[0] ?? []).map((row) => ({ ...row, type: "robin" })),
            ];
        });

        logger.info(`📦 /api/presence returned ${items.length} total records`);
        return c.json(items);
    } catch (err: any) {
        logger.error("API error in /api/presence:", err);
        return c.json({ error: err.message }, 500);
    }
});

pub.get("/people", async (c) => {
    logger.info("🔍 GET /api/people");
    try {
        const result = await database.withDb(async (db) => {
            const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();
            const [rows] = await db.query<[any[]]>(`
                SELECT
                    id,
                    name,
                    (
                        SELECT
                            id,
                            description,
                            mac,
                            time::max(<-device_logs.timestamp) AS lastSeen,
                            count(<-device_logs[WHERE timestamp >= <datetime>$cutoff]) > 0 AS online
                        FROM devices
                        WHERE user = $parent.id
                          AND ignored != true
                    ) AS devices
                FROM users
                ORDER BY name
            `, { cutoff });
            const list = rows ?? [];
            logger.info(`📊 /api/people query results: ${list.length} users`);
            return list;
        });
        return c.json(result);
    } catch (err: any) {
        logger.error("API error in /api/people:", err);
        return c.json({ error: err.message }, 500);
    }
});

pub.get("/stats", async (c) => {
    const start = c.req.query("start");
    const end = c.req.query("end");
    if (!start || !end) return c.json({ error: "start and end required" }, 400);
    if (isNaN(Date.parse(start)) || isNaN(Date.parse(end))) return c.json({ error: "start and end must be valid ISO dates" }, 400);

    logger.info(`🔍 GET /api/stats [start=${start}, end=${end}]`);
    try {
        const result = await database.withDb(async (db) => {
            const [presenceRes, deviceRes, multiRes] = await Promise.all([
                // User daily presence
                db.query<[any[]]>(`
                    SELECT
                        device.user.id AS userId,
                        device.user.name AS userName,
                        time::group(timestamp, 'day') AS day,
                        time::format(time::min(timestamp), '%H:%M') AS firstTime,
                        time::format(time::max(timestamp), '%H:%M') AS lastTime,
                        math::round(duration::secs(time::max(timestamp) - time::min(timestamp)) / 60) AS minutes
                    FROM device_logs
                    WHERE timestamp >= <datetime>$start
                      AND timestamp <= <datetime>$end
                      AND device.ignored != true
                      AND device.user != NONE
                    GROUP BY device.user.id, day
                    ORDER BY device.user.id, day
                `, { start, end }),

                // Device uptime — unique days seen
                db.query<[any[]]>(`
                    SELECT
                        device.id AS deviceId,
                        device.description AS deviceDesc,
                        device.user.name AS userName,
                        array::len(array::distinct(array::group(time::group(timestamp, 'day')))) AS days
                    FROM device_logs
                    WHERE timestamp >= <datetime>$start
                      AND timestamp <= <datetime>$end
                      AND device.ignored != true
                      AND device.user != NONE
                    GROUP BY device.id
                `, { start, end }),

                // Multi-device days
                db.query<[any[]]>(`
                    SELECT
                        device.user.id AS userId,
                        device.user.name AS userName,
                        time::group(timestamp, 'day') AS day,
                        array::len(array::distinct(array::group(device))) AS deviceCount
                    FROM device_logs
                    WHERE timestamp >= <datetime>$start
                      AND timestamp <= <datetime>$end
                      AND device.ignored != true
                      AND device.user != NONE
                    GROUP BY device.user.id, day
                    HAVING deviceCount > 1
                `, { start, end }),
            ]);

            const presence = presenceRes[0] ?? [];
            const deviceRows = deviceRes[0] ?? [];
            const multiRows = multiRes[0] ?? [];
            logger.info(`📊 /api/stats results: ${presence.length} presence rows, ${deviceRows.length} device uptime rows, ${multiRows.length} multi-device rows`);

            return {
                presence,
                deviceRows,
                multiRows,
            };
        });
        return c.json(result);
    } catch (err: any) {
        logger.error("API error in /api/stats:", err);
        return c.json({ error: err.message }, 500);
    }
});

app.route("/api", pub);

export { app };
