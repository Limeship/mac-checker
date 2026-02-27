import cron from "node-cron";
import PocketBase from "pocketbase";
import { uploadJob } from "./jobs/uploadJob";
import { runJob } from "./jobs/job";
import { initCollections } from "./db/initDb";
import { syncDevicesToPb } from "./db/syncDevices";
import { CONFIG } from "./config";

const pb = new PocketBase(CONFIG.PB_URL);

async function startApp() {
  console.log("🚀 Starting device checker, connecting to PocketBase...");
  try {
    await pb.collection("_superusers").authWithPassword(CONFIG.PB_ADMIN_EMAIL, CONFIG.PB_ADMIN_PASSWORD);
    console.log("✅ Authenticated with PocketBase.");
    await initCollections(pb);
    await syncDevicesToPb(pb);
  } catch (err: any) {
    console.error("❌ Failed to authenticate or initialize PocketBase:", err.message);
  }
  console.log("⏰ Running scheduled job at", new Date().toISOString());
  //await runJob(pb);
  // Run every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("⏰ Running scheduled job at", new Date().toISOString());
    await runJob(pb);
  });

  cron.schedule("0 18 * * *", async () => {
    console.log("⏰ Uploading data to Coda", new Date().toISOString());
    await uploadJob(pb);
  });

  // Keep container alive
  process.stdin.resume();
}

startApp();
