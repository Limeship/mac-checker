import { database } from "./db/database";
import { initCollections } from "./db/initDb";
import { syncDevices } from "./db/syncDevices";
import { runJob } from "./jobs/job";
import { Scheduler } from "./jobs/scheduler";
import { app } from "./api";

async function startApp() {
  console.log("🚀 Starting device checker and server...");
  try {
    await database.connect();
    const db = database.getInstance();

    await initCollections(db);
    await syncDevices(db);

    try {
      console.log("⏰ Running initial job at", new Date().toISOString());
      await runJob(db);
    } catch (jobErr: any) {
      console.warn("⚠️ Initial job failed:", jobErr.message);
    }

    const scheduler = new Scheduler(db);
    scheduler.start();

    // Start Hono server
    console.log("🌐 Server running at http://localhost:3000");
    Bun.serve({
      fetch: app.fetch,
      port: 3000,
    });

  } catch (err: any) {
    console.error("💥 Fatal error during startup:", err.message);
    process.exit(1);
  }
}

startApp();
