import { getLocalDevices, checkDevice } from "./checkDevice";
import Unifi from "node-unifi";

let UnifiController: any;

jest.mock("node-unifi", () => {
    return {
        Controller: jest.fn().mockImplementation(() => {
            UnifiController = {
                login: jest.fn().mockResolvedValue(true),
                getClientDevices: jest.fn().mockResolvedValue([
                    { hostname: "Device1", ip: "192.168.1.10", mac: "aa:bb:cc:dd:ee:ff" },
                    { hostname: "Device2", ip: "192.168.1.11", mac: "11:22:33:44:55:66" }
                ])
            };
            return UnifiController;
        })
    };
});

describe("checkDevice.ts", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, RouterIp: "127.0.0.1", RouterUser: "admin", RouterPassword: "password" };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe("getLocalDevices", () => {
        it("should fetch and map devices from Unifi controller", async () => {
            const devices = await getLocalDevices();
            expect(devices).toHaveLength(2);
            expect(devices[0]).toEqual({ name: "Device1", ip: "192.168.1.10", mac: "aa:bb:cc:dd:ee:ff" });

            // Verify mock was called
            const MockController = Unifi.Controller as unknown as jest.Mock;
            expect(MockController).toHaveBeenCalledWith({
                host: "127.0.0.1",
                sslverify: false,
                port: 443
            });
            expect(UnifiController.login).toHaveBeenCalledWith("admin", "password");
            expect(UnifiController.getClientDevices).toHaveBeenCalled();
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
