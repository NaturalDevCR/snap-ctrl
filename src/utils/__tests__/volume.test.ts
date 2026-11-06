import { describe, expect, it } from "vitest";
import { rangePosition } from "@/utils/volume";

describe("rangePosition", () => {
  it("is measured from the input's min, not from zero", () => {
    expect(rangePosition(1, 1, 5)).toBe(0);
    expect(rangePosition(3, 1, 5)).toBe(0.5);
    expect(rangePosition(5, 1, 5)).toBe(1);
  });

  it("clamps values outside the range", () => {
    expect(rangePosition(0, 1, 5)).toBe(0);
    expect(rangePosition(9, 1, 5)).toBe(1);
  });
});
