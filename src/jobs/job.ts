import { getDevicesFromCoda } from "../coda/getDevicesFromCoda";
import type { Device } from "../coda/getDevicesFromCoda"
import { checkDevice, getLocalDevices } from "../checkDevice";
import PocketBase from "pocketbase";
import { COLLECTIONS } from "../constants";

export interface DeviceLog {
  device: string; // PB Relation ID
  timestamp: Date | string;
}

export async function runJob(pb: PocketBase): Promise<void> {
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
      // Find the PB device ID first using the MAC address
      let pbDeviceRecord;
      try {
        pbDeviceRecord = await pb.collection(COLLECTIONS.DEVICES).getFirstListItem(`mac="${device.mac}"`);
      } catch (err) {
        console.warn(`⚠️ PB record not found for device ${device.description} (${device.mac}) even though it passed the check.`);
        continue;
      }

      const deviceLog: DeviceLog = {
        device: pbDeviceRecord.id,
        timestamp: new Date().toISOString()
      };
      console.log(deviceLog);
      await pb.collection(COLLECTIONS.DEVICE_LOGS).create(deviceLog);
      console.log(`✅ ${device.user} (${device.description}) passed at ${deviceLog.timestamp}`);
    } else {
      console.log(`❌ ${device.user} (${device.description}) did not pass`);
    }
  }
}
