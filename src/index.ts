import cron from "node-cron";
import { Surreal } from "surrealdb";
import { runJob } from "./jobs/job";
import { initCollections } from "./db/initDb";
import { syncDevices } from "./db/syncDevices";
import { CONFIG } from "./config";
import { getPeopleFromCoda } from "./coda/getDevicesFromCoda";

const db = new Surreal();

async function startApp() {
  console.log("🚀 Starting device checker, connecting to SurrealDB...");
  try {
    await db.connect(CONFIG.SURREAL_URL);
    await db.signin({
      username: CONFIG.SURREAL_USER,
      password: CONFIG.SURREAL_PASS,
    });
    await db.use({ namespace: CONFIG.SURREAL_NS, database: CONFIG.SURREAL_DB });
    console.log("✅ Authenticated with SurrealDB.");

    await initCollections(db);
    await syncDevices(db);
  } catch (err: any) {
    console.error("❌ Failed to authenticate or initialize SurrealDB:", err.message);
    return;
  }

  console.log("⏰ Running initial job at", new Date().toISOString());
  await runJob(db);

  // Run every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("⏰ Running scheduled job at", new Date().toISOString());
    try {
      await runJob(db);
    } catch (err: any) {
      console.error("❌ Job error:", err.message);
    }
  });

  // Keep container alive
  process.stdin.resume();
}

startApp().catch(err => {
  console.error("💥 Fatal error:", err.message);
  process.exit(1);
});
