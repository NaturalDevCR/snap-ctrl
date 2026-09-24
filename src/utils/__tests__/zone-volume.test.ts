import { describe, expect, it } from "vitest";
import {
  averageClientVolume,
  resolveZoneVolumeTargets,
  snapshotVolumes,
} from "@/utils/zone-volume";
import type { Group } from "@/stores/snapcast";

function makeGroup(volumes: Array<{ id: string; percent: number }>): Group {
  return {
    id: "g1",
    name: "Test",
    stream_id: "s1",
    muted: false,
    clients: volumes.map(({ id, percent }) => ({
      id,
      name: "",
      host: { name: "h", ip: "", mac: "", arch: "", os: "" },
      connected: true,
      config: {
        instance: 1,
        latency: 0,
        name: "",
        volume: { muted: false, percent },
      },
      snapclient: { name: "Snapclient", protocolVersion: 2, version: "0.27.0" },
      lastSeen: { sec: 0, usec: 0 },
    })),
  };
}

const group = makeGroup([
  { id: "a", percent: 20 },
  { id: "b", percent: 50 },
  { id: "c", percent: 81 },
]);

describe("resolveZoneVolumeTargets", () => {
  it("targets every client when nothing is linked", () => {
    const t = resolveZoneVolumeTargets(group, []);
    expect(t.usesLinks).toBe(false);
    expect(t.clients.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("targets only linked clients when links exist", () => {
    const t = resolveZoneVolumeTargets(group, ["b", "c"]);
    expect(t.usesLinks).toBe(true);
    expect(t.clients.map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("falls back to all clients when every linked client left the group", () => {
    const t = resolveZoneVolumeTargets(group, ["gone"]);
    expect(t.usesLinks).toBe(false);
    expect(t.clients).toHaveLength(3);
  });

  it("drops clients this device is not allowed to control", () => {
    const t = resolveZoneVolumeTargets(group, [], (id) => id !== "a");
    expect(t.clients.map((c) => c.id)).toEqual(["b", "c"]);

    const linked = resolveZoneVolumeTargets(group, ["a", "b"], (id) => id !== "a");
    expect(linked.usesLinks).toBe(true);
    expect(linked.clients.map((c) => c.id)).toEqual(["b"]);
  });
});

describe("averageClientVolume", () => {
  it("returns 0 for no clients", () => {
    expect(averageClientVolume([])).toBe(0);
  });

  it("rounds the average", () => {
    expect(averageClientVolume(group.clients)).toBe(50);
  });
});

describe("snapshotVolumes", () => {
  it("maps client ids to their current volume", () => {
    expect(snapshotVolumes(group.clients)).toEqual({ a: 20, b: 50, c: 81 });
  });
});
