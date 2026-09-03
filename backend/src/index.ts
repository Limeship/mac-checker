import { database } from "./db/database";
import { initCollections } from "./db/initDb";
import { syncDevices } from "./db/syncDevices";
import { runJob } from "./jobs/job";
import { Scheduler } from "./jobs/scheduler";
import { app } from "./api";
import { schedulerLogger as logger } from "./utils/logger";

const isProd = Bun.env.NODE_ENV === 'production';

async function startApp() {
  logger.info("🚀 Starting device checker and server...");
  try {
    if (isProd) {
      await database.withDb(async (db) => {
        await initCollections(db);
        await syncDevices(db);
      });

      try {
        logger.info(`⏰ Running initial job at ${new Date().toISOString()}`);
        await database.withDb(async (db) => {
          await runJob(db);
        });
      } catch (jobErr: any) {
        logger.warn("⚠️ Initial job failed:", jobErr);
      }

      const scheduler = new Scheduler(database);
      scheduler.start();
    } else {
      logger.info("🛠️ Dev mode — skipping DB init, device sync, job runner and scheduler");
    }

    // Start Hono server
    logger.info("🌐 Server running at http://localhost:3000");
    Bun.serve({
      fetch: app.fetch,
      port: 3000,
    });

  } catch (err: any) {
    logger.error("💥 Fatal error during startup:", err);
    process.exit(1);
  }
}

startApp();
