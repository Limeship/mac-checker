import cron from "node-cron";
import { Surreal } from "surrealdb";

jest.mock("node-cron", () => {
    return {
        schedule: jest.fn()
    };
});

jest.mock("surrealdb", () => {
    return {
        Surreal: jest.fn().mockImplementation(() => {
            return {
                connect: jest.fn().mockResolvedValue(undefined),
                signin: jest.fn().mockResolvedValue({}),
                use: jest.fn().mockResolvedValue({}),
                close: jest.fn().mockResolvedValue(undefined)
            };
        })
    };
});

jest.mock("./jobs/uploadJob", () => ({ uploadJob: jest.fn() }));
jest.mock("./jobs/job", () => ({ runJob: jest.fn() }));
jest.mock("./db/initDb", () => ({ initCollections: jest.fn().mockResolvedValue(undefined) }));
jest.mock("./db/syncDevices", () => ({ syncDevicesToPb: jest.fn().mockResolvedValue(undefined) }));

describe("index.ts", () => {
    let processExitSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let originalResume: any;

    beforeEach(() => {
        jest.clearAllMocks();

        processExitSpy = jest.spyOn(process, "exit").mockImplementation((() => { }) as any);
        consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => { });

        originalResume = process.stdin.resume;
        process.stdin.resume = jest.fn();
    });

    afterEach(() => {
        processExitSpy.mockRestore();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        process.stdin.resume = originalResume;

        const indexModule = require.resolve("./index");
        if (require.cache[indexModule]) {
            delete require.cache[indexModule];
        }
    });

    it("should initialize SurrealDB auth and schedule jobs", async () => {
        require("./index");

        await new Promise(process.nextTick);

        expect(Surreal).toHaveBeenCalled();
        const dbInstance = ((Surreal as unknown) as jest.Mock).mock.results[0].value;
        expect(dbInstance.connect).toHaveBeenCalled();
        expect(dbInstance.signin).toHaveBeenCalled();

        expect(cron.schedule).toHaveBeenCalledTimes(2);
        expect(cron.schedule).toHaveBeenCalledWith("*/15 * * * *", expect.any(Function));
        expect(cron.schedule).toHaveBeenCalledWith("0 18 * * *", expect.any(Function));

        expect(process.stdin.resume).toHaveBeenCalled();
    });
});
