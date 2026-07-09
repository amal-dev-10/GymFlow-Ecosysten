import { beforeEach, describe, expect, it, vi } from "vitest";
import { SimulatorAdapter } from "./SimulatorAdapter";
import type { DeviceConfig } from "@/types/device";

vi.mock("@/lib/api", () => ({
  devicesApi: {
    create: vi.fn(),
    heartbeat: vi.fn(),
    update: vi.fn(),
  },
  attendanceApi: {
    checkIn: vi.fn(),
  },
}));

import { attendanceApi, devicesApi } from "@/lib/api";

const baseConfig: DeviceConfig = {
  serverUrl: "",
  deviceName: "Front Desk",
  serialNumber: "SIM-1",
  secretKey: "secret",
  deviceType: "FINGERPRINT",
  gymId: "gym-1",
};

describe("SimulatorAdapter", () => {
  let adapter: SimulatorAdapter;

  beforeEach(() => {
    adapter = new SimulatorAdapter();
    vi.clearAllMocks();
  });

  it("registers a device against the backend and returns the mapped record", async () => {
    (devicesApi.create as any).mockResolvedValue({
      device: { id: "dev-1", name: "Front Desk", type: "FINGERPRINT", status: "OFFLINE", gymId: "gym-1", gymName: "Main" },
    });

    const record = await adapter.register(baseConfig);

    expect(devicesApi.create).toHaveBeenCalledWith({ gymId: "gym-1", name: "Front Desk", type: "FINGERPRINT" });
    expect(record).toEqual({
      id: "dev-1",
      name: "Front Desk",
      type: "FINGERPRINT",
      status: "OFFLINE",
      gymId: "gym-1",
      gymName: "Main",
      lastHeartbeat: undefined,
    });
  });

  it("rejects registration without a selected branch", async () => {
    await expect(adapter.register({ ...baseConfig, gymId: "" })).rejects.toThrow(/branch/i);
  });

  it("connect() requires a device to already be registered", async () => {
    await expect(adapter.connect(baseConfig)).rejects.toThrow(/Register the device first/);
  });

  it("connect() heartbeats the previously registered device", async () => {
    (devicesApi.create as any).mockResolvedValue({
      device: { id: "dev-1", name: "Front Desk", type: "FINGERPRINT", status: "OFFLINE", gymId: "gym-1" },
    });
    (devicesApi.heartbeat as any).mockResolvedValue({
      device: { id: "dev-1", name: "Front Desk", type: "FINGERPRINT", status: "ONLINE", gymId: "gym-1" },
    });

    await adapter.register(baseConfig);
    const record = await adapter.connect(baseConfig);

    expect(devicesApi.heartbeat).toHaveBeenCalledWith("dev-1");
    expect(record.status).toBe("ONLINE");
  });

  it("scan() reports Granted/Denied based on the backend's attendance decision", async () => {
    (devicesApi.create as any).mockResolvedValue({
      device: { id: "dev-1", name: "Front Desk", type: "FINGERPRINT", status: "OFFLINE", gymId: "gym-1" },
    });
    await adapter.register(baseConfig);

    (attendanceApi.checkIn as any).mockResolvedValue({ status: "Denied", reason: "No active membership" });

    const decision = await adapter.scan("Fingerprint", "member-1", "Jane Doe");

    expect(attendanceApi.checkIn).toHaveBeenCalledWith({
      memberId: "member-1",
      memberName: "Jane Doe",
      gymId: "gym-1",
      method: "Fingerprint",
      deviceUsed: "Device Simulator",
    });
    expect(decision).toEqual({ status: "Denied", reason: "No active membership", memberName: "Jane Doe" });
  });

  it("scan() turns a backend error into a Denied decision instead of throwing", async () => {
    (devicesApi.create as any).mockResolvedValue({
      device: { id: "dev-1", name: "Front Desk", type: "FINGERPRINT", status: "OFFLINE", gymId: "gym-1" },
    });
    await adapter.register(baseConfig);

    (attendanceApi.checkIn as any).mockRejectedValue(new Error("Network Error"));

    const decision = await adapter.scan("QR", "member-1", "Jane Doe");
    expect(decision.status).toBe("Denied");
    expect(decision.reason).toBe("Network Error");
  });
});
