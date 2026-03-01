import { Surreal } from "surrealdb";
import { getDevicesFromCoda } from "../coda/getDevicesFromCoda";
import type { Device } from "../coda/getDevicesFromCoda"
import { checkDevice, getLocalDevices } from "../checkDevice";
import { COLLECTIONS } from "../constants";

export interface DeviceLog {
  device: string; // SurrealDB Record ID
  timestamp: Date | string;
}

export async function runJob(db: Surreal): Promise<void> {
  let devices: Device[];

  try {
    devices = await getDevicesFromCoda();
  } catch (err) {
    console.error("❌ Error reading devices.txt:", (err as Error).message);
    return;
  }

  const localDevices = await getLocalDevices();

  for (const device of devices) {
    const ok = await checkDevice(localDevices, device.mac);
    if (ok) {
      // Find the device ID first using the MAC address
      try {
        const results = await db.query<[any[]]>(
          `SELECT * FROM ${COLLECTIONS.DEVICES} WHERE mac = $mac`,
          { mac: device.mac }
        );
        const dbDevice = results[0][0];

        if (!dbDevice) {
          console.warn(`⚠️ SurrealDB record not found for device ${device.description} (${device.mac}) even though it passed the check.`);
          continue;
        }

        const logData = {
          device: dbDevice.id,
          timestamp: new Date()
        };

        await db.query(`CREATE ${COLLECTIONS.DEVICE_LOGS} CONTENT $data`, {
          data: logData
        });
        console.log(`✅ ${device.user} (${device.description}) passed at ${logData.timestamp}`);
      } catch (err: any) {
        console.error(`❌ Error creating log for ${device.mac}:`, err.message);
      }
    } else {
      console.log(`❌ ${device.user} (${device.description}) did not pass`);
    }
  }
}
