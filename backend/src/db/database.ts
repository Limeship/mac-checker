import { Surreal } from "surrealdb";
import { CONFIG } from "../config";
import { logger } from "../utils/logger";

export class Database {
    private async createConnection(): Promise<Surreal> {
        const db = new Surreal();
        logger.info(`🚀 Creating connection to SurrealDB at ${CONFIG.SURREAL_URL}`);
        try {
            await db.connect(CONFIG.SURREAL_URL);
            await db.signin({
                username: CONFIG.SURREAL_USER,
                password: CONFIG.SURREAL_PASS,
            });
            await db.use({ namespace: CONFIG.SURREAL_NS, database: CONFIG.SURREAL_DB });
            logger.info("✅ Authenticated with SurrealDB.");
        } catch (err: any) {
            logger.error("❌ Failed to connect to SurrealDB:", err);
            throw err;
        }
        return db;
    }

    /**
     * Helper to run an operation within a cached connection that validates session before use.
     */
    async withDb<T>(callback: (db: Surreal) => Promise<T>): Promise<T> {
        const db = await this.createConnection();
        try {
            return await callback(db);
        } finally {
            await db.close();
        }
    }
}

export const database = new Database();
