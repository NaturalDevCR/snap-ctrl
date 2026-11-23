<script setup lang="ts">
import { t } from "@/i18n";
import { computed, ref, watch, nextTick } from "vue";
import AppDialog from "@/components/AppDialog.vue";
import { useZoneControls } from "@/composables/useZoneControls";
import type { Group } from "@/stores/snapcast";

const props = defineProps<{ open: boolean; group: Group }>();
const emit = defineEmits<{ close: [] }>();
const zone = useZoneControls(() => props.group);
const query = ref("");
watch(
  () => props.open,
  () => {
    query.value = "";
  },
);
const sources = computed(() =>
  zone.sources.value.filter((s) =>
    s.name.toLowerCase().includes(query.value.trim().toLowerCase()),
  ),
);
async function select(id: string) {
  emit("close");
  await nextTick();
  zone.selectSource(id);
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="t(`Source for {p0}`, { p0: zone.zoneName.value })"
    title-icon="mdi-music-box-multiple-outline"
    @close="emit('close')"
  >
    <div class="st-picker">
      <p class="st-description">
        {{
          t(
            "Choose what this zone listens to. Playback is managed by the source application.",
          )
        }}
      </p>
      <label class="st-search">
        <span class="mdi mdi-magnify" aria-hidden="true"></span>
        <input
          v-model="query"
          type="search"
          :aria-label="t('Search sources')"
          :placeholder="t('Find a source…')"
        />
      </label>
      <div class="st-picker-list">
        <button
          v-for="source in sources"
          :key="source.id"
          type="button"
          class="st-picker-option"
          :class="{ 'st-selected': source.id === group.stream_id }"
          :aria-pressed="source.id === group.stream_id"
          :disabled="!zone.canSelectStream.value"
          @click="select(source.id)"
        >
          <span class="st-source-icon"
            ><span class="mdi" :class="source.icon" aria-hidden="true"></span
          ></span>
          <span class="st-truncate"
            ><strong>{{ source.name }}</strong
            ><small>{{
              source.state === "playing"
                ? t("Playing")
                : source.state === "idle"
                  ? t("Idle")
                  : t("Unavailable")
            }}</small></span
          >
          <span
            class="mdi"
            :class="
              source.id === group.stream_id
                ? 'mdi-check-circle'
                : 'mdi-arrow-right'
            "
            aria-hidden="true"
          ></span>
        </button>
        <p v-if="!sources.length" class="st-description st-picker-empty">
          {{ t("No sources match your search.") }}
        </p>
      </div>
    </div>
  </AppDialog>
</template>
