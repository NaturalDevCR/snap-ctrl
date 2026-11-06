import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { createPinia, setActivePinia } from "pinia";
import AppDialog from "@/components/AppDialog.vue";
import UnlockPrompt from "@/components/UnlockPrompt.vue";

let app: App;

beforeEach(() => {
  vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
  const pinia = createPinia();
  setActivePinia(pinia);
  const host = document.createElement("div");
  document.body.appendChild(host);
  // App Settings -> Change Permissions: the prompt opens over an open dialog.
  app = createApp({
    render: () => [
      h(AppDialog, { open: true, title: "App Settings", onClose: () => {} }, () =>
        h("button", { id: "behind" }, "Change Permissions")
      ),
      h(UnlockPrompt, { canCancel: true }),
    ],
  });
  app.use(pinia);
  app.mount(host);
});

afterEach(() => {
  vi.restoreAllMocks();
  app.unmount();
  document.body.innerHTML = "";
});

function tab(shiftKey = false) {
  const event = new KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  (document.activeElement ?? document.body).dispatchEvent(event);
  return event;
}

describe("UnlockPrompt over an open AppDialog", () => {
  it("keeps Tab inside the prompt", async () => {
    await nextTick();
    const prompt = document.querySelector<HTMLElement>("input[type='password']")!.closest<HTMLElement>("[tabindex='-1']")!;
    const unlock = Array.from(prompt.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Unlock")
    )!;
    const close = prompt.querySelector<HTMLElement>('button[aria-label="Cancel"]')!;

    unlock.focus();
    tab();
    expect(document.activeElement).toBe(close);

    tab(true);
    expect(document.activeElement).toBe(unlock);
  });

  it("pulls Tab back into the prompt, not the dialog, when focus falls to the body", async () => {
    await nextTick();
    (document.activeElement as HTMLElement | null)?.blur();

    tab();

    expect(document.activeElement?.closest("[role='dialog']")).toBeNull();
    expect(document.activeElement?.closest("[tabindex='-1']")).not.toBeNull();
    expect(document.activeElement?.id).not.toBe("behind");
  });
});
