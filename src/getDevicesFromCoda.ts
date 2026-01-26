import { Coda } from "coda-js";


const coda = new Coda(process.env.CodaToken || ""); // insert your token

export interface Device {
    user: string;
    description: string;
    mac: string;
}

export async function getDevicesFromCoda(): Promise<Device[]> {
    const macAdressTable = await coda.getTable(process.env.CodaDeviceDocumentId || "", process.env.CodaDeviceTableId || "");
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
    console.log(data);
    const resultTable = await coda.getTable("pWlziHOneQ", "grid-cIPwzm_oIL");
    await resultTable.insertRows(data);
}