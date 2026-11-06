import { describe, expect, it } from "vitest";
import { getStreamStatus, parsePlayState } from "@/utils/stream-status";

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

describe("parsePlayState", () => {
  it.each([
    ["playing", "playing"],
    ["kplaying", "playing"],
    ["idle", "idle"],
    ["kidle", "idle"],
  ])("reads %s as %s", (status, state) => {
    expect(parsePlayState(status)).toBe(state);
  });

  it("ignores case, as servers report kPlaying and kIdle", () => {
    expect(parsePlayState("kPlaying")).toBe("playing");
    expect(parsePlayState("kIdle")).toBe("idle");
  });

  it("treats anything else as unavailable", () => {
    expect(parsePlayState("unknown")).toBe("unavailable");
    expect(parsePlayState("disabled")).toBe("unavailable");
    expect(parsePlayState("")).toBe("unavailable");
  });
});
