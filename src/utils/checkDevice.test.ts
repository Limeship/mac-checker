import { getLocalDevices, checkDevice } from "./checkDevice";
import UnifiEvents from "node-unifi";
import { CONFIG } from "../config";

jest.mock("../config", () => ({
    CONFIG: {
        UNIFI_HOST: "127.0.0.1",
        UNIFI_PORT: 8443,
        UNIFI_USERNAME: "admin",
        UNIFI_PASSWORD: "password",
        UNIFI_SITE: "default"
    }
}));

let unifiClientMock: any;

jest.mock("node-unifi", () => {
    return jest.fn().mockImplementation(() => {
        unifiClientMock = {
            login: jest.fn().mockResolvedValue(true),
            getClientDevices: jest.fn().mockResolvedValue([
                { hostname: "Device1", ip: "192.168.1.10", mac: "aa:bb:cc:dd:ee:ff" },
                { hostname: "Device2", ip: "192.168.1.11", mac: "11:22:33:44:55:66" }
            ])
        };
        return unifiClientMock;
    });
});

describe("checkDevice.ts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });



    describe("getLocalDevices", () => {
        it("should fetch and map devices from Unifi controller", async () => {
            const devices = await getLocalDevices();
            expect(devices).toHaveLength(2);
            expect(devices[0]).toEqual({ name: "Device1", ip: "192.168.1.10", mac: "aa:bb:cc:dd:ee:ff" });

            // Verify mock was called
            expect(UnifiEvents).toHaveBeenCalledWith({
                host: "127.0.0.1",
                port: 8443
            });
            expect(unifiClientMock.login).toHaveBeenCalledWith("admin", "password");
            expect(unifiClientMock.getClientDevices).toHaveBeenCalledWith("default");
        });
    });

    describe("checkDevice", () => {
        it("should return true if mac address exists in local devices (case insensitive)", () => {
            const localDevices = [{ name: "Dev1", ip: "ip", mac: "AA:BB:CC:DD:EE:FF" }];
            expect(checkDevice(localDevices, "aa:bb:cc:dd:ee:ff")).toBe(true);
            expect(checkDevice(localDevices, "AA:BB:CC:DD:EE:FF")).toBe(true);
        });

        it("should return false if mac address does not exist", () => {
            const localDevices = [{ name: "Dev1", ip: "ip", mac: "AA:BB:CC:DD:EE:FF" }];
            expect(checkDevice(localDevices, "11:22:33:44:55:66")).toBe(false);
        });
    });
});
