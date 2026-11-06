import { beforeEach, describe, expect, it } from "vitest";
import { createApp, nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";

/** The same setup as main.ts, so stores hydrate from localStorage. */
function installPinia() {
  const pinia = createPinia();
  pinia.use(piniaPluginPersistedstate);
  createApp({}).use(pinia);
  setActivePinia(pinia);
}

function stored(key: string) {
  return JSON.parse(localStorage.getItem(key) ?? "{}");
}

beforeEach(() => {
  localStorage.clear();
});

describe("upgrading from a release with the Classic layout", () => {
  it("loads settings saved with a stale viewMode", async () => {
    localStorage.setItem(
      "snapcast-settings",
      JSON.stringify({ theme: "light", volumeStep: 10, viewMode: "classic" })
    );
    installPinia();

    const settings = useSettingsStore();

    expect(settings.theme).toBe("light");
    expect(settings.volumeStep).toBe(10);
    expect(settings).not.toHaveProperty("viewMode");

    settings.setVolumeStep(15);
    await nextTick();
    expect(stored("snapcast-settings").volumeStep).toBe(15);
    expect(stored("snapcast-settings")).not.toHaveProperty("viewMode");
  });

  it("loads auth permissions saved with a stale canChangeView", () => {
    localStorage.setItem(
      "snapcast-auth",
      JSON.stringify({
        authEnabled: true,
        passcodeHash: "a".repeat(64),
        isLocked: true,
        permissions: { canAdjustVolumes: false, canChangeView: false, allowedGroups: ["g1"] },
      })
    );
    installPinia();

    const auth = useAuthStore();

    expect(auth.isAuthEnabled).toBe(true);
    expect(auth.isLocked).toBe(true);
    expect(auth.hasFeaturePermission("canAdjustVolumes")).toBe(false);
    expect(auth.isEntityAllowed("group", "g1")).toBe(true);
    expect(auth.isEntityAllowed("group", "g2")).toBe(false);
  });

  it("still allows permissions missing from the saved set", () => {
    localStorage.setItem(
      "snapcast-auth",
      JSON.stringify({
        passcodeHash: "a".repeat(64),
        permissions: { canChangeView: false },
      })
    );
    installPinia();

    expect(useAuthStore().hasFeaturePermission("canSelectStream")).toBe(true);
  });
});
