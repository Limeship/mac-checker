import { getDevicesFromCoda } from "./getDevicesFromCoda";
import type { Device } from "./getDevicesFromCoda"
import { checkDevice, getLocalDevices } from "./checkDevice";
import Datastore from "nedb-promises";

export interface DeviceLog extends Device {
  timestamp: Date;
}

export async function runJob(db: Datastore<DeviceLog>): Promise<void> {
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
      const deviceLog: DeviceLog = {
        ...device,
        timestamp: new Date()
      };
      await db.insert(deviceLog);
      console.log(`✅ ${deviceLog.user} (${deviceLog.description}) passed at ${deviceLog.timestamp}`);
    } else {
      console.log(`❌ ${device.user} (${device.description}) did not pass`);
    }
  }
}
