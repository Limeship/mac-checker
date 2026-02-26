import { migrateDb } from "./importDb";
import PocketBase from "pocketbase";
import fs from "fs";
import readline from "readline";

jest.mock("pocketbase");
jest.mock("fs");
jest.mock("readline");
jest.mock("dotenv", () => ({ config: jest.fn() }));

describe("importDb.ts", () => {
    let mockPbInstance: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPbInstance = {
            admins: { authWithPassword: jest.fn().mockResolvedValue({}) },
            collections: {
                getOne: jest.fn().mockResolvedValue({}),
                create: jest.fn().mockResolvedValue({})
            },
            collection: jest.fn().mockReturnValue({
                create: jest.fn().mockResolvedValue({})
            })
        };

        (PocketBase as unknown as jest.Mock).mockImplementation(() => mockPbInstance);

        // Mock fs exitsSync to return true for the local DB to avoid test hangs/issues with finding the file
        (fs.existsSync as jest.Mock).mockImplementation((path) => {
            return path === "./data/devices.db";
        });

        // Mock stream and readline
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

        // Prevent process.exit from terminating the test runner
        jest.spyOn(process, "exit").mockImplementation((() => { }) as any);
        jest.spyOn(console, "log").mockImplementation(() => { });
        jest.spyOn(console, "error").mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should authenticate, initialize collection if needed, and import data", async () => {
        // mock getOne to fail so we test the creation path
        mockPbInstance.collections.getOne.mockRejectedValue(new Error("Not found"));

        await migrateDb();

        expect(mockPbInstance.admins.authWithPassword).toHaveBeenCalled();
        expect(mockPbInstance.collections.getOne).toHaveBeenCalledWith("device_logs");
        expect(mockPbInstance.collections.create).toHaveBeenCalled();

        expect(fs.createReadStream).toHaveBeenCalledWith("./data/devices.db");

        // 1 record created
        expect(mockPbInstance.collection).toHaveBeenCalledWith("device_logs");
        expect(mockPbInstance.collection().create).toHaveBeenCalledTimes(1);
    });

    it("should process correctly if collection already exists", async () => {
        // Leave getOne resolving normally 
        await migrateDb();

        expect(mockPbInstance.collections.create).not.toHaveBeenCalled();
        expect(mockPbInstance.collection().create).toHaveBeenCalledTimes(1);
    });
});
