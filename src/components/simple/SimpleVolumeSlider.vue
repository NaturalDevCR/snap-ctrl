<script setup lang="ts">
import { computed } from "vue";
import { sliderToVolume, volumeToSlider } from "@/utils/volume";

const props = withDefaults(
  defineProps<{
    volume: number;
    muted?: boolean;
    /** Accessible name, e.g. "Living Room volume". */
    label: string;
    exponent?: number;
    /** Step size in slider-space (0-100) for the -/+ buttons. */
    step?: number;
    disabled?: boolean;
    size?: "lg" | "md";
    /** CSS color for the filled part of the track. */
    accent?: string;
  }>(),
  {
    muted: false,
    exponent: 1,
    step: 5,
    disabled: false,
    size: "lg",
    accent: "#2563eb",
  }
);

const emit = defineEmits<{
  /** Fired continuously while dragging and on every -/+ tap. */
  "update:volume": [value: number];
  /** Fired once a gesture ends (slider released, or a -/+ tap). */
  commit: [];
}>();

const sliderValue = computed(() => volumeToSlider(props.volume, props.exponent));

const fillColor = computed(() => {
  if (props.disabled) return "#94a3b8";
  return props.muted ? "#94a3b8" : props.accent;
});

const trackStyle = computed(() => ({
  backgroundImage: `linear-gradient(to right, ${fillColor.value} 0%, ${fillColor.value} ${sliderValue.value}%, transparent ${sliderValue.value}%, transparent 100%)`,
}));

function onInput(e: Event) {
  const raw = parseInt((e.target as HTMLInputElement).value, 10);
  emit("update:volume", sliderToVolume(raw, props.exponent));
}

function nudge(direction: 1 | -1) {
  // Step in slider-space so each tap feels equal regardless of the curve.
  const next = Math.max(
    0,
    Math.min(100, Math.round(sliderValue.value + direction * props.step))
  );
  emit("update:volume", sliderToVolume(next, props.exponent));
  emit("commit");
}
</script>

<template>
  <div class="flex items-center gap-2 w-full" :class="{ 'opacity-60': disabled }">
    <button
      type="button"
      class="shrink-0 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:hover:bg-transparent disabled:hover:text-slate-500"
      :class="size === 'lg' ? 'w-11 h-11 max-sm:hidden' : 'w-9 h-9'"
      :disabled="disabled || volume <= 0"
      :aria-label="`Decrease ${label}`"
      @click="nudge(-1)"
    >
      <span class="mdi mdi-minus" :class="size === 'lg' ? 'text-xl' : 'text-lg'"></span>
    </button>

    <input
      type="range"
      min="0"
      max="100"
      step="1"
      :value="sliderValue"
      :disabled="disabled"
      :aria-label="label"
      :aria-valuetext="`${volume}%${muted ? ', muted' : ''}`"
      class="simple-range flex-1 min-w-0 appearance-none rounded-full bg-slate-200 dark:bg-slate-700 cursor-pointer touch-none disabled:cursor-not-allowed"
      :class="size === 'lg' ? 'h-3 simple-range--lg' : 'h-2'"
      :style="trackStyle"
      @input="onInput"
      @change="emit('commit')"
    />

    <button
      type="button"
      class="shrink-0 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:hover:bg-transparent disabled:hover:text-slate-500"
      :class="size === 'lg' ? 'w-11 h-11 max-sm:hidden' : 'w-9 h-9'"
      :disabled="disabled || volume >= 100"
      :aria-label="`Increase ${label}`"
      @click="nudge(1)"
    >
      <span class="mdi mdi-plus" :class="size === 'lg' ? 'text-xl' : 'text-lg'"></span>
    </button>

    <span
      class="shrink-0 text-right tabular-nums font-semibold"
      :class="[
        size === 'lg' ? 'w-12 text-lg' : 'w-10 text-sm',
        muted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200',
      ]"
      aria-hidden="true"
    >
      {{ volume }}
    </span>
  </div>
</template>

<style scoped>
.simple-range::-webkit-slider-thumb {
  appearance: none;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background: #fff;
  border: 1px solid rgb(203 213 225);
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.25);
  transition: transform 120ms ease;
}
.simple-range--lg::-webkit-slider-thumb {
  width: 1.875rem;
  height: 1.875rem;
}
.simple-range:not(:disabled):active::-webkit-slider-thumb {
  transform: scale(1.12);
}
.simple-range::-moz-range-thumb {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background: #fff;
  border: 1px solid rgb(203 213 225);
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.25);
}
.simple-range--lg::-moz-range-thumb {
  width: 1.875rem;
  height: 1.875rem;
}
.simple-range:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 4px;
}
</style>
