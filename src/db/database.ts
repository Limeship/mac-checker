import { Surreal } from "surrealdb";
import { CONFIG } from "../config";

export class Database {
    private db: Surreal;

    constructor() {
        this.db = new Surreal();
    }

    async connect() {
        console.log("🚀 Connecting to SurrealDB at", CONFIG.SURREAL_URL);
        try {
            await this.db.connect(CONFIG.SURREAL_URL);
            await this.db.signin({
                username: CONFIG.SURREAL_USER,
                password: CONFIG.SURREAL_PASS,
            });
            await this.db.use({ namespace: CONFIG.SURREAL_NS, database: CONFIG.SURREAL_DB });
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
        await this.db.close();
    }
}

export const database = new Database();
