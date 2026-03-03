import { CONFIG } from "../config";

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
    console.log("⏳ Fetching devices from local UniFi Controller...");
    const baseUrl = `https://${CONFIG.UNIFI_HOST}:${CONFIG.UNIFI_PORT}`;

    try {
        const headers: Record<string, string> = {
            'Accept': 'application/json',
        };

        if (CONFIG.UNIFI_API_KEY) {
            console.log("🔑 Using API Key for authentication...");
            headers['x-api-key'] = CONFIG.UNIFI_API_KEY;
        } else {
            // Step 1: Login flow for username/password
            console.log(`🔑 Logging in to UniFi at ${CONFIG.UNIFI_HOST}...`);
            const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: CONFIG.UNIFI_USERNAME,
                    password: CONFIG.UNIFI_PASSWORD,
                    rememberMe: true
                }),
                // @ts-ignore - Bun-specific TLS option
                tls: { rejectUnauthorized: false }
            });

            if (!loginRes.ok) {
                if (loginRes.status === 401) {
                    throw new Error("401 Unauthorized: Please check your RouterUser and RouterPassword in .env");
                }
                throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
            }

            const setCookie = loginRes.headers.get("set-cookie");
            const xCsrfToken = loginRes.headers.get("x-csrf-token");

            if (!setCookie) {
                throw new Error("Failed to retrieve session cookie from UniFi Controller.");
            }

            headers['Cookie'] = setCookie;
            if (xCsrfToken) headers['X-CSRF-Token'] = xCsrfToken;
        }

        // Step 2: Fetch Client Devices
        console.log("📡 Fetching client devices...");
        // API Keys usually use the same proxy endpoints or the new /api/v1/ endpoints.
        // We'll stick with the proven proxy endpoint first.
        const devicesRes = await fetch(`${baseUrl}/proxy/network/api/s/default/stat/sta/`, {
            headers,
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

        console.log(`✅ Success: Found ${localDevices.length} devices.`);
        return localDevices;

    } catch (err: any) {
        console.error(`❌ UniFi Error: ${err.message}`);
        throw err;
    }
}

export function checkDevice(localDevices: LocalDevice[], mac: string): boolean {
    return localDevices.some(x => x.mac.toLowerCase() == mac.toLowerCase());
}
