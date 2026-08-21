import { describe, expect, it } from "vitest";
import { applyZoneFilter } from "@/../src-card/utils/applyZoneFilter";
import type { Group } from "@/types/snapcast-rpc";

function makeClient(id: string, name: string) {
  return {
    id,
    name,
    host: { name: "", ip: "", mac: "", arch: "", os: "" },
    connected: true,
    config: { instance: 1, latency: 0, name, volume: { muted: false, percent: 50 } },
    snapclient: { name: "Snapclient", version: "0.27.0", protocolVersion: 2 },
    lastSeen: { sec: 0, usec: 0 },
  };
}

function makeGroup(id: string, name: string, clientNames: string[]): Group {
  return {
    id,
    name,
    stream_id: "",
    muted: false,
    clients: clientNames.map((n, i) => makeClient(`${id}-c${i}`, n)),
  };
}

describe("applyZoneFilter", () => {
  const groups = [
    makeGroup("g1", "Living Room", ["Living Room Speaker"]),
    makeGroup("g2", "Kitchen", ["Kitchen Speaker", "Kitchen TV"]),
    makeGroup("g3", "Office", ["Office Speaker"]),
  ];

  it("returns all groups unchanged when no filter is given", () => {
    expect(applyZoneFilter(groups, undefined)).toEqual(groups);
    expect(applyZoneFilter(groups, [])).toEqual(groups);
  });

  it("keeps a whole group when its group name matches", () => {
    const result = applyZoneFilter(groups, ["Kitchen"]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("g2");
    expect(result[0]!.clients).toHaveLength(2);
  });

  it("keeps only matching clients when filtering by client name", () => {
    const result = applyZoneFilter(groups, ["Kitchen TV"]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("g2");
    expect(result[0]!.clients).toHaveLength(1);
    expect(result[0]!.clients[0]!.name).toBe("Kitchen TV");
  });

  it("is case-insensitive", () => {
    const result = applyZoneFilter(groups, ["office"]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("g3");
  });

  it("drops groups with no match at all", () => {
    const result = applyZoneFilter(groups, ["Nonexistent Zone"]);
    expect(result).toEqual([]);
  });

  it("combines multiple filter entries across groups", () => {
    const result = applyZoneFilter(groups, ["Living Room", "Kitchen TV"]);
    expect(result.map((g) => g.id)).toEqual(["g1", "g2"]);
    expect(result[1]!.clients).toHaveLength(1);
  });
});
