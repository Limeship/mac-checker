import { CONFIG } from "../config";
import { logger } from "./logger";

export interface LocalDevice {
    name: string;
    ip: string;
    mac: string;
}

/**
 * Fetches devices from the UniFi Controller using native fetch.
 * This resolves compatibility issues between node-unifi (Axios) and the Bun runtime.
 */
export async function getLocalDevices(): Promise<LocalDevice[]> {
    logger.info("⏳ Fetching devices from local UniFi Controller...");
    const baseUrl = `https://${CONFIG.UNIFI_HOST}:${CONFIG.UNIFI_PORT}`;

    try {
        const headers: Record<string, string> = {
            'Accept': 'application/json',
        };

        if (CONFIG.UNIFI_API_KEY) {
            logger.info("🔑 Using API Key for authentication...");
            headers['x-api-key'] = CONFIG.UNIFI_API_KEY;
        }

        // Step 2: Fetch Client Devices
        logger.info("📡 Fetching client devices...");
        const devicesRes = await fetch(`${baseUrl}/proxy/network/api/s/default/stat/sta/`, {
            headers,
            signal: AbortSignal.timeout(10000),
            // @ts-ignore - Bun-specific TLS option
            tls: { rejectUnauthorized: false }
        });

        if (!devicesRes.ok) {
            throw new Error(`Failed to fetch devices: ${devicesRes.status} ${devicesRes.statusText}`);
        }

        const json = (await devicesRes.json()) as any;
        const clients = json.data || [];

        const localDevices = clients.map((x: any) => ({
            name: x.hostname || x.name || "Unknown",
            ip: x.ip,
            mac: x.mac
        } as LocalDevice));

        logger.info(`✅ Success: Found ${localDevices.length} devices.`);
        return localDevices;

    } catch (err: any) {
        logger.error("❌ UniFi Error:", err);
        throw err;
    }
}

export function checkDevice(localDevices: LocalDevice[], mac: string): boolean {
    return localDevices.some(x => x.mac.toLowerCase() == mac.toLowerCase());
}
