import { watch, onUnmounted, type Ref } from "vue";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]",
].join(",");

function focusableIn(panel: HTMLElement): HTMLElement[] {
  // No client rects means display: none, e.g. a `sm:hidden` control.
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.tabIndex >= 0 &&
      el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== "hidden"
  );
}

// Open traps in the order they opened; the last one is on top.
const openTraps: symbol[] = [];

/**
 * Keeps Tab and Shift+Tab inside `panel` while `isOpen()` is true. Stacked
 * dialogs each hold a trap, so a trap only acts while focus is inside its own
 * panel: the dialog below stays out of the way of the one on top. If focus
 * falls to the body (say a focused button removed itself), the next Tab goes
 * back into the topmost open trap's panel.
 */
export function useFocusTrap(panel: Ref<HTMLElement | null>, isOpen: () => boolean) {
  if (typeof document === "undefined") return;

  const id = Symbol("focus-trap");

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== "Tab") return;
    const el = panel.value;
    const active = document.activeElement;
    if (!el) return;

    const focusable = focusableIn(el);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const lostFocus = !active || active === document.body;
    if (lostFocus) {
      if (openTraps[openTraps.length - 1] !== id) return;
      event.preventDefault();
      const target = event.shiftKey ? last : first;
      (target ?? el).focus();
      return;
    }
    if (!el.contains(active)) return;

    if (!first || !last) {
      event.preventDefault();
    } else if (event.shiftKey && (active === first || active === el)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function set(open: boolean) {
    const index = openTraps.indexOf(id);
    if (open) {
      if (index === -1) openTraps.push(id);
      document.addEventListener("keydown", onKeydown);
    } else {
      if (index !== -1) openTraps.splice(index, 1);
      document.removeEventListener("keydown", onKeydown);
    }
  }

  watch(isOpen, set, { immediate: true });
  onUnmounted(() => set(false));
}
