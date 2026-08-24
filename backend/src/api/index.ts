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
    try {
        const result = await database.withDb(async (db) => {
            return await db.query(`
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
        });
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
    try {
        const items = await database.withDb(async (db) => {
            const [deviceRes, robinRes] = await Promise.all([
                db.query<[any[]]>(`
                    SELECT
                        device.user.id AS userId,
                        device.user.name AS userName,
                        device.description AS deviceDesc,
                        'device' AS type,
                        time::group(timestamp, 'day') AS day,
                        time::format(time::min(timestamp), '%H:%M') AS firstTime,
                        time::format(time::max(timestamp), '%H:%M') AS lastTime
                    FROM device_logs
                    WHERE timestamp >= <datetime>$start
                      AND timestamp <= <datetime>$end
                      AND device.ignored != true
                      AND device.user != NONE
                    GROUP BY device.user.id, device.description, day
                    ORDER BY day
                `, { start, end }),
                db.query<[any[]]>(`
                    SELECT
                        user.id AS userId,
                        user.name AS userName,
                        'Robin' AS deviceDesc,
                        'robin' AS type,
                        time::group(start, 'day') AS day,
                        time::format(start, '%H:%M') AS firstTime,
                        time::format(end, '%H:%M') AS lastTime
                    FROM robin_logs
                    WHERE start >= <datetime>$start
                      AND start <= <datetime>$end
                `, { start, end }),
            ]);

            return [...(deviceRes[0] ?? []), ...(robinRes[0] ?? [])];
        });

        console.log(`Presence returned ${items.length} records`);
        return c.json(items);
    } catch (err: any) {
        logger.error("API error in /api/presence:", err);
        return c.json({ error: err.message }, 500);
    }
});

pub.get("/people", async (c) => {
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
            return rows ?? [];
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

            return {
                presence: presenceRes[0] ?? [],
                deviceRows: deviceRes[0] ?? [],
                multiRows: multiRes[0] ?? [],
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
