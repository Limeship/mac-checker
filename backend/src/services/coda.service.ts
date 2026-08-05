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

export class CodaService {
    private coda: Coda;

    constructor() {
        this.coda = new Coda(CONFIG.CODA_API_TOKEN);
    }

    async getDevices(): Promise<Device[]> {
        const table = await this.coda.getTable(CONFIG.CODA_DOCUMENT_ID, CONFIG.CODA_DEVICES_TABLE_ID);
        const rows = await table.listRows({ useColumnNames: true });
        return rows.map(x => ({
            user: x.values["Who"],
            description: x.values["Device Description"],
            mac: x.values["MAC Address"]
        } as Device));
    }

    async getPeople(): Promise<People[]> {
        const table = await this.coda.getTable(CONFIG.CODA_DOCUMENT_ID, CONFIG.CODA_PEOPLE_TABLE_ID);
        const rows = await table.listRows({ useColumnNames: true });
        return rows.map(x => ({
            name: x.values["Name"],
            robinId: x.values["Robin User ID"]
        } as People)).filter(x => !!x.robinId);
    }
}

export const codaService = new CodaService();
