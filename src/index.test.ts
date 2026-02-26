import cron from "node-cron";
import PocketBase from "pocketbase";

jest.mock("node-cron", () => {
    return {
        schedule: jest.fn()
    };
});

jest.mock("pocketbase", () => {
    return jest.fn().mockImplementation(() => {
        return {
            admins: { authWithPassword: jest.fn().mockResolvedValue({}) }
        };
    });
});

jest.mock("./uploadJob", () => ({ uploadJob: jest.fn() }));
jest.mock("./job", () => ({ runJob: jest.fn() }));

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

        // Remove index.ts from require cache so we can re-evaluate it
        const indexModule = require.resolve("./index");
        if (require.cache[indexModule]) {
            delete require.cache[indexModule];
        }
    });

    it("should initialize PocketBase admin auth and schedule jobs", async () => {
        // Load index.ts dynamically
        require("./index");

        // Allow immediate promises to flush
        await new Promise(process.nextTick);

        expect(PocketBase).toHaveBeenCalled();
        const pbInstance = (PocketBase as jest.Mock).mock.results[0].value;
        expect(pbInstance.admins.authWithPassword).toHaveBeenCalled();

        expect(cron.schedule).toHaveBeenCalledTimes(2);
        expect(cron.schedule).toHaveBeenCalledWith("*/15 * * * *", expect.any(Function));
        expect(cron.schedule).toHaveBeenCalledWith("0 18 * * *", expect.any(Function));

        expect(process.stdin.resume).toHaveBeenCalled();
    });
});
