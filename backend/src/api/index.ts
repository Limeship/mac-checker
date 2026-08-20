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
    const end   = c.req.query("end");
    if (!start || !end) return c.json({ error: "start and end required" }, 400);
    try {
        const result = await database.withDb(async (db) => {
            return await db.query(`
                RETURN array::flatten([
                    (SELECT
                        device.user.id   AS userId,
                        device.user.name AS userName,
                        device.description AS deviceDesc,
                        'device' AS type,
                        time::group(timestamp, 'day') AS day,
                        time::format(time::min(timestamp), '%H:%M') AS firstTime,
                        time::format(time::max(timestamp), '%H:%M') AS lastTime
                     FROM device_logs
                     WHERE timestamp >= $start AND timestamp <= $end
                       AND device.ignored != true
                     GROUP BY device.user.id, device.description, day),
                    (SELECT
                        user.id   AS userId,
                        user.name AS userName,
                        'robin'   AS type,
                        'Robin'   AS deviceDesc,
                        time::group(start, 'day') AS day,
                        time::format(start, '%H:%M') AS firstTime,
                        time::format(end,   '%H:%M') AS lastTime
                     FROM robin_logs
                     WHERE start >= $start AND start <= $end)
                ]);
            `, { start, end });
        });
        return c.json(result[0] ?? []);
    } catch (err: any) {
        logger.error("API error in /api/presence:", err);
        return c.json({ error: err.message }, 500);
    }
});

pub.get("/people", async (c) => {
    try {
        const result = await database.withDb(async (db) => {
            const [users, devices, latestLogs] = await Promise.all([
                db.query(`SELECT id, name FROM users ORDER BY name`),
                db.query(`SELECT id, description, mac, user FROM devices WHERE ignored != true`),
                db.query(`SELECT device, time::max(timestamp) AS lastSeen FROM device_logs GROUP BY device`),
            ]);

            const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
            const [recentLogs] = await db.query<[Array<{ device: string }>]>(
                `SELECT device FROM device_logs WHERE timestamp >= $ts GROUP BY device`,
                { ts: twentyMinsAgo }
            );
            const onlineSet = new Set((recentLogs ?? []).map((r: any) => String(r.device)));
            const lastSeenMap = new Map((latestLogs[0] as any[] ?? []).map((r: any) => [String(r.device), r.lastSeen]));

            return (users[0] as any[] ?? []).map((u: any) => ({
                id: u.id,
                name: u.name,
                devices: (devices[0] as any[] ?? [])
                    .filter((d: any) => String(d.user) === String(u.id))
                    .map((d: any) => ({
                        id: d.id,
                        description: d.description,
                        mac: d.mac,
                        online: onlineSet.has(String(d.id)),
                        lastSeen: lastSeenMap.get(String(d.id)) ?? null,
                    })),
            }));
        });
        return c.json(result);
    } catch (err: any) {
        logger.error("API error in /api/people:", err);
        return c.json({ error: err.message }, 500);
    }
});

pub.get("/stats", async (c) => {
    const start = c.req.query("start");
    const end   = c.req.query("end");
    if (!start || !end) return c.json({ error: "start and end required" }, 400);
    try {
        const result = await database.withDb(async (db) => {
            const [presence] = await db.query<[Array<any>]>(`
                SELECT
                    device.user.id   AS userId,
                    device.user.name AS userName,
                    time::group(timestamp, 'day') AS day,
                    time::format(time::min(timestamp), '%H:%M') AS firstTime,
                    time::format(time::max(timestamp), '%H:%M') AS lastTime,
                    math::round((time::max(timestamp) - time::min(timestamp)) / 1000000 / 60) AS minutes
                FROM device_logs
                WHERE timestamp >= $start AND timestamp <= $end
                  AND device.ignored != true
                GROUP BY device.user.id, day
                ORDER BY userId, day
            `, { start, end });

            const [deviceRows] = await db.query<[Array<any>]>(`
                SELECT
                    device.id          AS deviceId,
                    device.description AS deviceDesc,
                    device.user.name   AS userName,
                    array::len(array::distinct(array::group(time::group(timestamp, 'day')))) AS days
                FROM device_logs
                WHERE timestamp >= $start AND timestamp <= $end
                  AND device.ignored != true
                GROUP BY device.id
            `, { start, end });

            const [multiRows] = await db.query<[Array<any>]>(`
                SELECT
                    device.user.id   AS userId,
                    device.user.name AS userName,
                    time::group(timestamp, 'day') AS day,
                    array::len(array::distinct(array::group(device.id))) AS deviceCount
                FROM device_logs
                WHERE timestamp >= $start AND timestamp <= $end
                  AND device.ignored != true
                GROUP BY device.user.id, day
                HAVING deviceCount > 1
            `, { start, end });

            return { presence: presence ?? [], deviceRows: deviceRows ?? [], multiRows: multiRows ?? [] };
        });
        return c.json(result);
    } catch (err: any) {
        logger.error("API error in /api/stats:", err);
        return c.json({ error: err.message }, 500);
    }
});

app.route("/api", pub);

export { app };
