<script setup lang="ts">
import { t, countLabel } from "@/i18n";
import { useZoneControls } from "@/composables/useZoneControls";
import AppDialog from "@/components/AppDialog.vue";
import StudioSpeakerRow from "./StudioSpeakerRow.vue";
import type { Client, Group } from "@/stores/snapcast";

const props = defineProps<{ open: boolean; group: Group }>();
const emit = defineEmits<{
  close: [];
  "client-details": [client: Client];
  "client-settings": [client: Client];
}>();
const zone = useZoneControls(() => props.group);
</script>

<template>
  <AppDialog
    :open="open"
    :title="t('Speakers for {name}', { name: zone.zoneName.value })"
    title-icon="mdi-speaker-multiple"
    size="lg"
    :layer="100"
    @close="emit('close')"
  >
    <div class="st-speakers-dialog">
      <div class="st-speakers-dialog-summary">
        <span>{{ countLabel(zone.speakers.value.length, 'speaker', 'speakers') }}</span>
        <span v-if="group.muted" class="st-state-pill st-state-pill--muted">{{ t('Muted') }}</span>
      </div>
      <p v-if="!zone.speakers.value.length" class="st-description">{{ zone.noSpeakersMessage.value }}</p>
      <StudioSpeakerRow
        v-for="client in zone.speakers.value"
        :key="client.id"
        :client="client"
        :group="group"
        @client-details="emit('client-details', $event)"
        @client-settings="emit('client-settings', $event)"
      />
    </div>
    <template #footer>
      <button type="button" class="st-button st-button--primary st-speakers-done" @click="emit('close')">{{ t('Done') }}</button>
    </template>
  </AppDialog>
</template>
