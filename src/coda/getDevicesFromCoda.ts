import { Coda } from "coda-js";
import { CONFIG } from "../config";

export interface Device {
    user: string;
    description: string;
    mac: string;
}

export interface People {
    name: string;
    robinId: string;
}

export async function getDevicesFromCoda(): Promise<Device[]> {
    const coda = new Coda(CONFIG.CODA_API_TOKEN);
    const macAdressTable = await coda.getTable(CONFIG.CODA_DOCUMENT_ID, CONFIG.CODA_DEVICES_TABLE_ID);
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

export async function getPeopleFromCoda(): Promise<People[]> {
    const coda = new Coda(CONFIG.CODA_API_TOKEN);
    const macAdressTable = await coda.getTable(CONFIG.CODA_DOCUMENT_ID, CONFIG.CODA_PEOPLE_TABLE_ID);
    const macAdressRows = await macAdressTable.listRows({
        useColumnNames: true,
    });
    const peoples = macAdressRows.map(x => {
        return {
            "name": x.values["Name"],
            "robinId": x.values["Robin User ID"]
        } as People;
    }).filter(x => !!x.robinId);
    console.log(peoples);
    return peoples;
}