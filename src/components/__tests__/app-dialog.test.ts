import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref, type App, type Slots } from "vue";
import AppDialog from "@/components/AppDialog.vue";

let app: App;
let host: HTMLElement;
let opener: HTMLButtonElement;
const open = ref(false);
const onClose = vi.fn();

function mountDialog(slots: Partial<Slots> = { default: () => "Body" }) {
  app = createApp({
    render: () => h(AppDialog, { open: open.value, title: "Settings", onClose }, slots),
  });
  app.mount(host);
}

function panel() {
  return document.querySelector<HTMLElement>('[role="dialog"]');
}

beforeEach(() => {
  open.value = false;
  onClose.mockClear();
  host = document.createElement("div");
  opener = document.createElement("button");
  document.body.append(host, opener);
  opener.focus();
});

afterEach(() => {
  vi.restoreAllMocks();
  app.unmount();
  document.body.innerHTML = "";
});

describe("AppDialog", () => {
  it("renders only when open", async () => {
    mountDialog();
    expect(panel()).toBeNull();

    open.value = true;
    await nextTick();
    expect(panel()?.getAttribute("aria-label")).toBe("Settings");
    expect(panel()?.textContent).toContain("Body");

    open.value = false;
    await vi.waitFor(() => expect(panel()).toBeNull());
  });

  describe("closing", () => {
    beforeEach(async () => {
      open.value = true;
      mountDialog();
      await nextTick();
    });

    it("closes from the backdrop", () => {
      document.querySelector<HTMLElement>(".sv-sheet-backdrop")!.click();

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes from the close button", () => {
      document.querySelector<HTMLElement>('[aria-label="Close"]')!.click();

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes on Escape", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("leaves closing to the parent", () => {
      document.querySelector<HTMLElement>('[aria-label="Close"]')!.click();

      expect(panel()).not.toBeNull();
    });
  });

  it("renders the footer only with its slot", async () => {
    open.value = true;
    mountDialog({ default: () => "Body", footer: () => h("button", { id: "save" }, "Save") });
    await nextTick();
    expect(panel()?.querySelector("#save")).not.toBeNull();
    expect(panel()?.querySelector(".border-t")).not.toBeNull();

    app.unmount();
    mountDialog();
    await nextTick();
    expect(panel()?.querySelector(".border-t")).toBeNull();
  });

  it("moves focus in on open and restores it on close", async () => {
    mountDialog();

    open.value = true;
    await nextTick();
    await nextTick();
    expect(document.activeElement).toBe(panel());

    open.value = false;
    await nextTick();
    expect(document.activeElement).toBe(opener);
  });

  it("handles being mounted already open", async () => {
    open.value = true;
    mountDialog();
    await nextTick();
    await nextTick();

    expect(document.activeElement).toBe(panel());
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores focus when unmounted while open", async () => {
    open.value = true;
    mountDialog();
    await nextTick();
    await nextTick();

    app.unmount();
    app = createApp({ render: () => null });
    app.mount(document.createElement("div"));

    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe("");
  });

  it("traps Tab inside the panel", async () => {
    open.value = true;
    mountDialog({ default: () => "Body", footer: () => h("button", { id: "save" }, "Save") });
    await nextTick();
    await nextTick();
    vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
    const save = panel()!.querySelector<HTMLElement>("#save")!;
    save.focus();

    save.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })
    );

    expect(document.activeElement).toBe(panel()!.querySelector('[aria-label="Close"]'));
  });
});
