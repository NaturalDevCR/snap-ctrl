import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick, type App } from "vue";
import { createPinia, setActivePinia } from "pinia";
import SimpleZoneView from "@/components/simple/SimpleZoneView.vue";
import { useSnapcastStore } from "@/stores/snapcast";

type ChangeListener = (event: { matches: boolean }) => void;

let app: App;
let host: HTMLElement;
let breakpointListeners: Set<ChangeListener>;

function crossBreakpoint(matches: boolean) {
  breakpointListeners.forEach((listener) => listener({ matches }));
}

function trigger() {
  return host.querySelector<HTMLElement>('[aria-label="More zone actions"]')!;
}

function menuButton(label: string) {
  return Array.from(host.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(label)
  )!;
}

function isMenuOpen() {
  return trigger().getAttribute("aria-expanded") === "true";
}

async function openMenu() {
  trigger().click();
  await nextTick();
  expect(isMenuOpen()).toBe(true);
}

beforeEach(() => {
  breakpointListeners = new Set();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: (_: string, listener: ChangeListener) => breakpointListeners.add(listener),
    removeEventListener: (_: string, listener: ChangeListener) =>
      breakpointListeners.delete(listener),
  }));

  const pinia = createPinia();
  setActivePinia(pinia);
  host = document.createElement("div");
  document.body.appendChild(host);
  app = createApp(SimpleZoneView);
  app.use(pinia);
  app.mount(host);
});

afterEach(() => {
  app.unmount();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SimpleZoneView overflow menu", () => {
  it("closes when the viewport crosses the sm breakpoint", async () => {
    await openMenu();

    crossBreakpoint(true);
    await nextTick();

    expect(isMenuOpen()).toBe(false);
  });

  it("closes when crossing back below sm", async () => {
    await openMenu();

    crossBreakpoint(false);
    await nextTick();

    expect(isMenuOpen()).toBe(false);
  });

  it("stops watching the breakpoint after unmount", () => {
    expect(breakpointListeners.size).toBe(1);

    app.unmount();
    app = createApp({ render: () => null });
    app.mount(document.createElement("div"));

    expect(breakpointListeners.size).toBe(0);
  });

  it("stays open with the spinner until the refresh finishes, then closes", async () => {
    let finishRefresh = () => {};
    vi.spyOn(useSnapcastStore(), "getServerStatus").mockReturnValue(
      new Promise<void>((resolve) => {
        finishRefresh = resolve;
      })
    );
    await openMenu();

    menuButton("Refresh status").click();
    await nextTick();

    expect(isMenuOpen()).toBe(true);
    expect(menuButton("Refresh status").disabled).toBe(true);
    expect(menuButton("Refresh status").querySelector(".animate-spin")).not.toBeNull();

    finishRefresh();
    await vi.waitFor(() => expect(isMenuOpen()).toBe(false));
  });
});
