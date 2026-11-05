<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useEscapeToClose } from "@/composables/useEscapeToClose";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";

export interface PickerSource {
  id: string;
  name: string;
  icon: string;
  state: "playing" | "idle" | "unavailable";
}

/** Show the search box once the list is long enough to need it. */
const SEARCH_THRESHOLD = 8;

const props = defineProps<{
  open: boolean;
  zoneName: string;
  sources: PickerSource[];
  currentId: string;
}>();

const emit = defineEmits<{
  (e: "select", id: string): void;
  (e: "close"): void;
}>();

const query = ref("");
const panelRef = ref<HTMLElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);
let returnFocusTo: HTMLElement | null = null;

const showSearch = computed(() => props.sources.length > SEARCH_THRESHOLD);

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.sources;
  return props.sources.filter((s) => s.name.toLowerCase().includes(q));
});

const stateLabel: Record<PickerSource["state"], string> = {
  playing: "Playing now",
  idle: "Idle",
  unavailable: "Unavailable",
};

function close() {
  emit("close");
}

function choose(id: string) {
  emit("select", id);
  emit("close");
}

useEscapeToClose(() => props.open, close);
useBodyScrollLock(() => props.open);

watch(
  () => props.open,
  async (open) => {
    if (open) {
      returnFocusTo = document.activeElement as HTMLElement | null;
      query.value = "";
      await nextTick();
      if (showSearch.value) {
        searchRef.value?.focus();
      } else {
        panelRef.value
          ?.querySelector<HTMLButtonElement>('[aria-selected="true"], [role="option"]')
          ?.focus();
      }
    } else {
      returnFocusTo?.focus?.();
      returnFocusTo = null;
    }
  }
);

function onListKeydown(event: KeyboardEvent) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  const options = Array.from(
    panelRef.value?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []
  );
  if (options.length === 0) return;
  const index = options.indexOf(document.activeElement as HTMLButtonElement);
  const dir = event.key === "ArrowDown" ? 1 : -1;
  const next = index === -1 ? 0 : (index + dir + options.length) % options.length;
  options[next]?.focus();
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sv-sheet" :duration="{ enter: 380, leave: 240 }">
      <div
        v-if="open"
        class="fixed inset-0 z-[95] flex items-end sm:items-center justify-center sm:p-4"
      >
        <div
          class="sv-sheet-backdrop absolute inset-0 bg-[var(--scrim)] backdrop-blur-sm"
          aria-hidden="true"
          @click="close"
        ></div>

        <div
          ref="panelRef"
          role="dialog"
          aria-modal="true"
          :aria-label="`Choose a source for ${zoneName}`"
          class="sv-sheet-panel relative w-full sm:max-w-md max-h-[82dvh] sm:max-h-[75dvh] flex flex-col bg-[var(--surface-1)] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden"
          @keydown="onListKeydown"
        >
          <!-- Grab handle (mobile affordance) -->
          <div class="sm:hidden pt-2.5 flex justify-center" aria-hidden="true">
            <div class="w-10 h-1.5 rounded-full bg-[var(--handle)]"></div>
          </div>

          <div class="px-5 pt-4 sm:pt-5 pb-3 flex items-start gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                Choose a source
              </p>
              <h3 class="mt-0.5 text-xl font-bold tracking-tight text-[var(--text-primary)] truncate">
                {{ zoneName }}
              </h3>
            </div>
            <button
              type="button"
              class="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-all active:scale-90"
              aria-label="Close"
              @click="close"
            >
              <span class="mdi mdi-close text-xl"></span>
            </button>
          </div>

          <div v-if="showSearch" class="px-5 pb-3">
            <label class="relative block">
              <span class="sr-only">Search sources</span>
              <span
                class="mdi mdi-magnify absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-[var(--text-tertiary)]"
                aria-hidden="true"
              ></span>
              <input
                ref="searchRef"
                v-model="query"
                type="search"
                placeholder="Search sources"
                class="w-full h-11 pl-10 pr-4 rounded-2xl bg-[var(--surface-2)] border border-transparent focus:border-blue-500 focus:bg-[var(--surface-1)] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors"
              />
            </label>
          </div>

          <div
            role="listbox"
            :aria-label="`Sources for ${zoneName}`"
            class="flex-1 overflow-y-auto custom-scrollbar px-3"
            style="padding-bottom: calc(1rem + env(safe-area-inset-bottom))"
          >
            <button
              v-for="(source, i) in filtered"
              :key="source.id"
              type="button"
              role="option"
              :aria-selected="source.id === currentId"
              class="sv-cascade w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-blue-500"
              :class="
                source.id === currentId
                  ? 'bg-[var(--surface-2)]'
                  : 'hover:bg-[var(--surface-2)]'
              "
              :style="{ '--i': i }"
              @click="choose(source.id)"
            >
              <span
                class="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all"
                :class="
                  source.id === currentId
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'
                "
                aria-hidden="true"
              >
                <span class="mdi text-xl" :class="source.icon"></span>
              </span>
              <span class="flex-1 min-w-0">
                <span class="block truncate font-semibold text-[var(--text-primary)]">
                  {{ source.name }}
                </span>
                <span class="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="{
                      'bg-[var(--status-playing)]': source.state === 'playing',
                      'bg-[var(--status-idle)]': source.state === 'idle',
                      'bg-[var(--status-attention)]': source.state === 'unavailable',
                    }"
                  ></span>
                  {{ stateLabel[source.state] }}
                </span>
              </span>
              <span
                v-if="source.id === currentId"
                class="mdi mdi-check-circle text-2xl shrink-0 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              ></span>
            </button>

            <p
              v-if="filtered.length === 0"
              class="py-10 text-center text-sm text-[var(--text-tertiary)]"
            >
              No sources match “{{ query }}”
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
