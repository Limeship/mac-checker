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
    try {
        const items = await database.withDb(async (db) => {
            const [logsRes, devicesRes, usersRes, robinRes] = await Promise.all([
                db.query<[any[]]>(
                    `SELECT device, timestamp FROM device_logs WHERE timestamp >= <datetime>$start AND timestamp <= <datetime>$end`,
                    { start, end }
                ),
                db.query<[any[]]>(`SELECT id, description, user, ignored FROM devices`),
                db.query<[any[]]>(`SELECT id, name FROM users`),
                db.query<[any[]]>(
                    `SELECT user, start, end FROM robin_logs WHERE start >= <datetime>$start AND start <= <datetime>$end`,
                    { start, end }
                ),
            ]);

            const logs = logsRes[0] ?? [];
            const devices = devicesRes[0] ?? [];
            const users = usersRes[0] ?? [];
            const robinLogs = robinRes[0] ?? [];

            const userMap = new Map<string, { id: string; name: string }>();
            for (const u of users) {
                userMap.set(String(u.id), { id: String(u.id), name: u.name });
            }

            const deviceMap = new Map<string, { id: string; desc: string; user?: { id: string; name: string }; ignored?: boolean }>();
            for (const d of devices) {
                const u = userMap.get(String(d.user));
                deviceMap.set(String(d.id), {
                    id: String(d.id),
                    desc: d.description,
                    user: u,
                    ignored: d.ignored === true,
                });
            }

            const grouped = new Map<string, {
                userId: string;
                userName: string;
                deviceDesc: string;
                type: 'device';
                day: string;
                timestamps: number[];
            }>();

            for (const log of logs) {
                const dev = deviceMap.get(String(log.device));
                if (!dev || dev.ignored || !dev.user) continue;

                const date = new Date(log.timestamp);
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                const day = `${y}-${m}-${d}`;

                const key = `${dev.user.id}_${dev.desc}_${day}`;
                let entry = grouped.get(key);
                if (!entry) {
                    entry = {
                        userId: dev.user.id,
                        userName: dev.user.name,
                        deviceDesc: dev.desc,
                        type: 'device',
                        day,
                        timestamps: [],
                    };
                    grouped.set(key, entry);
                }
                entry.timestamps.push(date.getTime());
            }

            const presenceList: any[] = [];
            for (const g of grouped.values()) {
                g.timestamps.sort((a, b) => a - b);
                const minDate = new Date(g.timestamps[0]);
                const maxDate = new Date(g.timestamps[g.timestamps.length - 1]);

                const firstTime = `${String(minDate.getHours()).padStart(2, '0')}:${String(minDate.getMinutes()).padStart(2, '0')}`;
                const lastTime = `${String(maxDate.getHours()).padStart(2, '0')}:${String(maxDate.getMinutes()).padStart(2, '0')}`;

                presenceList.push({
                    userId: g.userId,
                    userName: g.userName,
                    deviceDesc: g.deviceDesc,
                    type: 'device',
                    day: g.day,
                    firstTime,
                    lastTime,
                });
            }

            for (const r of robinLogs) {
                const u = userMap.get(String(r.user));
                if (!u) continue;

                const startDate = new Date(r.start);
                const endDate = new Date(r.end);
                const y = startDate.getFullYear();
                const m = String(startDate.getMonth() + 1).padStart(2, '0');
                const d = String(startDate.getDate()).padStart(2, '0');
                const day = `${y}-${m}-${d}`;

                const firstTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
                const lastTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

                presenceList.push({
                    userId: u.id,
                    userName: u.name,
                    deviceDesc: 'Robin',
                    type: 'robin',
                    day,
                    firstTime,
                    lastTime,
                });
            }

            return presenceList;
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
            const [users, devices, latestLogs] = await Promise.all([
                db.query(`SELECT id, name FROM users ORDER BY name`),
                db.query(`SELECT id, description, mac, user FROM devices WHERE ignored != true`),
                db.query(`SELECT device, time::max(timestamp) AS lastSeen FROM device_logs GROUP BY device`),
            ]);

            const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
            const [recentLogs] = await db.query<[Array<{ device: string }>]>(
                `SELECT device FROM device_logs WHERE timestamp >= <datetime>$ts GROUP BY device`,
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
    const end = c.req.query("end");
    if (!start || !end) return c.json({ error: "start and end required" }, 400);
    try {
        const result = await database.withDb(async (db) => {
            const [logsRes, devicesRes, usersRes] = await Promise.all([
                db.query<[any[]]>(
                    `SELECT device, timestamp FROM device_logs WHERE timestamp >= <datetime>$start AND timestamp <= <datetime>$end`,
                    { start, end }
                ),
                db.query<[any[]]>(`SELECT id, description, user, ignored FROM devices`),
                db.query<[any[]]>(`SELECT id, name FROM users`),
            ]);

            const logs = logsRes[0] ?? [];
            const devices = devicesRes[0] ?? [];
            const users = usersRes[0] ?? [];

            const userMap = new Map<string, { id: string; name: string }>();
            for (const u of users) {
                userMap.set(String(u.id), { id: String(u.id), name: u.name });
            }

            const deviceMap = new Map<string, { id: string; desc: string; user?: { id: string; name: string }; ignored?: boolean }>();
            for (const d of devices) {
                const u = userMap.get(String(d.user));
                deviceMap.set(String(d.id), {
                    id: String(d.id),
                    desc: d.description,
                    user: u,
                    ignored: d.ignored === true,
                });
            }

            // User daily presence
            const userDayLogs = new Map<string, { userId: string; userName: string; day: string; timestamps: number[] }>();
            // Device days
            const deviceDays = new Map<string, { deviceId: string; deviceDesc: string; userName: string; days: Set<string> }>();
            // Multi device per user per day
            const userDayDevices = new Map<string, { userId: string; userName: string; day: string; devices: Set<string> }>();

            for (const log of logs) {
                const dev = deviceMap.get(String(log.device));
                if (!dev || dev.ignored || !dev.user) continue;

                const date = new Date(log.timestamp);
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                const day = `${y}-${m}-${d}`;

                // user day
                const udKey = `${dev.user.id}_${day}`;
                let ud = userDayLogs.get(udKey);
                if (!ud) {
                    ud = { userId: dev.user.id, userName: dev.user.name, day, timestamps: [] };
                    userDayLogs.set(udKey, ud);
                }
                ud.timestamps.push(date.getTime());

                // device days
                let dd = deviceDays.get(dev.id);
                if (!dd) {
                    dd = { deviceId: dev.id, deviceDesc: dev.desc, userName: dev.user.name, days: new Set() };
                    deviceDays.set(dev.id, dd);
                }
                dd.days.add(day);

                // multi device
                let udd = userDayDevices.get(udKey);
                if (!udd) {
                    udd = { userId: dev.user.id, userName: dev.user.name, day, devices: new Set() };
                    userDayDevices.set(udKey, udd);
                }
                udd.devices.add(dev.id);
            }

            const presence = [...userDayLogs.values()].map(ud => {
                ud.timestamps.sort((a, b) => a - b);
                const minDate = new Date(ud.timestamps[0]);
                const maxDate = new Date(ud.timestamps[ud.timestamps.length - 1]);
                const minutes = Math.round((maxDate.getTime() - minDate.getTime()) / 60000);
                const firstTime = `${String(minDate.getHours()).padStart(2, '0')}:${String(minDate.getMinutes()).padStart(2, '0')}`;
                const lastTime = `${String(maxDate.getHours()).padStart(2, '0')}:${String(maxDate.getMinutes()).padStart(2, '0')}`;
                return {
                    userId: ud.userId,
                    userName: ud.userName,
                    day: ud.day,
                    firstTime,
                    lastTime,
                    minutes,
                };
            }).sort((a, b) => a.userId.localeCompare(b.userId) || a.day.localeCompare(b.day));

            const deviceRows = [...deviceDays.values()].map(dd => ({
                deviceId: dd.deviceId,
                deviceDesc: dd.deviceDesc,
                userName: dd.userName,
                days: dd.days.size,
            }));

            const multiRows = [...userDayDevices.values()]
                .filter(udd => udd.devices.size > 1)
                .map(udd => ({
                    userId: udd.userId,
                    userName: udd.userName,
                    day: udd.day,
                    deviceCount: udd.devices.size,
                }));

            return { presence, deviceRows, multiRows };
        });
        return c.json(result);
    } catch (err: any) {
        logger.error("API error in /api/stats:", err);
        return c.json({ error: err.message }, 500);
    }
});

app.route("/api", pub);

export { app };
