import { database } from "./db/database";
import { initCollections } from "./db/initDb";
import { syncDevices } from "./db/syncDevices";
import { runJob } from "./jobs/job";
import { Scheduler } from "./jobs/scheduler";

async function startApp() {
  console.log("🚀 Starting device checker...");
  try {
    await database.connect();
    const db = database.getInstance();

    await initCollections(db);
    await syncDevices(db);

    console.log("⏰ Running initial job at", new Date().toISOString());
    await runJob(db);

    const scheduler = new Scheduler(db);
    scheduler.start();

    // Keep container alive
    process.stdin.resume();
  } catch (err: any) {
    console.error("💥 Fatal error during startup:", err.message);
    process.exit(1);
  }
}

startApp();
