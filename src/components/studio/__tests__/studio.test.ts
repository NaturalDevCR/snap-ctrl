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
    expect(host.textContent).toContain("visible-speaker");
    expect(host.textContent).not.toContain("secret-speaker");
    expect(
      host.querySelector('[aria-label="visible-speaker settings"]'),
    ).toBeNull();
    expect(
      host.querySelector('[aria-label="Link visible-speaker to zone volume"]'),
    ).toBeNull();
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

  it("offers individual volumes when multiple speakers are not linked", async () => {
    mount(StudioZoneCard, {
      group: group("Living", { clients: [client("left"), client("right")] }),
    });
    expect(host.querySelector('[aria-label="Living volume"]')).toBeNull();
    const expand = host.querySelector<HTMLButtonElement>(
      '[aria-label="Manage speakers for Living"]',
    )!;
    expect(expand.getAttribute("aria-expanded")).toBe("false");
    expect(host.querySelector(".st-expand-wrap")?.hasAttribute("inert")).toBe(
      true,
    );
    expand.click();
    await nextTick();
    expect(expand.getAttribute("aria-expanded")).toBe("true");
    expect(host.querySelector(".st-expand-wrap")?.hasAttribute("inert")).toBe(
      false,
    );
    expect(host.querySelector('[aria-label="left volume"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="right volume"]')).not.toBeNull();
  });
});
