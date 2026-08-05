export interface User {
  id: string;
  name: string;
  emoji?: string;
}

export interface Device {
  id: string;
  description: string;
  mac: string;
  user: string; // record link to users
  ignored?: boolean;
}

export interface DeviceLog {
  id: string;
  device: string;
  deviceDesc: string;
  userName: string;
  timestamp: string;
}

export interface RobinLog {
  id: string;
  user: string;
  userName: string;
  start: string;
  end: string;
}

// Aggregated for calendar display
export interface PresenceEntry {
  type: 'device' | 'robin';
  userName: string;
  userId: string;
  deviceDesc?: string;
  day: string;        // YYYY-MM-DD
  firstTime: string;  // HH:MM
  lastTime: string;   // HH:MM
}

// For devices page
export interface DeviceWithStatus extends Device {
  userName: string;
  online: boolean;
  lastSeen?: string;
}

export interface PersonWithDevices extends User {
  devices: DeviceWithStatus[];
}
