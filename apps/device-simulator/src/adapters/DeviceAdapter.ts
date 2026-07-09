import type {
  AttendanceDecision,
  DeviceConfig,
  DeviceRecord,
  ScanMethod,
} from "@/types/device";

/**
 * Contract every hardware integration must satisfy.
 *
 * The UI and stores only ever talk to a `DeviceAdapter`. Swapping
 * `SimulatorAdapter` for `ZKTecoAdapter`, `ESSLAdapter`, a USB/RFID/Face
 * reader, etc. requires implementing this interface only - no changes to
 * components, pages, or stores.
 */
export interface DeviceAdapter {
  /** Registers the device with the backend (creates the Device record). */
  register(config: DeviceConfig): Promise<DeviceRecord>;

  /** Authenticates / connects this device session to the backend. */
  connect(config: DeviceConfig): Promise<DeviceRecord>;

  /** Tears down the connection. */
  disconnect(): Promise<void>;

  /** Sends a heartbeat ping for the currently connected device. */
  heartbeat(): Promise<DeviceRecord>;

  /** Simulates/performs a scan event for a given member and reports it to the backend. */
  scan(method: ScanMethod, memberId: string, memberName?: string): Promise<AttendanceDecision>;

  /** Registers a callback for unsolicited backend commands/events (e.g. via WebSocket). */
  receiveCommand(handler: (event: { type: string; payload: unknown }) => void): () => void;

  /** Re-attaches to a previously registered device (e.g. after a page reload), without re-registering. */
  attachToDevice?(deviceId: string, gymId: string): void;
}
