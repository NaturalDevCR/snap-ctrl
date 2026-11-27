import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { useSnapcastStore, type Client, type Group } from "@/stores/snapcast";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import { useConfirmationStore } from "@/stores/confirmation";
import StudioShell from "../StudioShell.vue";
import StudioZoneCard from "../StudioZoneCard.vue";

let app: App | undefined;
let host: HTMLElement;
let pinia: Pinia;
function client(id: string, connected = true): Client {
  return {
    id,
    name: id,
    connected,
    host: { name: id, ip: "", mac: "", arch: "", os: "" },
    config: {
      instance: 1,
      latency: 0,
      name: id,
      volume: { percent: 40, muted: false },
    },
    snapclient: { name: "Snapclient", version: "1", protocolVersion: 1 },
    lastSeen: { sec: 0, usec: 0 },
  };
}
function group(id: string, overrides: Partial<Group> = {}): Group {
  return {
    id,
    name: id,
    stream_id: "music",
    clients: [client(`${id}-speaker`)],
    muted: false,
    ...overrides,
  };
}
function mount(
  component: typeof StudioShell | typeof StudioZoneCard,
  props: Record<string, unknown> = {},
) {
  app = createApp({ render: () => h(component, props) });
  app.use(pinia);
  app.mount(host);
}
function button(text: string, within: ParentNode = host) {
  const result = Array.from(
    within.querySelectorAll<HTMLButtonElement>("button"),
  ).find((b) => b.textContent?.includes(text));
  if (!result) throw new Error(`Missing button: ${text}`);
  return result;
}
beforeEach(() => {
  localStorage.clear();
  pinia = createPinia();
  setActivePinia(pinia);
  host = document.createElement("div");
  document.body.appendChild(host);
  const snapcast = useSnapcastStore();
  snapcast.isConnected = true;
  snapcast.streams = [
    { id: "music", uri: "pipe:///music?name=Music", status: "playing" },
    { id: "radio", uri: "pipe:///radio?name=Radio", status: "idle" },
  ];
});
afterEach(() => {
  app?.unmount();
  app = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("Studio zones and permissions", () => {
  it("uses the shared visibility, order and browser-zone rules", async () => {
    const snapcast = useSnapcastStore();
    const settings = useSettingsStore();
    snapcast.groups = [
      group("hidden"),
      group("first"),
      group("second"),
      group("empty", { clients: [] }),
      group("browser", { clients: [client("browser-id")] }),
    ];
    snapcast.browserPlayerId = "browser-id";
    settings.hiddenGroups = ["hidden"];
    settings.showEmptyGroups = false;
    settings.customGroupOrder = ["second", "first"];
    mount(StudioShell, { showingPermissionsSetup: false });
    expect(
      Array.from(host.querySelectorAll(".st-zone-card h3")).map(
        (h) => h.textContent,
      ),
    ).toEqual(["second", "first"]);
    const search = host.querySelector<HTMLInputElement>(
      '[aria-label="Search zones"]',
    )!;
    search.value = "first-speaker";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(host.querySelector(".st-zone-card h3")?.textContent).toBe("first");
  });

  it("hides restricted zones, speakers and optional controls", async () => {
    const auth = useAuthStore();
    auth.authEnabled = true;
    auth.permissions = {
      ...auth.permissions,
      allowedGroups: ["allowed"],
      allowedClients: ["visible-speaker"],
      allowedSources: ["radio"],
      canAdjustVolumes: false,
      canSelectStream: false,
      canLinkClients: false,
      showGroupSettings: false,
      showClientSettings: false,
      showGroupFilter: false,
      showCreateGroup: false,
      showBrowserPlayer: false,
    };
    useSnapcastStore().groups = [
      group("secret"),
      group("allowed", {
        clients: [client("visible-speaker"), client("secret-speaker")],
      }),
    ];
    mount(StudioShell, { showingPermissionsSetup: false });
    expect(host.querySelectorAll(".st-zone-card")).toHaveLength(1);
    expect(host.querySelector(".st-zone-card h3")?.textContent).toBe("allowed");
    expect(host.querySelector(".st-player")).toBeNull();
    expect(
      host.querySelector('[aria-label="Manage zone visibility and order"]'),
    ).toBeNull();
    expect(
      host.querySelector<HTMLButtonElement>('[aria-label="Mute allowed"]')
        ?.disabled,
    ).toBe(true);
    expect(host.textContent).not.toContain("Add zone");
    host.querySelector<HTMLButtonElement>('[aria-label="Manage speakers for allowed"]')!.click();
    await nextTick();
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain("visible-speaker");
    expect(dialog.textContent).not.toContain("secret-speaker");
    expect(dialog.querySelector('[aria-label="visible-speaker settings"]')).toBeNull();
    expect(dialog.querySelector('[aria-label="Link visible-speaker to zone volume"]')).toBeNull();
    expect(dialog.querySelector<HTMLInputElement>('[aria-label="visible-speaker volume"]')?.disabled).toBe(true);
  });

  it("selects a source inside its zone and respects allowed sources", async () => {
    const auth = useAuthStore();
    auth.authEnabled = true;
    auth.permissions.allowedSources = ["radio"];
    useSnapcastStore().groups = [group("Kitchen")];
    const assign = vi
      .spyOn(useSnapcastStore(), "setGroupStream")
      .mockResolvedValue(undefined);
    mount(StudioShell, { showingPermissionsSetup: false });
    host
      .querySelector<HTMLButtonElement>(
        '[aria-label="Change source for Kitchen: Music"]',
      )!
      .click();
    await nextTick();
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain("Radio");
    expect(dialog.querySelectorAll(".st-picker-option")).toHaveLength(1);
    button("Radio", dialog).click();
    await vi.waitFor(() =>
      expect(useConfirmationStore().pending).not.toBeNull(),
    );
    useConfirmationStore().settle(true);
    await nextTick();
    await vi.waitFor(() =>
      expect(assign).toHaveBeenCalledExactlyOnceWith("Kitchen", "radio"),
    );
  });

  it("mutes only displayed zones, independently of the text search", async () => {
    useSnapcastStore().groups = [group("one"), group("two"), group("hidden")];
    useSettingsStore().hiddenGroups = ["hidden"];
    const mute = vi
      .spyOn(useSnapcastStore(), "setGroupMute")
      .mockResolvedValue(undefined);
    mount(StudioShell, { showingPermissionsSetup: false });
    button("Mute all").click();
    await vi.waitFor(() =>
      expect(useConfirmationStore().pending).not.toBeNull(),
    );
    useConfirmationStore().settle(true);
    await nextTick();
    await vi.waitFor(() =>
      expect(mute.mock.calls).toEqual([
        ["one", true],
        ["two", true],
      ]),
    );
  });

  it("keeps source and speaker controls together without separate navigation", () => {
    useSnapcastStore().groups = [group("Kitchen")];
    mount(StudioShell, { showingPermissionsSetup: false });
    expect(host.querySelector("nav")).toBeNull();
    expect(host.querySelector(".st-hero")).toBeNull();
    expect(
      host.querySelector('[aria-label="Change source for Kitchen: Music"]'),
    ).not.toBeNull();
    expect(
      host.querySelector('[aria-label="Manage speakers for Kitchen"]'),
    ).not.toBeNull();
  });
});

describe("Studio volume controls", () => {
  it("controls the only speaker directly without requiring a volume link", () => {
    const g = group("Kitchen");
    const volume = vi
      .spyOn(useSnapcastStore(), "setClientVolume")
      .mockResolvedValue(undefined);
    mount(StudioZoneCard, { group: g });
    const slider = host.querySelector<HTMLInputElement>(
      '[aria-label="Kitchen volume"]',
    )!;
    slider.value = "27";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    expect(volume).toHaveBeenCalledExactlyOnceWith(
      "Kitchen-speaker",
      27,
      false,
    );
  });

  it("uses proportional linked volume and the configured curve", () => {
    const g = group("Living", { clients: [client("left"), client("right")] });
    const settings = useSettingsStore();
    settings.setGroupVolumeLinks("Living", ["left", "right"], {
      left: 40,
      right: 40,
    });
    settings.setGroupVolumeControlConfig("Living", "nonlinear", 2);
    const volume = vi
      .spyOn(useSnapcastStore(), "setGroupVolumeProportional")
      .mockResolvedValue(undefined);
    mount(StudioZoneCard, { group: g });
    const slider = host.querySelector<HTMLInputElement>(
      '[aria-label="Living volume"]',
    )!;
    slider.value = "50";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    expect(volume).toHaveBeenCalledExactlyOnceWith(
      "Living",
      25,
      ["left", "right"],
      { left: 40, right: 40 },
    );
  });

  it.each(["speaker button", "individual volumes"])("opens speakers in a dialog from the %s without expanding the card", async (trigger) => {
    mount(StudioZoneCard, {
      group: group("Living", { clients: [client("left"), client("right")] }),
    });
    expect(host.querySelector('[aria-label="Living volume"]')).toBeNull();
    expect(host.querySelector(".st-speaker")).toBeNull();
    expect(host.querySelector(".st-expand-wrap")).toBeNull();
    const open = trigger === "speaker button"
      ? host.querySelector<HTMLButtonElement>('[aria-label="Manage speakers for Living"]')!
      : button("Individual volumes");
    expect(open.getAttribute("aria-haspopup")).toBe("dialog");
    open.focus();
    open.click();
    await nextTick();
    await nextTick();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Speakers for Living"]')!;
    expect(dialog).not.toBeNull();
    expect(host.contains(dialog)).toBe(false);
    expect(dialog.querySelector('[aria-label="left volume"]')).not.toBeNull();
    expect(dialog.querySelector('[aria-label="right volume"]')).not.toBeNull();
    expect(host.querySelector(".st-speaker")).toBeNull();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();
    expect(document.activeElement).toBe(open);
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
  });

  it("keeps speaker volume, linking and settings available in the dialog", async () => {
    const snapcast = useSnapcastStore();
    snapcast.groups = [group("Living", { clients: [client("left"), client("right")] })];
    const volume = vi.spyOn(snapcast, "setClientVolume").mockResolvedValue(undefined);
    const details = vi.fn();
    const configure = vi.fn();
    mount(StudioZoneCard, { group: snapcast.groups[0], onClientDetails: details, onClientSettings: configure });
    host.querySelector<HTMLButtonElement>('[aria-label="Manage speakers for Living"]')!.click();
    await nextTick();
    const dialog = document.querySelector('[role="dialog"]')!;
    const slider = dialog.querySelector<HTMLInputElement>('[aria-label="left volume"]')!;
    slider.value = "27";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    expect(volume).toHaveBeenCalledExactlyOnceWith("left", 27, false);
    dialog.querySelector<HTMLButtonElement>('[aria-label="Link left to zone volume"]')!.click();
    expect(useSettingsStore().groupVolumeLinks.Living?.linkedClientIds).toEqual(["left"]);
    dialog.querySelector<HTMLButtonElement>('[aria-label="left: speaker info"]')!.click();
    expect(details).toHaveBeenCalledWith(snapcast.groups[0]!.clients[0]);
    dialog.querySelector<HTMLButtonElement>('[aria-label="left settings"]')!.click();
    expect(configure).toHaveBeenCalledWith(snapcast.groups[0]!.clients[0]);
  });

  it("returns focus to the speaker button if linking removed the individual-volumes opener", async () => {
    const snapcast = useSnapcastStore();
    snapcast.groups = [group("Living", { clients: [client("left"), client("right")] })];
    mount(StudioZoneCard, { group: snapcast.groups[0] });
    const open = button("Individual volumes");
    open.focus(); open.click();
    await nextTick(); await nextTick();
    const dialog = document.querySelector('[role="dialog"]')!;
    dialog.querySelector<HTMLButtonElement>('[aria-label="Link left to zone volume"]')!.click();
    await nextTick();
    expect(open.isConnected).toBe(false);
    button("Done", dialog).click();
    await nextTick(); await nextTick();
    expect(document.activeElement).toBe(host.querySelector('[aria-label="Manage speakers for Living"]'));
  });

  it("localizes the speaker dialog and closes it from its close button", async () => {
    useSettingsStore().locale = "es";
    mount(StudioZoneCard, { group: group("Living") });
    const open = host.querySelector<HTMLButtonElement>('[aria-label="Gestionar altavoces de Living"]')!;
    open.focus();
    open.click();
    await nextTick();
    const dialog = document.querySelector('[role="dialog"][aria-label="Altavoces de Living"]')!;
    expect(dialog).not.toBeNull();
    dialog.querySelector<HTMLButtonElement>('[aria-label="Cerrar"]')!.click();
    await nextTick();
    expect(document.activeElement).toBe(open);
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
  });
});
