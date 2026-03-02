import { Hono } from "hono";
import { database } from "../db/database";
import { CONFIG } from "../config";

const app = new Hono();

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
    try {
        const db = database.getInstance();
        const result = await db.query("SELECT * FROM devices FETCH user");
        return c.json(result);
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

export { app };
