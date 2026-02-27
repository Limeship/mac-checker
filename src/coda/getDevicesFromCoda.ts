import { Coda } from "coda-js";
import { CONFIG } from "../config";

export interface Device {
    user: string;
    description: string;
    mac: string;
}

export async function getDevicesFromCoda(): Promise<Device[]> {
    const coda = new Coda(CONFIG.CODA_API_KEY); // insert your token
    const macAdressTable = await coda.getTable(CONFIG.CODA_DOC_ID, CONFIG.CODA_TABLE_ID);
    const macAdressRows = await macAdressTable.listRows({
        useColumnNames: true,
    });
    const devices = macAdressRows.map(x => {
        return {
            "user": x.values["Who"],
            "description": x.values["Device Description"],
            "mac": x.values["MAC Address"]
        } as Device;
    });
    console.log(devices);
    return devices;
}

export async function addLineToResultTable(data: any) {
    const coda = new Coda(CONFIG.CODA_API_KEY); // insert your token
    console.log(data);
    const resultTable = await coda.getTable(CONFIG.CODA_DOC_ID, CONFIG.CODA_UPLOADS_TABLE_ID);
    await resultTable.insertRows(data);
}