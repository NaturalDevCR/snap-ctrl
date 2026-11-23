import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick, type App } from "vue";
import { createPinia, setActivePinia } from "pinia";
import AppRoot from "@/App.vue";
import { useSettingsStore } from "@/stores/settings";
import { useSnapcastStore } from "@/stores/snapcast";

const lifecycle = vi.hoisted(() => ({ mounted: 0, unmounted: 0 }));
vi.mock("@/components/BrowserPlayer.vue", async () => {
  const { onMounted, onUnmounted } = await import("vue");
  return {
    default: {
      setup() {
        onMounted(() => lifecycle.mounted++);
        // The real player calls disconnect() here, which deletes its client.
        onUnmounted(() => lifecycle.unmounted++);
      },
      template: '<div data-testid="browser-player">Persistent player</div>',
    },
  };
});
let app: App | undefined;
let host: HTMLElement;
beforeEach(() => {
  lifecycle.mounted = 0;
  lifecycle.unmounted = 0;
  localStorage.clear();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  const pinia = createPinia();
  setActivePinia(pinia);
  useSettingsStore().autoConnect = false;
  useSnapcastStore().isConnected = true;
  host = document.createElement("div");
  document.body.appendChild(host);
  app = createApp(AppRoot);
  app.use(pinia);
});
afterEach(() => {
  app?.unmount();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function settle() {
  await nextTick();
  await nextTick();
}

describe("interface changes preserve browser playback", () => {
  it.each(["classic", "studio"] as const)(
    "keeps one player instance when starting in %s and switching repeatedly",
    async (initial) => {
      const settings = useSettingsStore();
      settings.setInterfaceMode(initial);
      app!.mount(host);
      await vi.waitFor(() =>
        expect(
          host.querySelector(
            initial === "studio"
              ? '.st-player-host [data-testid="browser-player"]'
              : '.browser-player [data-testid="browser-player"]',
          ),
        ).not.toBeNull(),
      );
      const player = document.querySelector('[data-testid="browser-player"]');
      for (const mode of ["studio", "classic", "studio", "classic"] as const) {
        settings.setInterfaceMode(mode);
        await settle();
        await vi.waitFor(() =>
          expect(
            host.querySelector(
              mode === "studio"
                ? '.st-player-host [data-testid="browser-player"]'
                : '.browser-player [data-testid="browser-player"]',
            ),
          ).toBe(player),
        );
        expect(
          document.querySelectorAll('[data-testid="browser-player"]'),
        ).toHaveLength(1);
        expect(lifecycle.mounted).toBe(1);
        expect(lifecycle.unmounted).toBe(0);
      }
    },
  );

  it("does not disconnect the player when the Classic header hides it on mobile", async () => {
    app!.mount(host);
    await settle();
    const player = document.querySelector('[data-testid="browser-player"]');
    vi.stubGlobal("innerWidth", 390);
    window.dispatchEvent(new Event("resize"));
    await settle();
    expect(document.querySelector('[data-testid="browser-player"]')).toBe(
      player,
    );
    expect(lifecycle.unmounted).toBe(0);
    useSettingsStore().setInterfaceMode("studio");
    await vi.waitFor(() =>
      expect(
        host.querySelector('.st-player-host [data-testid="browser-player"]'),
      ).toBe(player),
    );
    expect(lifecycle.mounted).toBe(1);
  });
});
