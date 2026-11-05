<script setup lang="ts">
import { computed, ref, watch, nextTick, onUnmounted } from "vue";
import { useEscapeToClose } from "@/composables/useEscapeToClose";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    titleIcon?: string;
    size?: "sm" | "md" | "lg";
  }>(),
  { size: "md" }
);

const emit = defineEmits<{ (e: "close"): void }>();

useEscapeToClose(
  () => props.open,
  () => emit("close")
);
useBodyScrollLock(() => props.open);

const panelRef = ref<HTMLElement | null>(null);
let returnFocusTo: HTMLElement | null = null;

watch(
  () => props.open,
  async (open) => {
    if (open) {
      returnFocusTo = document.activeElement as HTMLElement | null;
      await nextTick();
      if (props.open) panelRef.value?.focus();
    } else {
      returnFocusTo?.focus?.();
      returnFocusTo = null;
    }
  },
  { immediate: true }
);

// A parent can unmount the dialog with `v-if` while it is still open, so the
// `open` watcher never sees `false`: restore focus here as well.
onUnmounted(() => {
  returnFocusTo?.focus?.();
  returnFocusTo = null;
});

const maxWidthClass = computed(
  () =>
    ({ sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-lg" })[props.size]
);
</script>

<template>
  <Teleport to="body">
    <Transition name="sv-sheet" :duration="{ enter: 380, leave: 240 }">
      <div
        v-if="open"
        class="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4"
      >
        <div
          class="sv-sheet-backdrop absolute inset-0 bg-[var(--scrim)] backdrop-blur-sm"
          aria-hidden="true"
          @click="emit('close')"
        ></div>

        <div
          ref="panelRef"
          tabindex="-1"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          class="sv-sheet-panel relative w-full max-h-[85dvh] sm:max-h-[80dvh] flex flex-col bg-[var(--surface-1)] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden outline-none"
          :class="maxWidthClass"
        >
          <div class="sm:hidden pt-2.5 flex justify-center shrink-0" aria-hidden="true">
            <div class="w-10 h-1.5 rounded-full bg-[var(--surface-2)]"></div>
          </div>

          <div class="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
            <h3 class="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span v-if="titleIcon" class="mdi" :class="titleIcon" aria-hidden="true"></span>
              {{ title }}
            </h3>
            <button
              type="button"
              aria-label="Close"
              class="w-11 h-11 -mr-2.5 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
              @click="emit('close')"
            >
              <span class="mdi mdi-close text-xl"></span>
            </button>
          </div>

          <div
            class="flex-1 overflow-y-auto custom-scrollbar p-6"
            :style="$slots.footer ? undefined : { paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }"
          >
            <slot />
          </div>

          <div
            v-if="$slots.footer"
            class="px-6 py-4 border-t border-[var(--border)] flex items-center shrink-0"
            style="padding-bottom: calc(1rem + env(safe-area-inset-bottom))"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
