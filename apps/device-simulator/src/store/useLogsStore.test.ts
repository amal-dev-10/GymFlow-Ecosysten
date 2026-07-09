import { beforeEach, describe, expect, it } from "vitest";
import { useLogsStore } from "./useLogsStore";

describe("useLogsStore", () => {
  beforeEach(() => {
    useLogsStore.setState({ logs: [] });
  });

  it("adds a log entry with a generated id and timestamp, newest first", () => {
    useLogsStore.getState().addLog({ type: "HEARTBEAT", message: "first" });
    useLogsStore.getState().addLog({ type: "HEARTBEAT", message: "second" });

    const { logs } = useLogsStore.getState();
    expect(logs).toHaveLength(2);
    expect(logs[0].message).toBe("second");
    expect(logs[1].message).toBe("first");
    expect(logs[0].id).toBeTruthy();
    expect(logs[0].timestamp).toBeTruthy();
  });

  it("caps the log list at 500 entries", () => {
    for (let i = 0; i < 510; i++) {
      useLogsStore.getState().addLog({ type: "HEARTBEAT", message: `entry-${i}` });
    }
    expect(useLogsStore.getState().logs).toHaveLength(500);
    expect(useLogsStore.getState().logs[0].message).toBe("entry-509");
  });

  it("clearLogs empties the list", () => {
    useLogsStore.getState().addLog({ type: "HEARTBEAT", message: "x" });
    useLogsStore.getState().clearLogs();
    expect(useLogsStore.getState().logs).toHaveLength(0);
  });
});
