import { getDevicesFromCoda, addLineToResultTable } from "./getDevicesFromCoda";
import { Coda } from "coda-js";

jest.mock("coda-js", () => {
    return {
        Coda: jest.fn().mockImplementation(() => {
            return {
                getTable: jest.fn().mockResolvedValue({
                    listRows: jest.fn().mockResolvedValue([
                        {
                            values: {
                                "Who": "User1",
                                "Device Description": "Phone",
                                "MAC Address": "aa:bb:cc"
                            }
                        }
                    ]),
                    insertRows: jest.fn().mockResolvedValue(true)
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
            CodaResultDocumentId: "resDocId",
            CodaResultTableId: "resTableId"
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

            const MockCoda = Coda as jest.Mock;
            expect(MockCoda).toHaveBeenCalledWith("token");
            const codaInstance = MockCoda.mock.instances[0];
            expect(codaInstance.getTable).toHaveBeenCalledWith("docId", "tableId");
        });
    });

    describe("addLineToResultTable", () => {
        it("should insert a row into the result table", async () => {
            const data = [{ Name: "User1", Device: "Phone" }];
            await addLineToResultTable(data);

            const MockCoda = Coda as jest.Mock;
            const codaInstance = MockCoda.mock.instances[0];
            expect(codaInstance.getTable).toHaveBeenCalledWith("resDocId", "resTableId");
            const tableInstance = await codaInstance.getTable();
            expect(tableInstance.insertRows).toHaveBeenCalledWith(data);
        });
    });
});
