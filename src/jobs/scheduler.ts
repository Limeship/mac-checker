import cron from "node-cron";
import { Surreal } from "surrealdb";
import { runJob } from "./job";
import { syncRobinReservations } from "../jobs/robinSync";

export class Scheduler {
    constructor(private db: Surreal) { }

    start() {
        console.log("⏰ Starting scheduler...");

        // Run every 15 minutes for office presence
        cron.schedule("*/15 * * * *", async () => {
            console.log("⏰ Running scheduled office job at", new Date().toISOString());
            try {
                await runJob(this.db);
            } catch (err: any) {
                console.error("❌ Office job error:", err.message);
            }
        });

        // Run daily at 22:00 for Robin reservations sync
        cron.schedule("0 22 * * *", async () => {
            console.log("⏰ Running scheduled Robin sync job at", new Date().toISOString());
            try {
                await syncRobinReservations(this.db);
            } catch (err: any) {
                console.error("❌ Robin sync job error:", err.message);
            }
        });
    }
}
