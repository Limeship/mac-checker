import { Surreal } from "surrealdb";
import { CONFIG } from "../config";
import { logger } from "../utils/logger";

export class Database {
    private db: Surreal;
    private connected: boolean = false;
    private connectionCount: number = 0;
    private connectPromise: Promise<void> | null = null;

    constructor() {
        this.db = new Surreal();
    }

    async connect() {
        this.connectionCount++;
        if (this.connected) return;

        if (!this.connectPromise) {
            this.connectPromise = (async () => {
                logger.info(`🚀 Connecting to SurrealDB at ${CONFIG.SURREAL_URL}`);
                try {
                    await this.db.connect(CONFIG.SURREAL_URL);
                    await this.db.signin({
                        username: CONFIG.SURREAL_USER,
                        password: CONFIG.SURREAL_PASS,
                    });
                    await this.db.use({ namespace: CONFIG.SURREAL_NS, database: CONFIG.SURREAL_DB });
                    this.connected = true;
                    logger.info("✅ Authenticated with SurrealDB.");
                } catch (err: any) {
                    logger.error("❌ Failed to connect to SurrealDB:", err);
                    this.connectPromise = null;
                    throw err;
                }
            })();
        }

        try {
            await this.connectPromise;
        } catch (err) {
            this.connectionCount--;
            throw err;
        }
    }

    getInstance(): Surreal {
        return this.db;
    }

    async query<T>(sql: string, vars?: any): Promise<T> {
        return await this.db.query(sql, vars) as T;
    }

    async close() {
        if (!this.connected) return;
        this.connectionCount--;
        if (this.connectionCount === 0) {
            await this.db.close();
            this.connected = false;
            this.connectPromise = null;
            logger.info("💤 Database connection closed.");
        }
    }

    /**
     * Helper to run an operation within a connection that is automatically closed after use.
     */
    async withDb<T>(callback: (db: Surreal) => Promise<T>): Promise<T> {
        await this.connect();
        try {
            return await callback(this.db);
        } finally {
            await this.close();
        }
    }
}

export const database = new Database();
