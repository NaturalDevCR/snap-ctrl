import { describe, it, expect } from "vitest";
import { formatLastSeen } from "@/utils/last-seen";

describe("formatLastSeen", () => {
  it("returns 'Never' for zero", () => {
    expect(formatLastSeen(0)).toBe("Never");
  });

  it("returns 'Never' for falsy values", () => {
    expect(formatLastSeen(0)).toBe("Never");
  });

  it("formats a positive timestamp as a locale string", () => {
    const sec = Math.floor(new Date("2024-01-15T12:00:00Z").getTime() / 1000);
    const result = formatLastSeen(sec);
    expect(result).not.toBe("Never");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
