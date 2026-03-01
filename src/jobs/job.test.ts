import { runJob } from "./job";
import { getDevicesFromCoda } from "../coda/getDevicesFromCoda";
import { getLocalDevices, checkDevice } from "../checkDevice";
import { Surreal } from "surrealdb";
import { COLLECTIONS } from "../constants";

jest.mock("../coda/getDevicesFromCoda");
jest.mock("../checkDevice");

describe("job.ts", () => {
    let mockDb: jest.Mocked<Surreal>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDb = {
            query: jest.fn()
        } as unknown as jest.Mocked<Surreal>;
    });

    it("should process devices and create logs for those that pass", async () => {
        (getDevicesFromCoda as jest.Mock).mockResolvedValue([
            { user: "User1", description: "Desc1", mac: "MAC1" },
            { user: "User2", description: "Desc2", mac: "MAC2" }
        ]);

        (getLocalDevices as jest.Mock).mockResolvedValue([
            { name: "Dev1", ip: "IP1", mac: "MAC1" }
        ]);

        // checkDevice returns true for MAC1, false for MAC2
        (checkDevice as jest.Mock).mockImplementation((_localDevices, mac) => mac === "MAC1");

        // Mock device lookup
        mockDb.query.mockResolvedValueOnce([[{ id: "mc_devices:mock_id", mac: "MAC1" }]] as any);
        // Mock log creation
        mockDb.query.mockResolvedValueOnce([[]] as any);

        await runJob(mockDb);

        expect(getDevicesFromCoda).toHaveBeenCalled();
        expect(getLocalDevices).toHaveBeenCalled();

        // Verify lookup
        expect(mockDb.query).toHaveBeenCalledWith(
            `SELECT * FROM ${COLLECTIONS.DEVICES} WHERE mac = $mac`,
            { mac: "MAC1" }
        );

        // Verify log creation
        expect(mockDb.query).toHaveBeenCalledWith(
            `CREATE ${COLLECTIONS.DEVICE_LOGS} CONTENT $data`,
            expect.objectContaining({
                data: expect.objectContaining({ device: "mc_devices:mock_id" })
            })
        );
    });

    it("should handle coda fetch errors gracefully", async () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
        (getDevicesFromCoda as jest.Mock).mockRejectedValue(new Error("Coda failure"));

        await runJob(mockDb);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Error reading devices.txt:"), "Coda failure");
        expect(getLocalDevices).not.toHaveBeenCalled();
        expect(mockDb.query).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});
