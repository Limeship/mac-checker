import { Hono } from "hono";
import { database } from "../db/database";
import { CONFIG } from "../config";

const app = new Hono();

const query = `
select device.user.name as user, 
    device.description as description,
    time::group(timestamp, "day") AS day,
    time::min(timestamp) AS first_time,
    time::max(timestamp) AS last_time
FROM device_logs
WHERE timestamp > (time::now() - <duration>$duration)
GROUP BY device.user.name, device.description, day
order by day
`;

// Auth Middleware
app.use("*", async (c, next) => {
    const authHeader = c.req.header("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey || !CONFIG.API_KEYS.includes(apiKey)) {
        return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
});

// Predefined Query Endpoint
app.get("/data", async (c) => {
    const days = c.req.query("days") || "7";
    const duration = `${days}d`;

    try {
        const result = await database.withDb(async (db) => {
            return await db.query(query, { duration });
        });
        return c.json(result);
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

export { app };
