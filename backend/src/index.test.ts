import { database } from "./db/database";
import { Scheduler } from "./jobs/scheduler";
import { initCollections } from "./db/initDb";
import { syncDevices } from "./db/syncDevices";
import { runJob } from "./jobs/job";
import { logger } from "./utils/logger";

jest.mock("./db/database", () => ({
    database: {
        connect: jest.fn().mockResolvedValue(undefined),
        getInstance: jest.fn().mockReturnValue({}),
        withDb: jest.fn().mockImplementation(async (cb) => cb({})),
    }
}));

jest.mock("./jobs/scheduler", () => ({
    Scheduler: jest.fn().mockImplementation(() => ({
        start: jest.fn()
    }))
}));

jest.mock("./db/initDb", () => ({ initCollections: jest.fn().mockResolvedValue(undefined) }));
jest.mock("./db/syncDevices", () => ({ syncDevices: jest.fn().mockResolvedValue(undefined) }));
jest.mock("./jobs/job", () => ({ runJob: jest.fn().mockResolvedValue(undefined) }));
jest.mock("./utils/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }
}));

describe("index.ts", () => {
    let processExitSpy: jest.SpyInstance;
    let originalResume: any;

    beforeEach(() => {
        jest.clearAllMocks();
        processExitSpy = jest.spyOn(process, "exit").mockImplementation((() => { }) as any);
        originalResume = process.stdin.resume;
        process.stdin.resume = jest.fn();
    });

    afterEach(() => {
        processExitSpy.mockRestore();
        process.stdin.resume = originalResume;

        const indexModule = require.resolve("./index");
        if (require.cache[indexModule]) {
            delete require.cache[indexModule];
        }
    });

    it("should initialize database and start scheduler", async () => {
        require("./index");
        await new Promise(process.nextTick);

        expect(database.withDb).toHaveBeenCalled();
        expect(initCollections).toHaveBeenCalled();
        expect(syncDevices).toHaveBeenCalled();
        expect(runJob).toHaveBeenCalled();
        expect(Scheduler).toHaveBeenCalled();
        expect(process.stdin.resume).toHaveBeenCalled();
    });
});
