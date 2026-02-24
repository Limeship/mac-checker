import PocketBase from "pocketbase";
import type { DeviceLog } from "./job";
import { addLineToResultTable } from "./getDevicesFromCoda";

export async function uploadJob(pb: PocketBase): Promise<void> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const startStr = startOfDay.toISOString().replace('T', ' ');
    const endStr = endOfDay.toISOString().replace('T', ' ');

    const devices = await pb.collection("device_logs").getFullList<DeviceLog>({
        filter: `timestamp >= "${startStr}" && timestamp <= "${endStr}"`
    });

    const grouped = devices.reduce<Record<string, DeviceLog[]>>((acc, item) => {
        (acc[item.mac] ||= []).push(item);
        return acc;
    }, {});

    const result = [];
    for (const mac in grouped) {
        const item = grouped[mac];
        const earliest = Math.min(...item.map(e => new Date(e.timestamp).valueOf()));
        const latest = Math.max(...item.map(e => new Date(e.timestamp).valueOf()));
        result.push({
            Name: item[0].user,
            Device: item[0].description,
            Start: new Date(earliest),
            End: new Date(latest)
        });
    }
    await addLineToResultTable(result);
}
