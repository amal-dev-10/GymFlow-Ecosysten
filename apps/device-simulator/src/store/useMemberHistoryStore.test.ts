import { beforeEach, describe, expect, it } from "vitest";
import { useMemberHistoryStore } from "./useMemberHistoryStore";

const member = (id: string, name = "Test Member") => ({ id, name });

describe("useMemberHistoryStore", () => {
  beforeEach(() => {
    useMemberHistoryStore.setState({ recent: [], favourites: [] });
  });

  it("pushes a member to the front of recent and dedupes re-selections", () => {
    const store = useMemberHistoryStore.getState();
    store.pushRecent(member("1", "Alice"));
    store.pushRecent(member("2", "Bob"));
    store.pushRecent(member("1", "Alice"));

    const { recent } = useMemberHistoryStore.getState();
    expect(recent.map((m) => m.id)).toEqual(["1", "2"]);
  });

  it("caps recent members at 10", () => {
    const store = useMemberHistoryStore.getState();
    for (let i = 0; i < 15; i++) {
      store.pushRecent(member(String(i)));
    }
    expect(useMemberHistoryStore.getState().recent).toHaveLength(10);
  });

  it("toggles favourites on and off", () => {
    const store = useMemberHistoryStore.getState();
    const m = member("1", "Alice");

    store.toggleFavourite(m);
    expect(useMemberHistoryStore.getState().isFavourite("1")).toBe(true);

    store.toggleFavourite(m);
    expect(useMemberHistoryStore.getState().isFavourite("1")).toBe(false);
  });
});
