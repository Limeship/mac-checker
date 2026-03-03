export interface DbUser {
    id: string;
    name: string;
    robinId?: string;
}

export interface DbDevice {
    id: string;
    user: string; // record<users>
    description: string;
    mac: string;
}

export interface DbDeviceLog {
    id: string;
    device: string; // record<devices>
    timestamp: string | Date;
}

export interface DbRobinLog {
    id: string;
    user: string; // record<users>
    start: string | Date;
    end: string | Date;
}
