import { describe, it, expect, beforeEach } from "vitest";
import { ref, computed, nextTick } from "vue";
import { setActivePinia, createPinia } from "pinia";
import { useZoneOrder } from "@/composables/useZoneOrder";
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
