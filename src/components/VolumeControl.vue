<template>
  <div :class="{ 'w-full': variant === 'inline', 'inline-block': variant === 'modal' }">
    <!-- Inline Variant -->
    <div v-if="variant === 'inline'" class="flex items-center gap-2 w-full">
      <button
        type="button"
        @click="toggleMute"
        class="shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        :class="muted ? 'text-red-500 dark:text-red-400' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'"
      >
        <span class="mdi text-xl" :class="muted ? 'mdi-volume-off' : 'mdi-volume-high'"></span>
      </button>
      
      <!-- Decrease Button -->
      <button
        type="button"
        @click="adjustVolume(-1)"
        class="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
        :disabled="volume <= 0"
      >
        <span class="mdi mdi-minus text-xl"></span>
      </button>

      <div class="flex-1 relative h-6 flex items-center group/slider px-2">
        <input
          type="range"
          :value="volume"
          @input="handleVolumeChange"
          min="0"
          max="100"
          class="relative w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
          :style="{
            backgroundImage: `linear-gradient(to right, ${muted ? '#9ca3af' : '#2563eb'} 0%, ${muted ? '#9ca3af' : '#2563eb'} ${volume}%, transparent ${volume}%, transparent 100%)`
          }"
        />
      </div>

      <!-- Increase Button -->
      <button
        type="button"
        @click="adjustVolume(1)"
        class="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
        :disabled="volume >= 100"
      >
        <span class="mdi mdi-plus text-xl"></span>
      </button>
      
      <div class="text-xs font-mono text-gray-400 w-9 text-right">{{ volume }}%</div>
    </div>

    <!-- Modal Variant (Button trigger) -->
    <template v-else>
      <button
        type="button"
        class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer transition-all hover:bg-gray-200 dark:hover:bg-slate-700 hover:-translate-y-px text-gray-900 dark:text-white font-semibold text-sm min-w-[90px] justify-center"
        @click="openModal"
        :class="{ 'opacity-70 bg-gray-100 dark:bg-slate-800': muted }"
      >
        <span class="text-lg">{{ volumeIcon }}</span>
        <span class="font-semibold">{{ volume }}%</span>
      </button>

      <!-- Modal -->
      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="isOpen"
            class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            @click="closeModal"
          >
            <div
              class="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden transform transition-all"
              @click.stop
            >
              <div
                class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between"
              >
                <h3 class="text-lg font-bold text-gray-900 dark:text-white truncate pr-4">
                  {{ name || "Volume Control" }}
                </h3>
                <button
                  type="button"
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  @click="closeModal"
                >
                  <span class="mdi mdi-close text-xl"></span>
                </button>
              </div>

              <div class="p-8 flex flex-col items-center gap-6">
                <div
                  class="text-5xl transition-transform duration-200"
                  :class="{ 'opacity-50': muted }"
                >
                  {{ volumeIcon }}
                </div>

                <div
                  class="text-3xl font-bold text-gray-900 dark:text-white tabular-nums"
                >
                  {{ volume }}%
                </div>

                <div class="w-full px-2">
                  <div class="relative w-full h-3 rounded-full flex items-center group/slider">
                    <input
                      type="range"
                      class="relative w-full h-3 bg-gray-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                      :value="volume"
                      @input="handleVolumeChange"
                      min="0"
                      max="100"
                      step="1"
                      :disabled="muted"
                      :style="{
                        backgroundImage: `linear-gradient(to right, ${muted ? '#9ca3af' : '#2563eb'} 0%, ${muted ? '#9ca3af' : '#2563eb'} ${volume}%, transparent ${volume}%, transparent 100%)`
                      }"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  class="w-full py-3 rounded-lg border font-semibold text-base transition-all"
                  @click="toggleMute"
                  :class="
                    muted
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700'
                  "
                >
                  {{ muted ? "Unmute" : "Mute" }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";

const props = withDefaults(defineProps<{
  volume: number;
  muted: boolean;
  name?: string;
  variant?: 'modal' | 'inline';
}>(), {
  variant: 'modal'
});

const emit = defineEmits<{
  "update:volume": [value: number];
  "update:muted": [value: boolean];
}>();

const isOpen = ref(false);

const volumeIcon = computed(() => {
  if (props.muted) return "🔇";
  if (props.volume === 0) return "🔈";
  if (props.volume < 50) return "🔉";
  return "🔊";
});

function openModal() {
  isOpen.value = true;
}

function closeModal() {
  isOpen.value = false;
}

function handleVolumeChange(e: Event) {
  const target = e.target as HTMLInputElement;
  emit("update:volume", parseInt(target.value));
}

function toggleMute() {
  emit("update:muted", !props.muted);
}

function adjustVolume(delta: number) {
  let newVol = props.volume + delta;
  if (newVol < 0) newVol = 0;
  if (newVol > 100) newVol = 100;
  emit("update:volume", newVol);
}

// Close on Escape key
function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && isOpen.value) {
    closeModal();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("keydown", handleKeydown);
  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
  });
}
</script>

<style scoped>
/* Scoped styles removed in favor of Tailwind CSS */
</style>
