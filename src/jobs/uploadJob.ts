import PocketBase from "pocketbase";
import type { DeviceLog } from "./job";
import { addLineToResultTable } from "../coda/getDevicesFromCoda";
import { COLLECTIONS } from "../constants";

export async function uploadJob(pb: PocketBase): Promise<void> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const startStr = startOfDay.toISOString().replace('T', ' ');
    const endStr = endOfDay.toISOString().replace('T', ' ');

    const devices = await pb.collection(COLLECTIONS.DEVICE_LOGS).getFullList<any>({
        filter: `timestamp >= "${startStr}" && timestamp <= "${endStr}"`,
        expand: 'device'
    });

    const grouped = devices.reduce<Record<string, any[]>>((acc, item) => {
        const mac = item.expand?.device?.mac || "unknown";
        (acc[mac] ||= []).push(item);
        return acc;
    }, {});

    const result = [];
    for (const mac in grouped) {
        const item = grouped[mac];
        const earliest = Math.min(...item.map(e => new Date(e.timestamp).valueOf()));
        const latest = Math.max(...item.map(e => new Date(e.timestamp).valueOf()));
        const deviceData = item[0].expand?.device;
        result.push({
            Name: deviceData?.user || "Unknown",
            Device: deviceData?.description || "Unknown",
            Start: new Date(earliest),
            End: new Date(latest)
        });
    }
    await addLineToResultTable(result);
}
