import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSettingsStore } from "@/stores/settings";

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe("settings store defaults", () => {
  it("defaults volumeStep to 1 for a fresh install", () => {
    expect(useSettingsStore().volumeStep).toBe(1);
  });
});
