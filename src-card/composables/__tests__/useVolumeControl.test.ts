import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useVolumeControl } from "@/../src-card/composables/useVolumeControl";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useVolumeControl", () => {
  it("debounces rapid setVolume calls into a single request with the last value", async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    const vc = useVolumeControl({ request, debounceMs: 80 });
    const optimistic: number[] = [];

    vc.setVolume("c1", 10, false, (p) => optimistic.push(p), () => {});
    vc.setVolume("c1", 20, false, (p) => optimistic.push(p), () => {});
    vc.setVolume("c1", 30, false, (p) => optimistic.push(p), () => {});

    // Optimistic callback fires immediately on every call.
    expect(optimistic).toEqual([10, 20, 30]);
    expect(request).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(80);

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("Client.SetVolume", {
      id: "c1",
      volume: { percent: 30, muted: false },
    });
  });

  it("reverts optimistic value if the debounced request fails", async () => {
    const request = vi.fn().mockRejectedValue(new Error("boom"));
    const vc = useVolumeControl({ request, debounceMs: 80 });
    let reverted: number | null = null;

    vc.setVolume("c1", 42, false, () => {}, (p) => {
      reverted = p;
    });

    await vi.advanceTimersByTimeAsync(80);
    await Promise.resolve();
    await Promise.resolve();

    expect(reverted).toBe(42); // caller passes the pre-change value as the last arg it wants restored — see Step 3 note
  });

  it("setMute sends immediately without debounce and reverts on failure", async () => {
    const request = vi.fn().mockRejectedValue(new Error("boom"));
    const vc = useVolumeControl({ request });
    const optimistic: boolean[] = [];
    let reverted: boolean | null = null;

    await vc.setMute("c1", true, 50, (m) => optimistic.push(m), (m) => {
      reverted = m;
    });

    expect(request).toHaveBeenCalledWith("Client.SetVolume", {
      id: "c1",
      volume: { percent: 50, muted: true },
    });
    expect(optimistic).toEqual([true]);
    expect(reverted).toBe(false);
  });
});
