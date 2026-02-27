import { runJob } from "./job";
import { getDevicesFromCoda } from "../coda/getDevicesFromCoda";
import { getLocalDevices, checkDevice } from "../checkDevice";
import PocketBase from "pocketbase";
import { COLLECTIONS } from "../constants";

jest.mock("../coda/getDevicesFromCoda");
jest.mock("../checkDevice");

describe("job.ts", () => {
    let mockPb: jest.Mocked<PocketBase>;
    let mockCollection: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockCollection = {
            create: jest.fn().mockResolvedValue({}),
            getFirstListItem: jest.fn().mockResolvedValue({ id: "mock_device_id" })
        };

        mockPb = {
            collection: jest.fn().mockReturnValue(mockCollection)
        } as unknown as jest.Mocked<PocketBase>;
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
        (checkDevice as jest.Mock).mockImplementation((localDevices, mac) => mac === "MAC1");

        await runJob(mockPb);

        // Verify it fetched coda and local devices
        expect(getDevicesFromCoda).toHaveBeenCalled();
        expect(getLocalDevices).toHaveBeenCalled();

        // Check if logs were created appropriately
        expect(mockPb.collection).toHaveBeenCalledWith(COLLECTIONS.DEVICE_LOGS);
        expect(mockCollection.create).toHaveBeenCalledTimes(1);
        expect(mockCollection.create).toHaveBeenCalledWith(expect.objectContaining({
            device: "mock_device_id"
        }));
    });

    it("should handle coda fetch errors gracefully", async () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
        (getDevicesFromCoda as jest.Mock).mockRejectedValue(new Error("Coda failure"));

        await runJob(mockPb);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Error reading devices.txt:"), "Coda failure");
        expect(getLocalDevices).not.toHaveBeenCalled();
        expect(mockPb.collection).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});
