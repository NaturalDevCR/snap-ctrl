import { watch, onUnmounted } from "vue";

// Every modal in this app is always mounted (App.vue renders them all
// unconditionally) with its own internal `v-if="open"` toggling visibility
// — none of them ever handled Escape, so a keyboard-only user had no way
// to back out of a dialog except tabbing to its close button. This is a
// small global stack (shared across every call site, not per-component
// state) so that when dialogs are intentionally stacked — Zone Control
// with Group Settings opened on top of it, see App.vue's
// handleOpenSettingsFromZoneControl — Escape closes only the top one
// instead of both at once.
const stack: Array<() => void> = [];
let listenerAttached = false;

function ensureListener() {
  if (listenerAttached) return;
  listenerAttached = true;
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    const top = stack[stack.length - 1];
    if (top) top();
  });
}

/**
 * Calls `onClose` on Escape while `isOpen()` reports true. `isOpen` is a
 * getter (e.g. `() => props.open`) so it tracks the prop reactively even
 * though these components are mounted once and toggle visibility
 * internally rather than being created/destroyed per open.
 */
export function useEscapeToClose(isOpen: () => boolean, onClose: () => void) {
  if (typeof window === "undefined") return;
  ensureListener();

  watch(
    isOpen,
    (open) => {
      const idx = stack.indexOf(onClose);
      if (open && idx === -1) {
        stack.push(onClose);
      } else if (!open && idx !== -1) {
        stack.splice(idx, 1);
      }
    },
    { immediate: true }
  );

  onUnmounted(() => {
    const idx = stack.indexOf(onClose);
    if (idx !== -1) stack.splice(idx, 1);
  });
}
