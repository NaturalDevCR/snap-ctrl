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

/**
 * Keeps Tab and Shift+Tab inside `panel` while `isOpen()` is true. Stacked
 * dialogs each hold a trap, so a trap only acts while focus is inside its own
 * panel: the dialog below stays out of the way of the one on top.
 */
export function useFocusTrap(panel: Ref<HTMLElement | null>, isOpen: () => boolean) {
  if (typeof document === "undefined") return;

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== "Tab") return;
    const el = panel.value;
    const active = document.activeElement;
    if (!el || !el.contains(active)) return;

    const focusable = focusableIn(el);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
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
    if (open) document.addEventListener("keydown", onKeydown);
    else document.removeEventListener("keydown", onKeydown);
  }

  watch(isOpen, set, { immediate: true });
  onUnmounted(() => set(false));
}
