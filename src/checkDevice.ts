import Unifi from "node-unifi";

export interface LocalDevice {
    name: string;
    ip: string;
    mac: string;
}
export async function getLocalDevices(): Promise<LocalDevice[]> {
    const controller = new Unifi.Controller({
        host: process.env.RouterIp || "",
        sslverify: false,
        port: 443,
    });

    await controller.login(process.env.RouterUser || "", process.env.RouterPassword || "");
    const clients = await controller.getClientDevices();
    const localDevices = clients.map(x => {
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
