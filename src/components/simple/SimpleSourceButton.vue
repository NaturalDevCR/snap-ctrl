<script setup lang="ts">
import { t } from "@/i18n";
import { ref, computed, nextTick } from "vue";
import { useZoneControls } from "@/composables/useZoneControls";
import SimpleSourcePicker from "@/components/simple/SimpleSourcePicker.vue";
import type { Group } from "@/stores/snapcast";

const props = defineProps<{ group: Group }>();

const zone = useZoneControls(() => props.group);
const showPicker = ref(false);

const subtitle = computed(() => {
  if (!zone.canSelectStream.value) return t("Changing the source is disabled");
  const n = zone.sources.value.length;
  if (n === 0) return t("No sources available");
  if (!zone.canChangeSource.value) return t("Only source available");
  return t(n === 1 ? "{count} source available" : "{count} sources available", {
    count: n,
  });
});

async function requestSourceChange(id: string) {
  showPicker.value = false;
  await nextTick();
  zone.selectSource(id);
}
</script>

<template>
  <component
    :is="zone.canChangeSource.value ? 'button' : 'div'"
    :type="zone.canChangeSource.value ? 'button' : undefined"
    class="w-full flex items-center gap-3 p-2 pr-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-left transition-all duration-300"
    :class="
      zone.canChangeSource.value
        ? 'hover:bg-[var(--surface-1)] hover:shadow-md hover:border-[var(--text-tertiary)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500'
        : ''
    "
    :aria-haspopup="zone.canChangeSource.value ? 'dialog' : undefined"
    :aria-label="
      zone.canChangeSource.value
        ? t(`Source: {p0}. Change source`, { p0: zone.currentSourceName.value })
        : undefined
    "
    @click="zone.canChangeSource.value && (showPicker = true)"
  >
    <span
      class="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-500"
      :class="
        zone.playState.value === 'playing'
          ? 'border-transparent text-white shadow-md'
          : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)]'
      "
      :style="
        zone.playState.value === 'playing'
          ? { background: zone.playAccent.value.main }
          : undefined
      "
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
      <span
        class="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]"
        >{{ t("Source") }}</span
      >
      <Transition name="sv-slide" mode="out-in">
        <span
          :key="group.stream_id"
          class="block truncate font-semibold text-[var(--text-primary)]"
        >
          {{ zone.currentSourceName.value }}
        </span>
      </Transition>
      <span class="block truncate text-xs text-[var(--text-tertiary)]">
        {{ subtitle }}
      </span>
    </span>
    <span
      v-if="zone.canChangeSource.value"
      class="shrink-0 inline-flex items-center gap-0.5 text-sm font-semibold text-blue-600 dark:text-blue-400"
    >
      {{ t("Change") }}
      <span class="mdi mdi-chevron-right text-lg" aria-hidden="true"></span>
    </span>
    <span
      v-else-if="!zone.canSelectStream.value"
      class="shrink-0 mdi mdi-lock-outline text-lg text-[var(--text-tertiary)]"
      aria-hidden="true"
    ></span>
  </component>

  <SimpleSourcePicker
    v-if="zone.canChangeSource.value || showPicker"
    :open="showPicker"
    :zone-name="zone.zoneName.value"
    :sources="zone.sources.value"
    :current-id="group.stream_id"
    @select="requestSourceChange"
    @close="showPicker = false"
  />
</template>
