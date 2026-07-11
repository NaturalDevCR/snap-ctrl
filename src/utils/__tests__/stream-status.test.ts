import { describe, expect, it } from "vitest";
import {
  getStreamStatus,
  getStreamStatusColor,
  getStreamStatusIcon,
  getStreamStatusTooltip,
} from "@/utils/stream-status";

const streams = [
  { id: "radio", status: "playing" },
  { id: "spotify", status: "idle" },
  { id: "broken", status: "weird" },
];

describe("stream-status helpers", () => {
  it("resolves status by stream id (unknown when missing)", () => {
    expect(getStreamStatus(streams, "radio")).toBe("playing");
    expect(getStreamStatus(streams, "nope")).toBe("unknown");
  });

  it("maps playing/idle/other to icon", () => {
    expect(getStreamStatusIcon(streams, "radio")).toBe("mdi-play-circle");
    expect(getStreamStatusIcon(streams, "spotify")).toBe("mdi-pause-circle");
    expect(getStreamStatusIcon(streams, "broken")).toBe("mdi-alert-circle");
  });

  it("maps playing/idle/other to color", () => {
    expect(getStreamStatusColor(streams, "radio")).toBe("text-green-500");
    expect(getStreamStatusColor(streams, "spotify")).toBe("text-orange-500");
    expect(getStreamStatusColor(streams, "broken")).toBe("text-red-500");
  });

  it("supports legacy k-prefixed statuses", () => {
    const legacy = [{ id: "a", status: "kPlaying" }, { id: "b", status: "kIdle" }];
    expect(getStreamStatusIcon(legacy, "a")).toBe("mdi-play-circle");
    expect(getStreamStatusIcon(legacy, "b")).toBe("mdi-pause-circle");
  });

  it("provides a tooltip per status", () => {
    expect(getStreamStatusTooltip(streams, "radio")).toMatch(/Playing/);
    expect(getStreamStatusTooltip(streams, "spotify")).toMatch(/Idle/);
    expect(getStreamStatusTooltip(streams, "broken")).toMatch(/Error/);
  });
});
