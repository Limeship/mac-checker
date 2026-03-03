import { Surreal } from "surrealdb";
import { CONFIG } from "../config";

export class Database {
    private db: Surreal;
    private connected: boolean = false;

    constructor() {
        this.db = new Surreal();
    }

    async connect() {
        if (this.connected) return;
        console.log("🚀 Connecting to SurrealDB at", CONFIG.SURREAL_URL);
        try {
            await this.db.connect(CONFIG.SURREAL_URL);
            await this.db.signin({
                username: CONFIG.SURREAL_USER,
                password: CONFIG.SURREAL_PASS,
            });
            await this.db.use({ namespace: CONFIG.SURREAL_NS, database: CONFIG.SURREAL_DB });
            this.connected = true;
            console.log("✅ Authenticated with SurrealDB.");
        } catch (err: any) {
            console.error("❌ Failed to connect to SurrealDB:", err.message);
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
        await this.db.close();
        this.connected = false;
        console.log("💤 Database connection closed.");
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
