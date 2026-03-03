import { Controller } from "node-unifi";
import { CONFIG } from "../config";

export interface LocalDevice {
    name: string;
    ip: string;
    mac: string;
}
export async function getLocalDevices(): Promise<LocalDevice[]> {
    console.log("⏳ Fetching devices from local UniFi Controller...");
    const controller = new Controller({
        host: CONFIG.UNIFI_HOST,
        port: CONFIG.UNIFI_PORT,
        sslverify: false
    });

    await controller.login(CONFIG.UNIFI_USERNAME, CONFIG.UNIFI_PASSWORD);
    const clients = await controller.getClientDevices();
    const localDevices = clients.map((x: any) => {
        return {
            name: x.hostname,
            ip: x.ip,
            mac: x.mac
        } as LocalDevice;
    });
    console.log(localDevices);
    return localDevices;
}

export function checkDevice(localDevices: LocalDevice[], mac: string): boolean {
    return localDevices.some(x => x.mac.toLowerCase() == mac.toLowerCase());
}
