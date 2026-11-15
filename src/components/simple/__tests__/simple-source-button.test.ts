import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import SimpleSourceButton from "@/components/simple/SimpleSourceButton.vue";
import { useSnapcastStore } from "@/stores/snapcast";
import type { Group } from "@/stores/snapcast";

let app: App;
let host: HTMLElement;
let pinia: Pinia;

function baseGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "g1",
    name: "Aracari",
    stream_id: "s1",
    clients: [],
    muted: false,
    ...overrides,
  };
}

function mount(group: Group) {
  host = document.createElement("div");
  document.body.appendChild(host);
  app = createApp({ render: () => h(SimpleSourceButton, { group }) });
  app.use(pinia);
  app.mount(host);
}

function iconTile() {
  return host.querySelector<HTMLElement>("span[aria-hidden='true']")!;
}

function sourceButton() {
  return host.querySelector<HTMLButtonElement>("button")!;
}

function confirmDialog() {
  return document.querySelector<HTMLElement>('[role="dialog"][aria-label*="Change"]');
}

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
});

afterEach(() => {
  app?.unmount();
  document.body.innerHTML = "";
});

describe("SimpleSourceButton play-state styling", () => {
  it("applies the playing accent style when the zone's stream is playing", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams = [{ id: "s1", uri: "spotify:x", status: "playing" }];
    mount(baseGroup());

    expect(iconTile().getAttribute("style")).not.toBeNull();
  });

  it("does not force the playing accent style when the zone's stream is idle", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams = [{ id: "s1", uri: "spotify:x", status: "idle" }];
    mount(baseGroup());

    expect(iconTile().getAttribute("style")).toBeNull();
  });
});

describe("SimpleSourceButton change confirmation", () => {
  beforeEach(() => {
    const snapcast = useSnapcastStore();
    snapcast.streams = [
      { id: "s1", uri: "spotify:x", status: "playing" },
      { id: "s2", uri: "radio:y", status: "idle" },
    ];
  });

  it("opens a confirm dialog instead of switching immediately", async () => {
    const snapcast = useSnapcastStore();
    const spy = vi.spyOn(snapcast, "setGroupStream");
    mount(baseGroup());

    sourceButton().click();
    await nextTick();
    document.querySelectorAll<HTMLButtonElement>('[role="option"]')[1].click();
    await nextTick();

    expect(spy).not.toHaveBeenCalled();
    expect(confirmDialog()).not.toBeNull();
  });

  it("switches the source once the user confirms", async () => {
    const snapcast = useSnapcastStore();
    const spy = vi.spyOn(snapcast, "setGroupStream");
    mount(baseGroup());

    sourceButton().click();
    await nextTick();
    document.querySelectorAll<HTMLButtonElement>('[role="option"]')[1].click();
    await nextTick();
    const buttons = confirmDialog()!.querySelectorAll("button");
    (buttons[buttons.length - 1] as HTMLButtonElement).click();
    await nextTick();

    expect(spy).toHaveBeenCalledWith("g1", "s2");
  });

  it("does not switch if the user cancels", async () => {
    const snapcast = useSnapcastStore();
    const spy = vi.spyOn(snapcast, "setGroupStream");
    mount(baseGroup());

    sourceButton().click();
    await nextTick();
    document.querySelectorAll<HTMLButtonElement>('[role="option"]')[1].click();
    await nextTick();
    confirmDialog()!.querySelector<HTMLElement>("[aria-label='Close']")!.click();
    await nextTick();

    expect(spy).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(confirmDialog()).toBeNull());
  });
});
