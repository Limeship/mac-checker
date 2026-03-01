import { getDevicesFromCoda, getPeopleFromCoda } from "./getDevicesFromCoda";
import { Coda } from "coda-js";

jest.mock("coda-js", () => {
    return {
        Coda: jest.fn().mockImplementation(() => {
            return {
                getTable: jest.fn().mockResolvedValue({
                    listRows: jest.fn().mockImplementation((options) => {
                        return Promise.resolve([
                            {
                                values: {
                                    "Who": "User1",
                                    "Device Description": "Phone",
                                    "MAC Address": "aa:bb:cc",
                                    "Name": "User1",
                                    "Robin User ID": "robin123"
                                }
                            }
                        ]);
                    })
                })
            };
        })
    };
});

describe("getDevicesFromCoda.ts", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = {
            ...originalEnv,
            CodaToken: "token",
            CodaDeviceDocumentId: "docId",
            CodaDeviceTableId: "tableId",
            CodaPeopleTableId: "peopleTableId"
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe("getDevicesFromCoda", () => {
        it("should fetch and parse devices from Coda", async () => {
            const devices = await getDevicesFromCoda();
            expect(devices).toHaveLength(1);
            expect(devices[0]).toEqual({
                user: "User1",
                description: "Phone",
                mac: "aa:bb:cc"
            });
        });
    });

    describe("getPeopleFromCoda", () => {
        it("should fetch and parse people from Coda", async () => {
            const people = await getPeopleFromCoda();
            expect(people).toHaveLength(1);
            expect(people[0]).toEqual({
                name: "User1",
                robinId: "robin123"
            });
        });
    });
});
