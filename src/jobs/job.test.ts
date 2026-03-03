import { runJob } from "./job";
import { codaService } from "../services/coda.service";
import { getLocalDevices, checkDevice } from "../utils/checkDevice";
import { Surreal } from "surrealdb";
import { COLLECTIONS } from "../constants";

jest.mock("../services/coda.service");
jest.mock("../utils/checkDevice");

describe("job.ts", () => {
    let mockDb: jest.Mocked<Surreal>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDb = {
            query: jest.fn()
        } as unknown as jest.Mocked<Surreal>;
    });

    it("should process devices and create logs for those that pass", async () => {
        (codaService.getDevices as jest.Mock).mockResolvedValue([
            { user: "User1", description: "Desc1", mac: "MAC1" },
            { user: "User2", description: "Desc2", mac: "MAC2" }
        ]);

        (getLocalDevices as jest.Mock).mockResolvedValue([
            { name: "Dev1", ip: "IP1", mac: "MAC1" }
        ]);

        (checkDevice as jest.Mock).mockImplementation((_localDevices, mac) => mac === "MAC1");

        mockDb.query.mockResolvedValueOnce([[{ id: "mc_devices:mock_id", mac: "MAC1" }]] as any);
        mockDb.query.mockResolvedValueOnce([[]] as any);

        await runJob(mockDb);

        expect(codaService.getDevices).toHaveBeenCalled();
        expect(getLocalDevices).toHaveBeenCalled();

        expect(mockDb.query).toHaveBeenCalledWith(
            `SELECT id, user, description, mac FROM ${COLLECTIONS.DEVICES} WHERE mac = $mac`,
            { mac: "MAC1" }
        );

        expect(mockDb.query).toHaveBeenCalledWith(
            `CREATE ${COLLECTIONS.DEVICE_LOGS} CONTENT $data`,
            expect.objectContaining({
                data: expect.objectContaining({ device: "mc_devices:mock_id" })
            })
        );
    });

    it("should handle coda fetch errors gracefully", async () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
        (codaService.getDevices as jest.Mock).mockRejectedValue(new Error("Coda failure"));

        await runJob(mockDb);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Error fetching devices from Coda:"), "Coda failure");
        expect(getLocalDevices).not.toHaveBeenCalled();
        expect(mockDb.query).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});
