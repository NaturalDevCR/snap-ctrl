<script setup lang="ts">
import { ref, watch } from "vue";
import type { Client } from "@/types/snapcast-rpc";
import { useVolumeControl } from "../composables/useVolumeControl";

const props = defineProps<{
  client: Client;
  request: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>;
}>();

const displayPercent = ref(props.client.config.volume.percent);
const displayMuted = ref(props.client.config.volume.muted);

watch(
  () => props.client.config.volume,
  (v) => {
    displayPercent.value = v.percent;
    displayMuted.value = v.muted;
  }
);

const volumeControl = useVolumeControl({ request: props.request });

function onSlide(event: Event) {
  const percent = Number((event.target as HTMLInputElement).value);
  const before = displayPercent.value;
  volumeControl.setVolume(
    props.client.id,
    percent,
    displayMuted.value,
    (p) => (displayPercent.value = p),
    () => (displayPercent.value = before)
  );
}

function onToggleMute() {
  const before = displayMuted.value;
  volumeControl.setMute(
    props.client.id,
    !before,
    displayPercent.value,
    (m) => (displayMuted.value = m),
    (m) => (displayMuted.value = m)
  );
}
</script>

<template>
  <div class="volume-row">
    <span class="name">{{ client.config.name || client.name }}</span>
    <button type="button" class="mute" :aria-pressed="displayMuted" @click="onToggleMute">
      {{ displayMuted ? "🔇" : "🔊" }}
    </button>
    <input
      type="range"
      min="0"
      max="100"
      :value="displayPercent"
      :disabled="!client.connected"
      @input="onSlide"
    />
    <span class="percent">{{ displayPercent }}%</span>
  </div>
</template>

<style scoped>
.volume-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--divider-color, #e0e0e0);
}
.name {
  flex: 1;
  color: var(--primary-text-color, #212121);
}
.mute {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1em;
}
input[type="range"] {
  flex: 2;
  accent-color: var(--primary-color, #03a9f4);
}
.percent {
  width: 3em;
  text-align: right;
  color: var(--secondary-text-color, #666);
}
</style>
