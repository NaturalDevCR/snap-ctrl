<script setup lang="ts">
import { t } from "@/i18n";
import { useZoneControls } from "@/composables/useZoneControls";
import SimpleVolumeSlider from "@/components/simple/SimpleVolumeSlider.vue";
import type { Client, Group } from "@/stores/snapcast";

const props = defineProps<{ client: Client; group: Group }>();
const emit = defineEmits<{
  "client-details": [client: Client];
  "client-settings": [client: Client];
}>();
const zone = useZoneControls(() => props.group);
</script>

<template>
  <div class="st-speaker" :class="{ 'st-speaker--offline': !client.connected }">
    <div class="st-speaker-top">
      <button
        class="st-speaker-info"
        type="button"
        :aria-label="t(`{p0}: speaker info`, { p0: zone.speakerName(client) })"
        @click="emit('client-details', client)"
      >
        <span class="st-speaker-avatar" aria-hidden="true">
          <span class="mdi mdi-speaker"></span>
          <i class="st-dot" :class="{ 'st-dot--online': client.connected }"></i>
        </span>
        <span class="st-truncate">
          <strong>{{ zone.speakerName(client) }}</strong>
          <small
            >{{ client.connected ? t("Online") : t("Offline")
            }}<template v-if="zone.isLinked(client)">
              {{ t("· Linked to zone") }}</template
            ></small
          >
        </span>
      </button>
      <div class="st-speaker-actions">
        <button
          v-if="zone.canLinkClients.value"
          type="button"
          class="st-icon-button"
          :class="{ 'st-selected': zone.isLinked(client) }"
          :aria-label="
            t(`Link {p0} to zone volume`, { p0: zone.speakerName(client) })
          "
          :aria-pressed="zone.isLinked(client)"
          @click="zone.toggleLink(client)"
        >
          <span
            class="mdi"
            :class="
              zone.isLinked(client)
                ? 'mdi-link-variant'
                : 'mdi-link-variant-off'
            "
            aria-hidden="true"
          ></span>
        </button>
        <button
          v-if="zone.showClientSettings.value"
          type="button"
          class="st-icon-button"
          :aria-label="t(`{p0} settings`, { p0: zone.speakerName(client) })"
          @click="emit('client-settings', client)"
        >
          <span class="mdi mdi-tune-variant" aria-hidden="true"></span>
        </button>
        <button
          type="button"
          class="st-icon-button"
          :class="{ 'st-muted': client.config.volume.muted }"
          :disabled="!zone.canAdjustVolume.value"
          :aria-label="
            t(client.config.volume.muted ? 'Unmute {p0}' : 'Mute {p0}', {
              p0: zone.speakerName(client),
            })
          "
          :aria-pressed="client.config.volume.muted"
          @click="zone.toggleSpeakerMute(client)"
        >
          <span
            class="mdi"
            :class="
              client.config.volume.muted ? 'mdi-volume-off' : 'mdi-volume-high'
            "
            aria-hidden="true"
          ></span>
        </button>
      </div>
    </div>
    <SimpleVolumeSlider
      size="md"
      :volume="client.config.volume.percent"
      :muted="client.config.volume.muted || group.muted"
      :label="t(`{p0} volume`, { p0: zone.speakerName(client) })"
      :exponent="zone.exponent.value"
      :step="zone.volumeStep.value"
      :disabled="!zone.canAdjustVolume.value"
      accent="var(--st-accent)"
      @update:volume="zone.setSpeakerVolume(client, $event)"
    />
  </div>
</template>
