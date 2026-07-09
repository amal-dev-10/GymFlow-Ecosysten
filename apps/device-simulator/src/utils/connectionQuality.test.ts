import { describe, expect, it } from "vitest";
import { getConnectionQuality } from "./connectionQuality";

describe("getConnectionQuality", () => {
  it("is Excellent when online with no reconnects", () => {
    expect(getConnectionQuality("ONLINE", 0)).toBe("Excellent");
  });

  it("is Fair when online but has reconnected before", () => {
    expect(getConnectionQuality("ONLINE", 2)).toBe("Fair");
  });

  it("is Poor while reconnecting or connecting", () => {
    expect(getConnectionQuality("RECONNECTING", 1)).toBe("Poor");
    expect(getConnectionQuality("CONNECTING", 0)).toBe("Poor");
  });

  it("is Offline when disconnected", () => {
    expect(getConnectionQuality("DISCONNECTED", 0)).toBe("Offline");
    expect(getConnectionQuality("OFFLINE", 0)).toBe("Offline");
  });
});
