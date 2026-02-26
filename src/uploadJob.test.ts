import { uploadJob } from "./uploadJob";
import PocketBase from "pocketbase";
import { addLineToResultTable } from "./getDevicesFromCoda";

jest.mock("./getDevicesFromCoda");

describe("uploadJob.ts", () => {
    let mockPb: jest.Mocked<PocketBase>;
    let mockCollection: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockCollection = {
            getFullList: jest.fn().mockResolvedValue([])
        };

        mockPb = {
            collection: jest.fn().mockReturnValue(mockCollection)
        } as unknown as jest.Mocked<PocketBase>;
    });

    it("should fetch logs for today, group by mac, and upload to Coda", async () => {
        const mockData = [
            { user: "User1", description: "Phone", mac: "MAC1", timestamp: new Date(2026, 1, 24, 10, 0, 0).toISOString() },
            { user: "User1", description: "Phone", mac: "MAC1", timestamp: new Date(2026, 1, 24, 12, 0, 0).toISOString() },
            { user: "User2", description: "Laptop", mac: "MAC2", timestamp: new Date(2026, 1, 24, 9, 0, 0).toISOString() }
        ];

        mockCollection.getFullList.mockResolvedValue(mockData);

        await uploadJob(mockPb);

        expect(mockPb.collection).toHaveBeenCalledWith("device_logs");
        expect(mockCollection.getFullList).toHaveBeenCalled();

        // Verify the filtered query contains timestamp >= and <= bounds
        const filterArg = mockCollection.getFullList.mock.calls[0][0].filter;
        expect(filterArg).toContain("timestamp >=");
        expect(filterArg).toContain("timestamp <=");

        // Verify grouping logic and upload formatting
        expect(addLineToResultTable).toHaveBeenCalledTimes(1);
        const uploadedData = (addLineToResultTable as jest.Mock).mock.calls[0][0];

        expect(uploadedData).toHaveLength(2);

        const user1Data = uploadedData.find((d: any) => d.Name === "User1");
        expect(user1Data).toBeDefined();
        expect(user1Data.Device).toBe("Phone");
        expect(user1Data.Start.getTime()).toBe(new Date(2026, 1, 24, 10, 0, 0).getTime());
        expect(user1Data.End.getTime()).toBe(new Date(2026, 1, 24, 12, 0, 0).getTime());

        const user2Data = uploadedData.find((d: any) => d.Name === "User2");
        expect(user2Data).toBeDefined();
    });
});
