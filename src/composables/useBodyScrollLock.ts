import { watch, onUnmounted } from "vue";

// Shared across every caller so stacked sheets (the zone sheet with the
// source picker opened on top) don't unlock the page when only the top
// one closes.
let locks = 0;

function apply() {
  document.body.style.overflow = locks > 0 ? "hidden" : "";
}

/** Locks page scrolling while `isOpen()` is true. */
export function useBodyScrollLock(isOpen: () => boolean) {
  if (typeof document === "undefined") return;
  let held = false;

  function set(open: boolean) {
    if (open === held) return;
    held = open;
    locks += open ? 1 : -1;
    apply();
  }

  watch(isOpen, set, { immediate: true });
  onUnmounted(() => set(false));
}
