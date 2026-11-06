import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref, type App, type Ref } from "vue";
import { useFocusTrap } from "@/composables/useFocusTrap";

interface Trap {
  panel: HTMLElement;
  open: Ref<boolean>;
  button: (name: string) => HTMLElement;
}

const apps: App[] = [];

/** Mounts a panel with the given markup and a trap on it. */
function mountTrap(html: string, startOpen = true): Trap {
  const open = ref(startOpen);
  const panelRef = ref<HTMLElement | null>(null);
  const host = document.createElement("div");
  document.body.appendChild(host);

  const app = createApp(
    defineComponent({
      setup() {
        useFocusTrap(panelRef, () => open.value);
        return () => h("div", { ref: panelRef, tabindex: -1, innerHTML: html });
      },
    })
  );
  app.mount(host);
  apps.push(app);

  const panel = panelRef.value!;
  return {
    panel,
    open,
    button: (name) => panel.querySelector<HTMLElement>(`[data-name="${name}"]`)!,
  };
}

function pressTab(shiftKey = false) {
  const target = document.activeElement ?? document.body;
  const event = new KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

const THREE_BUTTONS = `
  <button data-name="first"></button>
  <button data-name="middle"></button>
  <button data-name="last"></button>
`;

beforeEach(() => {
  // jsdom has no layout, so report a box for everything not hidden.
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) {
    const rects = this.closest("[data-hidden]") ? [] : [{}];
    return rects as unknown as DOMRectList;
  });
});

afterEach(() => {
  apps.splice(0).forEach((app) => app.unmount());
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("useFocusTrap", () => {
  it("wraps Tab from the last control to the first", () => {
    const { button } = mountTrap(THREE_BUTTONS);
    button("last").focus();

    const event = pressTab();

    expect(document.activeElement).toBe(button("first"));
    expect(event.defaultPrevented).toBe(true);
  });

  it("wraps Shift+Tab from the first control to the last", () => {
    const { button } = mountTrap(THREE_BUTTONS);
    button("first").focus();

    const event = pressTab(true);

    expect(document.activeElement).toBe(button("last"));
    expect(event.defaultPrevented).toBe(true);
  });

  it("wraps Shift+Tab from the panel itself, where dialogs start", () => {
    const { panel, button } = mountTrap(THREE_BUTTONS);
    panel.focus();

    pressTab(true);

    expect(document.activeElement).toBe(button("last"));
  });

  it("leaves Tab alone between controls", () => {
    const { button } = mountTrap(THREE_BUTTONS);
    button("middle").focus();

    expect(pressTab().defaultPrevented).toBe(false);
    expect(pressTab(true).defaultPrevented).toBe(false);
  });

  it("skips disabled, hidden and unreachable controls at the edges", () => {
    const { button } = mountTrap(`
      <button data-name="disabled-first" disabled></button>
      <button data-name="first"></button>
      <button data-name="last"></button>
      <div data-hidden><button data-name="hidden"></button></div>
      <button data-name="unreachable" tabindex="-1"></button>
      <input type="hidden" />
    `);
    button("last").focus();
    pressTab();
    expect(document.activeElement).toBe(button("first"));

    pressTab(true);
    expect(document.activeElement).toBe(button("last"));
  });

  it("keeps focus on the panel when nothing inside can take it", () => {
    const { panel } = mountTrap("<p>Only text</p>");
    panel.focus();

    const event = pressTab();

    expect(document.activeElement).toBe(panel);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does nothing while closed", () => {
    const { button } = mountTrap(THREE_BUTTONS, false);
    button("last").focus();

    expect(pressTab().defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(button("last"));
  });

  it("starts trapping when opened and stops when closed", async () => {
    const { open, button } = mountTrap(THREE_BUTTONS, false);
    button("last").focus();

    open.value = true;
    await nextTick();
    expect(pressTab().defaultPrevented).toBe(true);

    open.value = false;
    await nextTick();
    button("last").focus();
    expect(pressTab().defaultPrevented).toBe(false);
  });

  it("removes its keydown listener on unmount", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    mountTrap(THREE_BUTTONS);
    const added = add.mock.calls.find(([type]) => type === "keydown")![1];

    apps.pop()!.unmount();

    expect(remove).toHaveBeenCalledWith("keydown", added);
  });

  it("skips controls with visibility: hidden at the edges", () => {
    const { button } = mountTrap(`
      <button data-name="first"></button>
      <button data-name="last"></button>
      <button data-name="invisible" style="visibility: hidden"></button>
    `);
    button("last").focus();

    pressTab();
    expect(document.activeElement).toBe(button("first"));

    pressTab(true);
    expect(document.activeElement).toBe(button("last"));
  });

  it("sends Tab back into the panel when focus fell to the body", () => {
    const { button } = mountTrap(THREE_BUTTONS);
    button("middle").focus();
    button("middle").remove();
    (document.activeElement as HTMLElement).blur();
    expect(document.activeElement).toBe(document.body);

    const event = pressTab();

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button("first"));
  });

  it("sends Shift+Tab to the last control when focus fell to the body", () => {
    const { button } = mountTrap(THREE_BUTTONS);
    (document.activeElement as HTMLElement | null)?.blur();

    pressTab(true);

    expect(document.activeElement).toBe(button("last"));
  });

  it("leaves a body Tab alone while closed", () => {
    mountTrap(THREE_BUTTONS, false);

    expect(pressTab().defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });

  it("ignores focus outside the panel", () => {
    mountTrap(THREE_BUTTONS);
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();

    expect(pressTab().defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(outside);
  });

  describe("stacked dialogs", () => {
    it("traps only in the panel holding focus", () => {
      const lower = mountTrap(THREE_BUTTONS);
      const upper = mountTrap(THREE_BUTTONS);

      upper.button("last").focus();
      pressTab();
      expect(document.activeElement).toBe(upper.button("first"));

      upper.button("first").focus();
      pressTab(true);
      expect(document.activeElement).toBe(upper.button("last"));

      expect(lower.panel.contains(document.activeElement)).toBe(false);
    });

    it("recovers body focus only into the topmost trap", () => {
      const lower = mountTrap(THREE_BUTTONS);
      const upper = mountTrap(THREE_BUTTONS);
      (document.activeElement as HTMLElement | null)?.blur();

      pressTab();

      expect(document.activeElement).toBe(upper.button("first"));
      expect(lower.panel.contains(document.activeElement)).toBe(false);
    });

    it("hands body recovery back when the upper dialog closes", async () => {
      const lower = mountTrap(THREE_BUTTONS);
      const upper = mountTrap(THREE_BUTTONS);
      upper.open.value = false;
      await nextTick();
      (document.activeElement as HTMLElement | null)?.blur();

      pressTab();

      expect(document.activeElement).toBe(lower.button("first"));
    });

    it("hands the trap back when the upper dialog closes", async () => {
      const lower = mountTrap(THREE_BUTTONS);
      const upper = mountTrap(THREE_BUTTONS);

      upper.open.value = false;
      await nextTick();
      lower.button("last").focus();
      pressTab();

      expect(document.activeElement).toBe(lower.button("first"));
    });
  });
});
