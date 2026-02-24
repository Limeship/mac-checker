import cron from "node-cron";
import PocketBase from "pocketbase";
import { uploadJob } from "./uploadJob";
import { runJob } from "./job";
import dotenv from "dotenv"

dotenv.config()

const PB_URL = process.env.PB_URL || "http://localhost:8090";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || "admin@example.com";
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || "change_me_12345";

const pb = new PocketBase(PB_URL);

async function startApp() {
  console.log("🚀 Starting device checker, connecting to PocketBase...");
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log("✅ Authenticated with PocketBase.");
  } catch (err: any) {
    console.error("❌ Failed to authenticate with PocketBase:", err.message);
  }

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
