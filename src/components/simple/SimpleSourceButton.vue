<script setup lang="ts">
import { ref, computed } from "vue";
import { useZoneControls } from "@/composables/useZoneControls";
import SimpleSourcePicker from "@/components/simple/SimpleSourcePicker.vue";
import type { Group } from "@/stores/snapcast";

const props = defineProps<{ group: Group }>();

const zone = useZoneControls(() => props.group);
const showPicker = ref(false);

// Nothing to choose between with a single allowed source (or none).
const canChange = computed(
  () => zone.canSelectStream.value && zone.sources.value.length > 1
);

const subtitle = computed(() => {
  if (!zone.canSelectStream.value) return "Changing the source is disabled";
  const n = zone.sources.value.length;
  return n > 1 ? `${n} sources available` : "Only source available";
});
</script>

<template>
  <component
    :is="canChange ? 'button' : 'div'"
    :type="canChange ? 'button' : undefined"
    class="w-full flex items-center gap-3 p-2 pr-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 text-left transition-all duration-300"
    :class="
      canChange
        ? 'hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500'
        : ''
    "
    :aria-haspopup="canChange ? 'dialog' : undefined"
    :aria-label="
      canChange
        ? `Source: ${zone.currentSourceName.value}. Change source`
        : undefined
    "
    @click="canChange && (showPicker = true)"
  >
    <span
      class="sv-tile w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white transition-all duration-500"
      :class="{ 'is-muted': group.muted }"
      aria-hidden="true"
    >
      <Transition name="sv-swap" mode="out-in">
        <span
          :key="zone.currentSourceIcon.value"
          class="mdi text-xl"
          :class="zone.currentSourceIcon.value"
        ></span>
      </Transition>
    </span>
    <span class="flex-1 min-w-0">
      <Transition name="sv-slide" mode="out-in">
        <span
          :key="group.stream_id"
          class="block truncate font-semibold text-slate-900 dark:text-white"
        >
          {{ zone.currentSourceName.value }}
        </span>
      </Transition>
      <span class="block truncate text-xs text-slate-500 dark:text-slate-400">
        {{ subtitle }}
      </span>
    </span>
    <span
      v-if="canChange"
      class="shrink-0 inline-flex items-center gap-0.5 text-sm font-semibold sv-accent-text"
    >
      Change
      <span class="mdi mdi-chevron-right text-lg" aria-hidden="true"></span>
    </span>
    <span
      v-else-if="!zone.canSelectStream.value"
      class="shrink-0 mdi mdi-lock-outline text-lg text-slate-400"
      aria-hidden="true"
    ></span>
  </component>

  <SimpleSourcePicker
    v-if="canChange"
    :open="showPicker"
    :zone-name="zone.zoneName.value"
    :sources="zone.sources.value"
    :current-id="group.stream_id"
    @select="zone.selectSource"
    @close="showPicker = false"
  />
</template>
