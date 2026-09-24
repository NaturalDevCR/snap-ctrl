import { describe, expect, it } from "vitest";
import { averageClientVolume, linkedZoneClients } from "@/utils/zone-volume";
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

describe("linkedZoneClients", () => {
  it("is empty when nothing is linked (no master volume)", () => {
    expect(linkedZoneClients(group, [])).toEqual([]);
  });

  it("returns only linked clients, in group order", () => {
    expect(linkedZoneClients(group, ["c", "b"]).map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("ignores linked ids that already left the group", () => {
    expect(linkedZoneClients(group, ["gone", "a"]).map((c) => c.id)).toEqual(["a"]);
  });

  it("drops clients this device is not allowed to control", () => {
    const ids = linkedZoneClients(group, ["a", "b"], (id) => id !== "a").map((c) => c.id);
    expect(ids).toEqual(["b"]);
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
