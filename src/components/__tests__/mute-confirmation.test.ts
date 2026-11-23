import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref, type App } from "vue";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { useSnapcastStore, type Group, type Client } from "@/stores/snapcast";
import { useSettingsStore } from "@/stores/settings";
import StudioZoneCard from "@/components/studio/StudioZoneCard.vue";
import SimpleZoneCard from "@/components/simple/SimpleZoneCard.vue";
import StudioShell from "@/components/studio/StudioShell.vue";
import SimpleZoneView from "@/components/simple/SimpleZoneView.vue";
import StudioSpeakerRow from "@/components/studio/StudioSpeakerRow.vue";
import SimpleZoneModal from "@/components/simple/SimpleZoneModal.vue";
import BrowserPlayer from "@/components/BrowserPlayer.vue";
import ActionConfirmation from "@/components/ActionConfirmation.vue";
import { useConfirmationStore } from "@/stores/confirmation";
import { useSnapStream } from "@/composables/useSnapStream";

vi.mock("@/composables/useSnapStream", async () => {
  const { ref } = await import("vue");
  const isMuted = ref(false);
  return {
    useSnapStream: () => ({
      connected: ref(true),
      connecting: ref(false),
      error: ref(""),
      codec: ref("PCM"),
      latency: ref(0),
      volume: ref(40),
      isMuted,
      bufferLength: ref(0),
      bufferDuration: ref(0),
      timeDiff: ref(0),
      syncSamples: ref(0),
      clientId: ref("browser"),
      connect: vi.fn(),
      disconnect: vi.fn(),
      toggleMute: vi.fn(() => {
        isMuted.value = !isMuted.value;
      }),
      setVolume: vi.fn(),
      setAdditionalLatency: vi.fn(),
      setInternalMute: vi.fn(),
      cleanupBrowserClient: vi.fn(),
      retryPendingClientCleanups: vi.fn(),
    }),
  };
});
let app: App | undefined;
let host: HTMLElement;
let pinia: Pinia;
const makeClient = (): Client => ({
  id: "speaker",
  name: "Speaker",
  connected: true,
  host: { name: "Speaker", ip: "", mac: "", arch: "", os: "" },
  config: {
    instance: 1,
    latency: 0,
    name: "Speaker",
    volume: { percent: 40, muted: false },
  },
  snapclient: { name: "", version: "", protocolVersion: 1 },
  lastSeen: { sec: 0, usec: 0 },
});
const makeGroup = (id = "Kitchen"): Group => ({
  id,
  name: id,
  stream_id: "music",
  muted: false,
  clients: [makeClient()],
});
function mount(component: unknown, props: Record<string, unknown>) {
  app = createApp({
    render: () => [
      h(ActionConfirmation),
      h(component as typeof StudioShell, props),
    ],
  });
  app.use(pinia);
  app.mount(host);
}
async function click(label: string) {
  let b: HTMLButtonElement | undefined;
  await vi.waitFor(() => {
    b = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.getAttribute("aria-label") === label,
    );
    expect(b, `Missing button: ${label}`).toBeDefined();
  });
  b!.click();
  await nextTick();
}
async function decide(accept: boolean) {
  const dialog = document.querySelector(
    '[role="dialog"][aria-label="Mute audio"], [role="dialog"][aria-label="Silenciar audio"]',
  )!;
  const button = dialog.querySelector<HTMLButtonElement>(
    accept ? ".mute-confirmation-accept" : ".mute-confirmation-cancel",
  )!;
  button.click();
  await nextTick();
  await nextTick();
}
beforeEach(() => {
  localStorage.clear();
  pinia = createPinia();
  setActivePinia(pinia);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  host = document.createElement("div");
  document.body.appendChild(host);
});
afterEach(() => {
  app?.unmount();
  app = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("designed mute confirmations in both interfaces", () => {
  it.each([
    ["Studio", StudioZoneCard],
    ["Classic", SimpleZoneCard],
  ] as const)(
    "confirms zone mute in %s and leaves unmute immediate",
    async (_name, component) => {
      const store = useSnapcastStore();
      store.groups = [makeGroup()];
      const group = store.groups[0]!;
      const mute = vi.spyOn(store, "setGroupMute").mockResolvedValue(undefined);
      const native = vi.spyOn(window, "confirm");
      mount(component, { group });
      await click("Mute Kitchen");
      expect(useConfirmationStore().pending?.params.name).toBe("Kitchen");
      expect(mute).not.toHaveBeenCalled();
      await decide(false);
      expect(mute).not.toHaveBeenCalled();
      await click("Mute Kitchen");
      await decide(true);
      expect(mute).toHaveBeenCalledExactlyOnceWith("Kitchen", true);
      group.muted = true;
      await nextTick();
      await click("Unmute Kitchen");
      expect(useConfirmationStore().pending).toBeNull();
      expect(mute).toHaveBeenLastCalledWith("Kitchen", false);
      expect(native).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["Studio", StudioShell],
    ["Classic", SimpleZoneView],
  ] as const)(
    "asks once for all zones in %s and cancels the entire operation",
    async (_name, component) => {
      const store = useSnapcastStore();
      store.isConnected = true;
      store.groups = [makeGroup("one"), makeGroup("two")];
      const mute = vi.spyOn(store, "setGroupMute").mockResolvedValue(undefined);
      mount(component, { showingPermissionsSetup: false });
      const button = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Mute all"),
      )!;
      button.click();
      await nextTick();
      expect(useConfirmationStore().pending?.params.count).toBe(2);
      expect(mute).not.toHaveBeenCalled();
      await decide(false);
      expect(mute).not.toHaveBeenCalled();
      button.click();
      await nextTick();
      await decide(true);
      expect(mute.mock.calls).toEqual([
        ["one", true],
        ["two", true],
      ]);
      store.groups.forEach((g) => {
        g.muted = true;
      });
      await nextTick();
      button.click();
      await nextTick();
      expect(useConfirmationStore().pending).toBeNull();
      expect(mute).toHaveBeenLastCalledWith("two", false);
    },
  );
  it.each([
    ["Studio", StudioSpeakerRow],
    ["Classic", SimpleZoneModal],
  ] as const)(
    "confirms individual speaker mute in %s using the latest server volume",
    async (_name, component) => {
      const store = useSnapcastStore();
      store.groups = [makeGroup()];
      const group = store.groups[0]!;
      const client = group.clients[0]!;
      const volume = vi
        .spyOn(store, "setClientVolume")
        .mockResolvedValue(undefined);
      mount(component, { client, group, open: true });
      await click("Mute Speaker");
      expect(volume).not.toHaveBeenCalled();
      await decide(false);
      expect(volume).not.toHaveBeenCalled();
      await click("Mute Speaker");
      store.groups = [
        {
          ...makeGroup(),
          clients: [
            {
              ...makeClient(),
              config: {
                ...makeClient().config,
                volume: { muted: false, percent: 73 },
              },
            },
          ],
        },
      ];
      await decide(true);
      expect(volume).toHaveBeenCalledExactlyOnceWith("speaker", 73, true);
    },
  );
  it("confirms local browser mute in Spanish and cancels on Escape", async () => {
    const stream = useSnapStream();
    stream.isMuted.value = false;
    useSettingsStore().locale = "es";
    mount(BrowserPlayer, {});
    await click("Silenciar");
    expect(document.body.textContent).toContain(
      "¿Silenciar la reproducción del navegador en este dispositivo?",
    );
    expect(stream.isMuted.value).toBe(false);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();
    expect(useConfirmationStore().pending).toBeNull();
    expect(stream.isMuted.value).toBe(false);
    await click("Silenciar");
    await decide(true);
    expect(stream.isMuted.value).toBe(true);
    await click("Activar sonido");
    expect(stream.isMuted.value).toBe(false);
    expect(useConfirmationStore().pending).toBeNull();
  });
  it("cancels a pending decision when the app is destroyed", async () => {
    mount(StudioShell, { showingPermissionsSetup: false });
    const decision = useConfirmationStore().ask("mute", "Mute audio");
    app!.unmount();
    app = undefined;
    await expect(decision).resolves.toBe(false);
  });
  it("does not target zones that appeared while all-zone confirmation was open", async () => {
    const store = useSnapcastStore();
    store.isConnected = true;
    store.groups = [makeGroup("one"), makeGroup("two")];
    const mute = vi.spyOn(store, "setGroupMute").mockResolvedValue(undefined);
    mount(StudioShell, { showingPermissionsSetup: false });
    await click("Mute all zones");
    store.groups.push(makeGroup("new"));
    await decide(true);
    expect(mute.mock.calls).toEqual([
      ["one", true],
      ["two", true],
    ]);
  });
});
