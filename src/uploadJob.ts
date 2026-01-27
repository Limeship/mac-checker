import Datastore from "nedb-promises";
import type { DeviceLog } from "./job";
import { addLineToResultTable } from "./getDevicesFromCoda";

export async function uploadJob(db: Datastore<DeviceLog>): Promise<void> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const devices = await db.find<DeviceLog>({ timestamp: { $gte: startOfDay, $lte: endOfDay } });

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
