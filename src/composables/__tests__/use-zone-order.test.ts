import { describe, it, expect, beforeEach } from "vitest";
import { ref, computed, nextTick } from "vue";
import { setActivePinia, createPinia } from "pinia";
import { useZoneOrder } from "@/composables/useZoneOrder";
import { useSnapcastStore } from "@/stores/snapcast";
import { useSettingsStore } from "@/stores/settings";

interface TestZone {
  id: string;
  name: string | null;
  clients: Array<{ id: string; config?: { name?: string | null } }>;
}

function makeZone(
  id: string,
  name: string,
  clients?: Array<{ id: string; config?: { name?: string | null } }>
): TestZone {
  return {
    id,
    name,
    clients: clients ?? [],
  };
}

function makeClient(id: string, name?: string) {
  return { id, config: { name: name ?? null } };
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("useZoneOrder", () => {
  it("sorts zones alphabetically by default", () => {
    const settings = useSettingsStore();
    const zones = ref<TestZone[]>([
      makeZone("g3", "Charlie"),
      makeZone("g1", "Alpha"),
      makeZone("g2", "Bravo"),
    ]);

    const { sortedZones } = useZoneOrder(zones, {
      hiddenZoneIds: computed(() => settings.hiddenGroups),
      showEmptyZones: computed(() => settings.showEmptyGroups),
      browserPlayerId: computed(() => null),
    });

    expect(sortedZones.value.map((z) => z.name)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
  });

  it("puts browser player group last in sorted view", () => {
    const settings = useSettingsStore();
    const zones = ref<TestZone[]>([
      makeZone("g1", "Bathroom", [
        makeClient("c1", "SnapCtrl"),
      ]),
      makeZone("g2", "Kitchen"),
    ]);

    const { sortedZones } = useZoneOrder(zones, {
      hiddenZoneIds: computed(() => settings.hiddenGroups),
      showEmptyZones: computed(() => settings.showEmptyGroups),
      browserPlayerId: computed(() => null),
    });

    expect(sortedZones.value.map((z) => z.name)).toEqual([
      "Kitchen",
      "Bathroom",
    ]);
  });

  it("respects custom group order", () => {
    const settings = useSettingsStore();
    settings.setCustomGroupOrder(["g3", "g1", "g2"]);

    const zones = ref<TestZone[]>([
      makeZone("g1", "Alpha"),
      makeZone("g2", "Bravo"),
      makeZone("g3", "Charlie"),
    ]);

    const { sortedZones } = useZoneOrder(zones, {
      hiddenZoneIds: computed(() => settings.hiddenGroups),
      showEmptyZones: computed(() => settings.showEmptyGroups),
      browserPlayerId: computed(() => null),
    });

    expect(sortedZones.value.map((z) => z.id)).toEqual(["g3", "g1", "g2"]);
  });

  it("filters hidden zones", () => {
    const settings = useSettingsStore();
    settings.setHiddenGroups(["g2"]);

    const zones = ref<TestZone[]>([
      makeZone("g1", "Alpha"),
      makeZone("g2", "Bravo"),
      makeZone("g3", "Charlie"),
    ]);

    const { sortedZones } = useZoneOrder(zones, {
      hiddenZoneIds: computed(() => settings.hiddenGroups),
      showEmptyZones: computed(() => settings.showEmptyGroups),
      browserPlayerId: computed(() => null),
    });

    expect(sortedZones.value.map((z) => z.id)).toEqual(["g1", "g3"]);
  });

  it("filters empty zones when showEmptyZones is false", () => {
    const settings = useSettingsStore();
    settings.setShowEmptyGroups(false);

    const zones = ref<TestZone[]>([
      makeZone("g1", "Alpha", [makeClient("c1")]),
      makeZone("g2", "Bravo", []),
      makeZone("g3", "Charlie"),
    ]);

    const { sortedZones } = useZoneOrder(zones, {
      hiddenZoneIds: computed(() => settings.hiddenGroups),
      showEmptyZones: computed(() => settings.showEmptyGroups),
      browserPlayerId: computed(() => null),
    });

    expect(sortedZones.value.map((z) => z.id)).toEqual(["g1"]);
  });

  it("excludes browser player client zone from sorted view when browserPlayerId is set", () => {
    const settings = useSettingsStore();
    const zones = ref<TestZone[]>([
      makeZone("g1", "Kitchen"),
      makeZone("g2", "Browser Player Zone", [
        makeClient("c1", "SnapCtrl"),
      ]),
    ]);

    const { sortedZones } = useZoneOrder(zones, {
      hiddenZoneIds: computed(() => settings.hiddenGroups),
      showEmptyZones: computed(() => settings.showEmptyGroups),
      browserPlayerId: computed(() => "c1"),
    });

    expect(sortedZones.value.map((z) => z.id)).toEqual(["g1"]);
  });

  it("moveInCustomOrder reorders zones", () => {
    const settings = useSettingsStore();
    const zones = ref<TestZone[]>([
      makeZone("g1", "Alpha"),
      makeZone("g2", "Bravo"),
      makeZone("g3", "Charlie"),
    ]);

    const { moveInCustomOrder, sortedZones } = useZoneOrder(zones, {
      hiddenZoneIds: computed(() => settings.hiddenGroups),
      showEmptyZones: computed(() => settings.showEmptyGroups),
      browserPlayerId: computed(() => null),
    });

    moveInCustomOrder("g1", "g3");
    expect(sortedZones.value.map((z) => z.id)).toEqual(["g2", "g1", "g3"]);
  });

  it("toggleVisibility adds and removes from hidden list", () => {
    const settings = useSettingsStore();
    const zones = ref<TestZone[]>([
      makeZone("g1", "Alpha"),
      makeZone("g2", "Bravo"),
    ]);

    const { toggleVisibility, sortedZones } = useZoneOrder(zones, {
      hiddenZoneIds: computed(() => settings.hiddenGroups),
      showEmptyZones: computed(() => settings.showEmptyGroups),
      browserPlayerId: computed(() => null),
    });

    expect(sortedZones.value).toHaveLength(2);

    toggleVisibility("g1");
    expect(sortedZones.value).toHaveLength(1);
    expect(sortedZones.value[0]!.id).toBe("g2");

    toggleVisibility("g1");
    expect(sortedZones.value).toHaveLength(2);
  });

  it("orderedZonesForFilter keeps browser player zone at end regardless of custom order", () => {
    const settings = useSettingsStore();
    const zones = ref<TestZone[]>([
      makeZone("g1", "Alpha"),
      makeZone("g2", "Browser", [
        makeClient("c1", "SnapCtrl"),
      ]),
    ]);

    const { orderedZonesForFilter } = useZoneOrder(zones, {
      hiddenZoneIds: computed(() => settings.hiddenGroups),
      showEmptyZones: computed(() => settings.showEmptyGroups),
      browserPlayerId: computed(() => null),
    });

    expect(orderedZonesForFilter.value.map((z) => z.id)).toEqual([
      "g1",
      "g2",
    ]);
  });

  it("moveInCustomOrder skips browser zones", () => {
    const settings = useSettingsStore();
    const zones = ref<TestZone[]>([
      makeZone("g1", "Alpha"),
      makeZone("g2", "Bravo"),
      makeZone("g3", "Browser", [
        makeClient("c1", "SnapCtrl"),
      ]),
    ]);

    const { moveInCustomOrder, sortedZones } = useZoneOrder(zones, {
      hiddenZoneIds: computed(() => settings.hiddenGroups),
      showEmptyZones: computed(() => settings.showEmptyGroups),
      browserPlayerId: computed(() => null),
    });

    moveInCustomOrder("g1", "g3");
    expect(sortedZones.value.map((z) => z.id)).toEqual(["g2", "g1", "g3"]);
  });
});

describe("useZoneOrder activity priority", () => {
  function setup() {
    const settings = useSettingsStore();
    const snapcast = useSnapcastStore();
    snapcast.streams = [
      { id: "music", uri: "pipe:///music", status: "playing" },
      { id: "radio", uri: "pipe:///radio", status: "idle" },
      { id: "offline", uri: "pipe:///offline", status: "disabled" },
    ];
    const zones = ref([
      { ...makeZone("idle", "Alpha idle"), stream_id: "radio", muted: false },
      { ...makeZone("muted-b", "Bravo muted"), stream_id: "music", muted: true },
      { ...makeZone("playing-b", "Charlie playing"), stream_id: "music", muted: false },
      { ...makeZone("unavailable", "Delta unavailable"), stream_id: "offline", muted: false },
      { ...makeZone("playing-a", "Echo playing"), stream_id: "music", muted: false },
      { ...makeZone("muted-a", "Foxtrot muted"), stream_id: "offline", muted: true },
      { ...makeZone("missing", "Golf missing"), stream_id: "missing", muted: false },
    ]);
    const order = useZoneOrder(zones, {
      hiddenZoneIds: computed(() => settings.hiddenGroups),
      showEmptyZones: computed(() => settings.showEmptyGroups),
      browserPlayerId: computed(() => null),
    });
    return { settings, snapcast, zones, ...order };
  }

  it("groups playing, muted, then inactive zones, preserving manual order within each block", () => {
    const { settings, sortedZones, orderedZonesForFilter } = setup();
    const saved = ["unavailable", "muted-a", "playing-a", "idle", "muted-b", "playing-b", "missing"];
    settings.setCustomGroupOrder([...saved]);
    expect(sortedZones.value.map(z => z.id)).toEqual([
      "playing-a", "playing-b", "muted-a", "muted-b", "unavailable", "idle", "missing",
    ]);
    expect(settings.customGroupOrder).toEqual(saved);
    expect(orderedZonesForFilter.value.map(z => z.id)).toEqual(saved);
  });

  it("keeps alphabetical fallback inside each activity block", () => {
    const { sortedZones } = setup();
    expect(sortedZones.value.map(z => z.id)).toEqual([
      "playing-b", "playing-a", "muted-b", "muted-a", "idle", "unavailable", "missing",
    ]);
  });

  it("reacts to mute and server stream changes without rewriting the saved order", () => {
    const { settings, snapcast, zones, sortedZones } = setup();
    const saved = zones.value.map(z => z.id);
    settings.setCustomGroupOrder([...saved]);
    zones.value.find(z => z.id === "playing-b")!.muted = true;
    expect(sortedZones.value.map(z => z.id).slice(0, 4)).toEqual(["playing-a", "muted-b", "playing-b", "muted-a"]);
    snapcast.streams.find(s => s.id === "radio")!.status = "kPlaying";
    expect(sortedZones.value[0]!.id).toBe("idle");
    snapcast.streams.find(s => s.id === "music")!.status = "kIdle";
    expect(sortedZones.value.map(z => z.id)).toEqual(["idle", "muted-b", "playing-b", "muted-a", "unavailable", "playing-a", "missing"]);
    expect(settings.customGroupOrder).toEqual(saved);
  });

  it("still excludes hidden and empty zones before prioritizing", () => {
    const { settings, zones, sortedZones } = setup();
    zones.value.forEach(z => { z.clients = [makeClient(`${z.id}-speaker`)]; });
    zones.value.find(z => z.id === "playing-b")!.clients = [];
    settings.setShowEmptyGroups(false);
    settings.setHiddenGroups(["playing-a"]);
    expect(sortedZones.value.map(z => z.id)).toEqual(["muted-b", "muted-a", "idle", "unavailable", "missing"]);
  });

  it("keeps temporary browser groups last even when their source is playing", () => {
    const { zones, sortedZones } = setup();
    zones.value.push({ ...makeZone("browser", "Browser", [makeClient("browser-id", "SnapCtrl")]), stream_id: "music", muted: false });
    expect(sortedZones.value.at(-1)!.id).toBe("browser");
  });

  it("seeds manual reordering from the stable management list, not the current activity blocks", () => {
    const { settings, moveInCustomOrder } = setup();
    moveInCustomOrder("playing-a", "muted-b");
    expect(settings.customGroupOrder).toEqual(["idle", "playing-a", "muted-b", "playing-b", "unavailable", "muted-a", "missing"]);
  });
});
