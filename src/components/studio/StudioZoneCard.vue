<script setup lang="ts">
import { t } from "@/i18n";
import { computed, ref, useId } from "vue";
import { useZoneControls } from "@/composables/useZoneControls";
import SimpleVolumeSlider from "@/components/simple/SimpleVolumeSlider.vue";
import StudioSourcePicker from "./StudioSourcePicker.vue";
import StudioSpeakerRow from "./StudioSpeakerRow.vue";
import type { Client, Group } from "@/stores/snapcast";

const props = defineProps<{ group: Group }>();
const emit = defineEmits<{
  "group-settings": [group: Group];
  "client-details": [client: Client];
  "client-settings": [client: Client];
}>();
const zone = useZoneControls(() => props.group);
const expanded = ref(false);
const sourceOpen = ref(false);
const speakersId = useId();
const singleSpeaker = computed(() =>
  zone.speakers.value.length === 1 ? zone.speakers.value[0] : undefined,
);
const hasVolume = computed(
  () => zone.hasMasterVolume.value || !!singleSpeaker.value,
);
const volume = computed(() =>
  zone.hasMasterVolume.value
    ? zone.masterVolume.value
    : (singleSpeaker.value?.config.volume.percent ?? 0),
);
const volumeMuted = computed(
  () =>
    props.group.muted ||
    (!zone.hasMasterVolume.value && !!singleSpeaker.value?.config.volume.muted),
);
function setVolume(value: number) {
  if (!zone.canAdjustVolume.value) return;
  if (zone.hasMasterVolume.value) zone.setMasterVolume(value);
  else if (singleSpeaker.value)
    zone.setSpeakerVolume(singleSpeaker.value, value);
}
</script>

<template>
  <article
    class="st-zone-card"
    :class="{
      'st-zone-card--playing': zone.tileState.value === 'playing',
      'st-zone-card--muted': group.muted,
      'st-zone-card--unavailable':
        !group.muted && zone.playState.value === 'unavailable',
    }"
    :aria-label="zone.zoneName.value"
  >
    <header class="st-zone-head">
      <span class="st-zone-symbol" aria-hidden="true"
        ><span
          v-if="zone.tileState.value === 'playing'"
          class="st-equalizer st-equalizer--tile"
          ><i></i><i></i><i></i><i></i></span
        ><span
          v-else
          class="mdi"
          :class="
            group.muted
              ? 'mdi-volume-off'
              : zone.playState.value === 'unavailable'
                ? 'mdi-alert-circle-outline'
                : 'mdi-speaker'
          "
        ></span
      ></span>
      <div class="st-zone-identity">
        <h3 :title="zone.zoneName.value">{{ zone.zoneName.value }}</h3>
        <p>
          {{
            t(
              zone.speakers.value.length === 1
                ? "{count} speaker"
                : "{count} speakers",
              { count: zone.speakers.value.length },
            )
          }}<template v-if="zone.hasMasterVolume.value">
            ·
            {{
              t("{count} linked", { count: zone.linkedClients.value.length })
            }}</template
          >
        </p>
      </div>
      <span
        class="st-state-pill"
        :class="{
          'st-state-pill--live': zone.tileState.value === 'playing',
          'st-state-pill--muted': group.muted,
        }"
      >
        <span
          v-if="zone.tileState.value === 'playing'"
          class="st-equalizer"
          aria-hidden="true"
          ><i></i><i></i><i></i><i></i></span
        ><i v-else class="st-dot" aria-hidden="true"></i
        >{{ group.muted ? t("Muted") : zone.statusLabel.value }}
      </span>
      <button
        v-if="zone.showGroupSettings.value"
        type="button"
        class="st-icon-button st-zone-settings"
        :aria-label="t(`{p0} settings`, { p0: zone.zoneName.value })"
        @click="emit('group-settings', group)"
      >
        <span class="mdi mdi-dots-horizontal" aria-hidden="true"></span>
      </button>
    </header>
    <div class="st-zone-routing">
      <button
        type="button"
        class="st-zone-source"
        :disabled="!zone.canChangeSource.value"
        :aria-label="
          t(`Change source for {p0}: {p1}`, {
            p0: zone.zoneName.value,
            p1: zone.currentSourceName.value,
          })
        "
        aria-haspopup="dialog"
        @click="sourceOpen = true"
      >
        <span
          class="mdi"
          :class="zone.currentSourceIcon.value"
          aria-hidden="true"
        ></span
        ><span class="st-source-text"
          ><small>{{ t("Source") }}</small
          ><strong>{{ zone.currentSourceName.value }}</strong></span
        ><span
          v-if="zone.canChangeSource.value"
          class="mdi mdi-unfold-more-horizontal"
          aria-hidden="true"
        ></span
        ><span v-else class="mdi mdi-lock-outline" aria-hidden="true"></span>
      </button>
      <button
        v-if="zone.speakers.value.length"
        type="button"
        class="st-zone-expand"
        :class="{ 'st-selected': expanded }"
        :aria-label="
          t(
            expanded
              ? 'Hide speakers for {name}'
              : 'Manage speakers for {name}',
            { name: zone.zoneName.value },
          )
        "
        :aria-expanded="expanded"
        :aria-controls="speakersId"
        @click="expanded = !expanded"
      >
        <span class="mdi mdi-speaker-multiple" aria-hidden="true"></span
        ><span
          class="mdi mdi-chevron-down"
          :class="{ 'st-rotated': expanded }"
          aria-hidden="true"
        ></span>
      </button>
    </div>
    <div class="st-zone-volume">
      <button
        type="button"
        class="st-icon-button"
        :class="{ 'st-muted': group.muted }"
        :disabled="!zone.canAdjustVolume.value"
        :aria-label="
          t(group.muted ? 'Unmute {p0}' : 'Mute {p0}', {
            p0: zone.zoneName.value,
          })
        "
        :aria-pressed="group.muted"
        @click="zone.toggleZoneMute"
      >
        <span
          class="mdi"
          :class="group.muted ? 'mdi-volume-off' : 'mdi-volume-high'"
          aria-hidden="true"
        ></span>
      </button>
      <SimpleVolumeSlider
        v-if="hasVolume"
        :volume="volume"
        :muted="volumeMuted"
        :label="t(`{p0} volume`, { p0: zone.zoneName.value })"
        :exponent="zone.exponent.value"
        :step="zone.volumeStep.value"
        :disabled="!zone.canAdjustVolume.value"
        accent="var(--st-accent)"
        @update:volume="setVolume"
      />
      <button
        v-else-if="zone.speakers.value.length"
        type="button"
        class="st-volume-hint"
        @click="expanded = !expanded"
        :aria-expanded="expanded"
        :aria-controls="speakersId"
      >
        {{ t("Individual volumes")
        }}<span class="mdi mdi-tune-vertical" aria-hidden="true"></span>
      </button>
      <p v-else class="st-volume-hint">{{ zone.noSpeakersMessage.value }}</p>
    </div>
    <div
      :id="speakersId"
      class="st-expand-wrap"
      :class="{ 'st-expand-wrap--open': expanded }"
      :inert="!expanded || undefined"
      :aria-hidden="!expanded"
    >
      <div class="st-expand-inner">
        <div class="st-zone-speakers">
          <StudioSpeakerRow
            v-for="client in zone.speakers.value"
            :key="client.id"
            :client="client"
            :group="group"
            @client-details="emit('client-details', $event)"
            @client-settings="emit('client-settings', $event)"
          />
        </div>
      </div>
    </div>
    <StudioSourcePicker
      :open="sourceOpen"
      :group="group"
      @close="sourceOpen = false"
    />
  </article>
</template>
