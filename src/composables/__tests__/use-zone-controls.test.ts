import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useZoneControls } from "@/composables/useZoneControls";
import { useSnapcastStore } from "@/stores/snapcast";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import type { Client, Group, Stream } from "@/stores/snapcast";

function makeStream(id: string, status: string): Stream {
  return { id, uri: `pipe:///tmp/${id}?name=${id}`, status };
}

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "g1",
    name: "Living Room",
    stream_id: "s1",
    muted: false,
    clients: [],
    ...overrides,
  };
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("useZoneControls tileState", () => {
  it("rests while muted, so the tile never animates next to the MUTED label", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams.push(makeStream("s1", "playing"));
    const zone = useZoneControls(() => makeGroup({ muted: true }));

    expect(zone.tileState.value).toBe("idle");
  });

  it("follows playback while not muted", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams.push(makeStream("s1", "playing"));
    const zone = useZoneControls(() => makeGroup());

    expect(zone.tileState.value).toBe("playing");
  });

  it("keeps reporting an unavailable stream while muted", () => {
    const zone = useZoneControls(() => makeGroup({ stream_id: "missing", muted: true }));

    expect(zone.tileState.value).toBe("unavailable");
  });
});

describe("useZoneControls tileStyle", () => {
  it("ignores mute, so a muted zone's tile still shows what is playing", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams.push(makeStream("s1", "playing"));
    const zone = useZoneControls(() => makeGroup({ muted: true }));

    expect(zone.tileStyle.value).toEqual({ "--accent": "var(--status-playing)" });
  });

  it("uses the attention color for an unavailable stream", () => {
    const zone = useZoneControls(() => makeGroup({ stream_id: "missing", muted: true }));

    expect(zone.tileStyle.value).toEqual({ "--accent": "var(--status-attention)" });
  });
});

describe("useZoneControls accent", () => {
  it("uses the playing status color while a stream plays", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams.push(makeStream("s1", "playing"));
    const zone = useZoneControls(() => makeGroup());

    expect(zone.accent.value).toBe("var(--status-playing)");
    expect(zone.accentStyle.value).toEqual({
      "--accent": "var(--status-playing)",
      "--accent-2": "var(--status-playing-deep)",
      "--accent-soft": "var(--status-playing-soft)",
    });
  });

  it("uses the idle status color while a stream is idle", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams.push(makeStream("s1", "idle"));
    const zone = useZoneControls(() => makeGroup());

    expect(zone.accent.value).toBe("var(--status-idle)");
  });

  it("uses the attention status color when the group is muted, even while playing", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams.push(makeStream("s1", "playing"));
    const zone = useZoneControls(() => makeGroup({ muted: true }));

    expect(zone.accent.value).toBe("var(--status-attention)");
  });

  it("uses the attention status color when the stream is unavailable", () => {
    const zone = useZoneControls(() => makeGroup({ stream_id: "missing" }));

    expect(zone.accent.value).toBe("var(--status-attention)");
  });

  it("no longer attaches a per-source accent to picker sources", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams.push(makeStream("s1", "playing"));
    const zone = useZoneControls(() => makeGroup());

    expect(zone.sources.value[0]).not.toHaveProperty("accent");
  });
});

function makeClient(id: string, percent: number): Client {
  return {
    id,
    config: { name: id, volume: { muted: false, percent } },
    host: { name: id },
  } as Client;
}

describe("useZoneControls zoneVolume", () => {
  const clients = [makeClient("c1", 20), makeClient("c2", 60)];

  it("averages every speaker when none are linked", () => {
    const zone = useZoneControls(() => makeGroup({ clients }));

    expect(zone.zoneVolume.value).toBe(40);
  });

  it("averages only the linked speakers when some are linked", () => {
    useSettingsStore().setGroupVolumeLinks("g1", ["c2"], {});
    const zone = useZoneControls(() => makeGroup({ clients }));

    expect(zone.zoneVolume.value).toBe(60);
  });

  it("excludes speakers the client is not allowed to see", () => {
    const auth = useAuthStore();
    auth.enableAuthentication();
    auth.updatePermissions({ ...auth.permissions, allowedClients: ["c1"] });
    const zone = useZoneControls(() => makeGroup({ clients }));

    expect(zone.zoneVolume.value).toBe(20);
  });

  it("is 0 for a zone with no speakers", () => {
    const zone = useZoneControls(() => makeGroup({ clients: [] }));

    expect(zone.zoneVolume.value).toBe(0);
  });
});
