import { Surreal } from "surrealdb";
import { codaService, type Device } from "../services/coda.service";
import { checkDevice, getLocalDevices } from "../utils/checkDevice";
import { COLLECTIONS } from "../constants";
import { DbDevice } from "../types/db";
import { logger } from "../utils/logger";

export async function runJob(db: Surreal): Promise<void> {
  let devices: Device[];

  try {
    devices = await codaService.getDevices();
  } catch (err) {
    logger.error("❌ Error fetching devices from Coda:", err);
    return;
  }

  const localDevices = await getLocalDevices();

  for (const device of devices) {
    const ok = await checkDevice(localDevices, device.mac);
    if (ok) {
      try {
        const results = await db.query<[DbDevice[]]>(
          `SELECT id, user, description, mac, ignored FROM ${COLLECTIONS.DEVICES} WHERE mac = $mac`,
          { mac: device.mac }
        );
        const dbDevice = results[0][0];

        if (!dbDevice) {
          logger.warn(`⚠️ SurrealDB record not found for device ${device.description} (${device.mac}) even though it passed the check.`);
          continue;
        }
        if (dbDevice.ignored) {
          logger.info(`⏩ Skipping update for ignored device: ${device.user} (${device.mac})`);
          continue;
        }
        const logData = {
          device: dbDevice.id,
          timestamp: new Date(),
        };

        await db.query(`CREATE ${COLLECTIONS.DEVICE_LOGS} CONTENT $data`, {
          data: logData
        });
        logger.info(`✅ ${device.user} (${device.description}) passed at ${logData.timestamp}`);
      } catch (err: any) {
        logger.error(`❌ Error creating log for ${device.mac}:`, err);
      }
    } else {
      logger.info(`❌ ${device.user} (${device.description}) did not pass`);
    }
  }
}
