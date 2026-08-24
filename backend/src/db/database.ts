import { Surreal, InvalidSessionError } from "surrealdb";
import { CONFIG } from "../config";
import { logger } from "../utils/logger";

const POOL_MAX = 5;

interface PoolSlot {
    db: Surreal;
    busy: boolean;
}

export class Database {
    private pool: PoolSlot[] = [];
    private queue: Array<(slot: PoolSlot) => void> = [];

    private async createConnection(): Promise<Surreal> {
        const db = new Surreal();
        logger.info(`🔌 Opening new SurrealDB connection (pool size: ${this.pool.length + 1}/${POOL_MAX})`);
        await db.connect(CONFIG.SURREAL_URL, {
            // SDK will automatically re-invoke this callback to renew the session when it expires
            authentication: {
                username: CONFIG.SURREAL_USER,
                password: CONFIG.SURREAL_PASS,
            },
            reconnect: {
                enabled: true,
                attempts: -1,       // unlimited reconnect attempts
                retryDelay: 500,
                retryDelayMax: 10000,
                retryDelayMultiplier: 1.5,
                retryDelayJitter: 0.2,
            },
        });
        await db.use({ namespace: CONFIG.SURREAL_NS, database: CONFIG.SURREAL_DB });
        return db;
    }

    private async acquire(): Promise<PoolSlot> {
        // Return an idle slot if one exists
        const idle = this.pool.find(s => !s.busy);
        if (idle) {
            idle.busy = true;
            return idle;
        }

        // Open a new connection if under the limit
        if (this.pool.length < POOL_MAX) {
            const db = await this.createConnection();
            const slot: PoolSlot = { db, busy: true };
            this.pool.push(slot);
            return slot;
        }

        // All slots busy and at limit — queue and wait
        return new Promise(resolve => {
            this.queue.push(resolve);
        });
    }

    private release(slot: PoolSlot): void {
        if (this.queue.length > 0) {
            const next = this.queue.shift()!;
            next(slot); // hand directly to the next waiter without marking idle
        } else {
            slot.busy = false;
        }
    }

    async withDb<T>(callback: (db: Surreal) => Promise<T>): Promise<T> {
        const slot = await this.acquire();
        try {
            return await callback(slot.db);
        } catch (err) {
            // If the session is unrecoverably invalid, destroy this slot so it
            // won't be reused — a fresh connection will be opened next time
            if (err instanceof InvalidSessionError) {
                logger.warn("⚠️ InvalidSessionError — removing connection from pool");
                this.pool = this.pool.filter(s => s !== slot);
                try { await slot.db.close(); } catch { /* ignore */ }
                // Don't release — slot is gone
                throw err;
            }
            throw err;
        } finally {
            // Only release if we didn't already remove the slot above
            if (this.pool.includes(slot)) {
                this.release(slot);
            }
        }
    }
}

export const database = new Database();
