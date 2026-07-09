import { attendanceApi, devicesApi } from "@/lib/api";
import type {
  AttendanceDecision,
  DeviceConfig,
  DeviceRecord,
  ScanMethod,
} from "@/types/device";
import type { DeviceAdapter } from "./DeviceAdapter";

/**
 * Software-only implementation of `DeviceAdapter`. Talks to the real
 * backend exactly like a physical device would, but every "hardware"
 * event (scan, heartbeat, door) is triggered manually from the UI instead
 * of an actual sensor.
 *
 * The backend has no device-secret-key auth endpoint yet, so this adapter
 * relies on an operator JWT session already being present (see
 * useSessionStore) - the same way apps/web authenticates. serialNumber/
 * secretKey are kept as the device's own local identity for parity with
 * how a real ZKTeco/eSSL unit would be configured.
 */
export class SimulatorAdapter implements DeviceAdapter {
  private deviceId: string | null = null;
  private gymId: string | null = null;

  async register(config: DeviceConfig): Promise<DeviceRecord> {
    if (!config.gymId) throw new Error("A branch must be selected before registering the device");
    if (!config.deviceName) throw new Error("Device name is required");

    const result = await devicesApi.create({
      gymId: config.gymId,
      name: config.deviceName,
      type: config.deviceType,
    });

    this.deviceId = result.device.id;
    this.gymId = result.device.gymId;

    return this.toDeviceRecord(result.device);
  }

  async connect(config: DeviceConfig): Promise<DeviceRecord> {
    if (!config.gymId) throw new Error("A branch must be selected before connecting");

    this.gymId = config.gymId;

    const deviceId = this.deviceId;
    if (!deviceId) {
      throw new Error("No registered device found. Register the device first.");
    }

    const heartbeatResult = await devicesApi.heartbeat(deviceId);
    return this.toDeviceRecord(heartbeatResult.device);
  }

  /** Re-attach to a device that was registered in a previous session (after a page reload). */
  attachToDevice(deviceId: string, gymId: string) {
    this.deviceId = deviceId;
    this.gymId = gymId;
  }

  async disconnect(): Promise<void> {
    if (this.deviceId) {
      try {
        await devicesApi.update(this.deviceId, { status: "OFFLINE" });
      } catch {
        // Best-effort - backend may already be unreachable.
      }
    }
  }

  async heartbeat(): Promise<DeviceRecord> {
    if (!this.deviceId) throw new Error("Device not connected");
    const result = await devicesApi.heartbeat(this.deviceId);
    return this.toDeviceRecord(result.device);
  }

  async scan(method: ScanMethod, memberId: string, memberName?: string): Promise<AttendanceDecision> {
    if (!this.gymId) throw new Error("Device not connected to a branch");
    try {
      const result = await attendanceApi.checkIn({
        memberId,
        memberName,
        gymId: this.gymId,
        method,
        deviceUsed: "Device Simulator",
      });
      return {
        status: result.status === "Granted" ? "Granted" : "Denied",
        reason: result.reason,
        memberName: result.memberName || memberName,
      };
    } catch (error: any) {
      return {
        status: "Denied",
        reason: error?.response?.data?.message || error?.message || "Request failed",
        memberName,
      };
    }
  }

  receiveCommand(): () => void {
    // Wired up to the WebSocket gateway in Phase 5.
    return () => {};
  }

  private toDeviceRecord(device: any): DeviceRecord {
    return {
      id: device.id,
      name: device.name,
      type: device.type,
      status: device.status,
      gymId: device.gymId,
      gymName: device.gymName || device.gym?.name,
      lastHeartbeat: device.lastHeartbeat,
    };
  }
}
