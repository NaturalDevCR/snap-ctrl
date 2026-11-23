import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useZoneControls } from "@/composables/useZoneControls";
import { useSnapcastStore, type Group } from "@/stores/snapcast";
import { useConfirmationStore } from "@/stores/confirmation";
import { useAuthStore } from "@/stores/auth";

beforeEach(() => {
  setActivePinia(createPinia());
  const store = useSnapcastStore();
  store.streams = [
    { id: "old", uri: "pipe:///old?name=Old", status: "playing" },
    { id: "new", uri: "pipe:///new?name=New", status: "idle" },
  ];
  store.groups = [
    { id: "g", name: "Kitchen", stream_id: "old", muted: false, clients: [] },
  ];
});
function setup() {
  const store = useSnapcastStore();
  const original = store.groups[0]!;
  const zone = useZoneControls(() => original);
  const rpc = vi.spyOn(store, "setGroupStream").mockResolvedValue(undefined);
  return { store, zone, rpc };
}
describe("source changes wait for deliberate confirmation", () => {
  it("cancels without a request and preserves current source", async () => {
    const { store, zone, rpc } = setup();
    const action = zone.selectSource("new");
    expect(rpc).not.toHaveBeenCalled();
    expect(useConfirmationStore().pending?.params).toEqual({
      zone: "Kitchen",
      source: "New",
    });
    useConfirmationStore().settle(false);
    await action;
    expect(rpc).not.toHaveBeenCalled();
    expect(store.groups[0]?.stream_id).toBe("old");
  });
  it("changes only the confirmed target after acceptance", async () => {
    const { zone, rpc } = setup();
    const action = zone.selectSource("new");
    useConfirmationStore().settle(true);
    await action;
    expect(rpc).toHaveBeenCalledExactlyOnceWith("g", "new");
  });
  it.each([
    "removed-zone",
    "removed-source",
    "server-change",
    "permission-change",
  ] as const)("does not change a stale target: %s", async (scenario) => {
    const { store, zone, rpc } = setup();
    const action = zone.selectSource("new");
    if (scenario === "removed-zone") store.groups = [];
    if (scenario === "removed-source")
      store.streams = store.streams.filter((s) => s.id !== "new");
    if (scenario === "server-change") store.host = "another-server:1780";
    if (scenario === "permission-change") {
      const auth = useAuthStore();
      auth.authEnabled = true;
      auth.permissions.canSelectStream = false;
    }
    useConfirmationStore().settle(true);
    await action;
    expect(rpc).not.toHaveBeenCalled();
  });
  it("does not prompt when selecting the current source", async () => {
    const { zone, rpc } = setup();
    await zone.selectSource("old");
    expect(useConfirmationStore().pending).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});
