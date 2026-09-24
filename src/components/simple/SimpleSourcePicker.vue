<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from "vue";
import { useEscapeToClose } from "@/composables/useEscapeToClose";
import type { SourceAccent } from "@/utils/source-style";

export interface PickerSource {
  id: string;
  name: string;
  icon: string;
  accent: SourceAccent;
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

watch(
  () => props.open,
  async (open) => {
    if (open) {
      returnFocusTo = document.activeElement as HTMLElement | null;
      query.value = "";
      document.body.style.overflow = "hidden";
      await nextTick();
      if (showSearch.value) {
        searchRef.value?.focus();
      } else {
        panelRef.value
          ?.querySelector<HTMLButtonElement>('[aria-selected="true"], [role="option"]')
          ?.focus();
      }
    } else {
      document.body.style.overflow = "";
      returnFocusTo?.focus?.();
      returnFocusTo = null;
    }
  }
);

onUnmounted(() => {
  if (props.open) document.body.style.overflow = "";
});

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
    <Transition name="sheet" :duration="{ enter: 380, leave: 240 }">
      <div
        v-if="open"
        class="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4"
      >
        <div
          class="sheet-backdrop absolute inset-0 bg-black/50 backdrop-blur-sm"
          aria-hidden="true"
          @click="close"
        ></div>

        <div
          ref="panelRef"
          role="dialog"
          aria-modal="true"
          :aria-label="`Choose a source for ${zoneName}`"
          class="sheet-panel relative w-full sm:max-w-md max-h-[82vh] sm:max-h-[75vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          @keydown="onListKeydown"
        >
          <!-- Grab handle (mobile affordance) -->
          <div class="sm:hidden pt-2.5 flex justify-center" aria-hidden="true">
            <div class="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
          </div>

          <div class="px-5 pt-4 sm:pt-5 pb-3 flex items-start gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                Choose a source
              </p>
              <h3 class="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                {{ zoneName }}
              </h3>
            </div>
            <button
              type="button"
              class="w-10 h-10 -mr-2 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90"
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
                class="mdi mdi-magnify absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-slate-400"
                aria-hidden="true"
              ></span>
              <input
                ref="searchRef"
                v-model="query"
                type="search"
                placeholder="Search sources"
                class="w-full h-11 pl-10 pr-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors"
              />
            </label>
          </div>

          <div
            role="listbox"
            :aria-label="`Sources for ${zoneName}`"
            class="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4 sm:pb-3"
          >
            <button
              v-for="(source, i) in filtered"
              :key="source.id"
              type="button"
              role="option"
              :aria-selected="source.id === currentId"
              class="option w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-blue-500"
              :class="
                source.id === currentId
                  ? 'bg-slate-100 dark:bg-slate-800'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
              "
              :style="{
                '--chip': source.accent.main,
                '--chip-2': source.accent.deep,
                '--i': i,
              }"
              @click="choose(source.id)"
            >
              <span
                class="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all"
                :class="source.id === currentId ? 'tile-on text-white' : 'tile-off'"
                aria-hidden="true"
              >
                <span class="mdi text-xl" :class="source.icon"></span>
              </span>
              <span class="flex-1 min-w-0">
                <span class="block truncate font-semibold text-slate-900 dark:text-white">
                  {{ source.name }}
                </span>
                <span class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="{
                      'bg-green-500': source.state === 'playing',
                      'bg-amber-400': source.state === 'idle',
                      'bg-red-500': source.state === 'unavailable',
                    }"
                  ></span>
                  {{ stateLabel[source.state] }}
                </span>
              </span>
              <span
                v-if="source.id === currentId"
                class="mdi mdi-check-circle text-2xl shrink-0 check"
                aria-hidden="true"
              ></span>
            </button>

            <p
              v-if="filtered.length === 0"
              class="py-10 text-center text-sm text-slate-500 dark:text-slate-400"
            >
              No sources match “{{ query }}”
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tile-on {
  background-image: linear-gradient(135deg, var(--chip), var(--chip-2));
  box-shadow: 0 8px 18px -8px var(--chip);
}
.tile-off {
  color: var(--chip);
  background: color-mix(in srgb, var(--chip) 14%, transparent);
}
.check {
  color: var(--chip);
}

/* Items cascade in as the sheet opens. */
.option {
  animation: option-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(min(var(--i), 10) * 25ms + 60ms);
}
@keyframes option-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

/* Backdrop fades; the panel slides up from the bottom edge on phones and
   scales in on larger screens. */
.sheet-enter-active .sheet-backdrop,
.sheet-leave-active .sheet-backdrop {
  transition: opacity 240ms ease;
}
.sheet-enter-from .sheet-backdrop,
.sheet-leave-to .sheet-backdrop {
  opacity: 0;
}
.sheet-enter-active .sheet-panel {
  transition:
    transform 380ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 240ms ease;
}
.sheet-leave-active .sheet-panel {
  transition:
    transform 240ms ease-in,
    opacity 200ms ease-in;
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}
@media (min-width: 640px) {
  .sheet-enter-from .sheet-panel,
  .sheet-leave-to .sheet-panel {
    transform: translateY(12px) scale(0.96);
    opacity: 0;
  }
}
</style>
