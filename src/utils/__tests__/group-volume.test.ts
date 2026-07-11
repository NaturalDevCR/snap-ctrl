import { describe, expect, it } from "vitest";
import { averageGroupVolume } from "@/utils/group-volume";
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

describe("averageGroupVolume", () => {
  it("returns 100 when the group is missing", () => {
    expect(averageGroupVolume(undefined)).toBe(100);
    expect(averageGroupVolume(null)).toBe(100);
  });

  it("returns 0 for a group with no clients", () => {
    expect(averageGroupVolume(makeGroup([]))).toBe(0);
  });

  it("averages all clients when no links are configured", () => {
    const group = makeGroup([
      { id: "a", percent: 40 },
      { id: "b", percent: 60 },
    ]);
    expect(averageGroupVolume(group)).toBe(50);
  });

  it("averages only linked clients when links exist", () => {
    const group = makeGroup([
      { id: "a", percent: 40 },
      { id: "b", percent: 60 },
      { id: "c", percent: 100 },
    ]);
    expect(averageGroupVolume(group, ["a", "b"])).toBe(50);
  });

  it("rounds the result", () => {
    const group = makeGroup([
      { id: "a", percent: 33 },
      { id: "b", percent: 34 },
    ]);
    expect(averageGroupVolume(group)).toBe(34); // 33.5 -> 34
  });
});
