import cron from "node-cron";
import Datastore from "nedb-promises";
import { uploadJob } from "./uploadJob";
import { runJob } from "./job";
import dotenv from "dotenv"

dotenv.config()
const db = Datastore.create({ filename: "/data/devices.db", autoload: true });

console.log("🚀 Starting device checker...");

// Run every 15 minutes
cron.schedule("*/15 * * * *", async () => {
  console.log("⏰ Running scheduled job at", new Date().toISOString());
  await runJob(db);
});

cron.schedule("0 18 * * *", async () => {
  console.log("⏰ Uploading data to Coda", new Date().toISOString());
  await uploadJob(db);
});

// Keep container alive
process.stdin.resume();
