import { describe, expect, it } from "vitest";
import { getStreamStatus } from "@/utils/stream-status";

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
});
