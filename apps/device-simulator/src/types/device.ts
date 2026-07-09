export type DeviceType =
  | "QR_SCANNER"
  | "FINGERPRINT"
  | "RFID"
  | "FACE_CAMERA"
  | "TURNSTILE"
  | "BARCODE";

export type DeviceStatus = "OFFLINE" | "ONLINE" | "ERROR";

export type ConnectionStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "ONLINE"
  | "RECONNECTING"
  | "OFFLINE";

export type DoorState = "LOCKED" | "OPENING" | "OPEN" | "CLOSING";

export type ScanMethod = "Fingerprint" | "QR" | "RFID" | "Face" | "Manual";

export interface DeviceConfig {
  serverUrl: string;
  deviceName: string;
  serialNumber: string;
  secretKey: string;
  deviceType: DeviceType;
  gymId: string;
}

export interface DeviceRecord {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  gymId: string;
  gymName?: string;
  lastHeartbeat?: string | null;
}

export interface AttendanceDecision {
  status: "Granted" | "Denied";
  reason?: string;
  memberName?: string;
}
