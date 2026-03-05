import { migrateDb } from "./importDb";
import { Surreal } from "surrealdb";
import fs from "fs";
import readline from "readline";
import { COLLECTIONS } from "../constants";

jest.mock("surrealdb", () => {
    return {
        Surreal: jest.fn().mockImplementation(() => ({
            connect: jest.fn().mockResolvedValue(undefined),
            signin: jest.fn().mockResolvedValue({}),
            use: jest.fn().mockResolvedValue({}),
            query: jest.fn().mockResolvedValue([[]]),
            close: jest.fn().mockResolvedValue(undefined)
        }))
    };
});
jest.mock("fs");
jest.mock("readline");
jest.mock("dotenv", () => ({ config: jest.fn() }));
jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }
}));

describe("importDb.ts", () => {
    let mockDbInstance: any;

    beforeEach(() => {
        jest.clearAllMocks();

        const { Surreal: MockSurreal } = require("surrealdb");
        mockDbInstance = new MockSurreal();
        (MockSurreal as jest.Mock).mockReturnValue(mockDbInstance);

        (fs.existsSync as jest.Mock).mockImplementation((path) => path === "./data/devices.db");
        (fs.createReadStream as jest.Mock).mockReturnValue({});

        const asyncIterable = {
            [Symbol.asyncIterator]() {
                let i = 0;
                return {
                    async next() {
                        if (i === 0) {
                            i++;
                            return { value: JSON.stringify({ user: "User", description: "Desc", mac: "MAC1", timestamp: { "$$date": new Date().toISOString() } }), done: false };
                        }
                        return { value: undefined, done: true };
                    }
                };
            }
        };

        (readline.createInterface as jest.Mock).mockReturnValue(asyncIterable);

        jest.spyOn(process, "exit").mockImplementation((() => { }) as any);
        jest.spyOn(console, "log").mockImplementation(() => { });
        jest.spyOn(console, "error").mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should connect, find the device, and import data", async () => {
        // Mock device lookup results
        mockDbInstance.query.mockResolvedValueOnce([[{ id: "mc_devices:mock_id" }]] as any);

        await migrateDb();

        expect(mockDbInstance.connect).toHaveBeenCalled();
        expect(mockDbInstance.signin).toHaveBeenCalled();
        expect(mockDbInstance.use).toHaveBeenCalled();

        expect(fs.createReadStream).toHaveBeenCalledWith("./data/devices.db");

        expect(mockDbInstance.query).toHaveBeenCalledWith(
            expect.stringContaining(`SELECT * FROM ${COLLECTIONS.DEVICES} WHERE mac = $mac`),
            { mac: "MAC1" }
        );

        expect(mockDbInstance.query).toHaveBeenCalledWith(
            expect.stringContaining(`CREATE ${COLLECTIONS.DEVICE_LOGS} CONTENT $data`),
            expect.objectContaining({
                data: expect.objectContaining({ device: "mc_devices:mock_id" })
            })
        );
    });
});
