import cron from "node-cron";
import { Database } from "../db/database";
import { runJob } from "./job";
import { syncRobinReservations } from "../jobs/robinSync";
import { syncDevices } from "../db/syncDevices";
import { initCollections } from "../db/initDb";
import { logger } from "../utils/logger";

export class Scheduler {
    constructor(private db: Database) { }

    start() {
        logger.info("⏰ Starting scheduler...");

        // Run every 15 minutes for office presence
        cron.schedule("*/15 * * * *", async () => {
            logger.info(`⏰ Running scheduled office job at ${new Date().toISOString()}`);
            try {
                await this.db.withDb(async (surreal) => {
                    await runJob(surreal);
                });
            } catch (err: any) {
                logger.error("❌ Office job error:", err);
            }
        });

        // Run daily at 03:00 for Device Sync and DB Init
        cron.schedule("0 3 * * *", async () => {
            logger.info(`⏰ Running scheduled device sync and init job at ${new Date().toISOString()}`);
            try {
                await this.db.withDb(async (surreal) => {
                    await initCollections(surreal);
                    await syncDevices(surreal);
                });
            } catch (err: any) {
                logger.error("❌ Device sync job error:", err);
            }
        });

        // Run daily at 22:00 for Robin reservations sync
        cron.schedule("0 22 * * *", async () => {
            logger.info(`⏰ Running scheduled Robin sync job at ${new Date().toISOString()}`);
            try {
                await this.db.withDb(async (surreal) => {
                    await syncRobinReservations(surreal);
                });
            } catch (err: any) {
                logger.error("❌ Robin sync job error:", err);
            }
        });
    }
}
