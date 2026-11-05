<script setup lang="ts">
import { computed, toRef } from "vue";
import { useSettingsStore } from "@/stores/settings";
import { useSnapcastStore } from "@/stores/snapcast";
import { useZoneOrder } from "@/composables/useZoneOrder";
import AppDialog from "@/components/AppDialog.vue";
import { getGroupDisplayName } from "@/utils/group-name";
import type { Group } from "@/stores/snapcast";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const settings = useSettingsStore();
const snapcast = useSnapcastStore();

const groupsRef = computed(() => snapcast.groups);

const {
  orderedZonesForFilter,
  draggedIndex,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  moveZoneUp,
  moveZoneDown,
  toggleVisibility,
} = useZoneOrder(groupsRef, {
  hiddenZoneIds: computed(() => settings.hiddenGroups),
  showEmptyZones: computed(() => settings.showEmptyGroups),
  browserPlayerId: computed(() => snapcast.browserPlayerId),
});

function getGroupName(group: Group): string {
  return getGroupDisplayName(group, snapcast.streams);
}

function isHidden(groupId: string): boolean {
  return settings.hiddenGroups.includes(groupId);
}
</script>

<template>
  <AppDialog :open="props.open" title="Manage zones" @close="emit('close')">
    <div class="-m-2">
      <div
        v-if="snapcast.groups.length === 0"
        class="p-4 text-center text-[var(--text-tertiary)]"
      >
        No zones available
      </div>
      <div
        v-for="(group, index) in orderedZonesForFilter"
        :key="group.id"
        draggable="true"
        @dragstart="handleDragStart(index, $event)"
        @dragover.prevent="handleDragOver(index, $event)"
        @drop="handleDrop(index, $event)"
        @dragend="handleDragEnd"
        class="flex items-center justify-between p-3 mb-2 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-xl cursor-move transition-colors border border-[var(--border)]"
        :class="{ 'opacity-50': draggedIndex === index }"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span class="mdi mdi-drag-vertical text-[var(--text-tertiary)] hidden sm:inline" aria-hidden="true"></span>
          <!-- Native HTML5 drag-and-drop (the handlers on the row above)
               never fires on touch devices — there's no browser
               fallback — so these are the only way to reorder on a
               phone or tablet, which is most of this app's install
               base. Kept inline rather than hidden behind a
               gesture. -->
          <div class="flex flex-row shrink-0">
            <button
              type="button"
              class="w-11 h-11 flex items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] disabled:opacity-25 disabled:pointer-events-none"
              :disabled="index === 0"
              :aria-label="`Move ${getGroupName(group)} up`"
              @click.stop="moveZoneUp(index)"
            >
              <span class="mdi mdi-chevron-up text-xl"></span>
            </button>
            <button
              type="button"
              class="w-11 h-11 flex items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] disabled:opacity-25 disabled:pointer-events-none"
              :disabled="index === orderedZonesForFilter.length - 1"
              :aria-label="`Move ${getGroupName(group)} down`"
              @click.stop="moveZoneDown(index)"
            >
              <span class="mdi mdi-chevron-down text-xl"></span>
            </button>
          </div>
          <span
            class="w-8 h-8 rounded-full hidden sm:flex items-center justify-center bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] text-sm font-bold shrink-0"
          >
            {{ getGroupName(group).charAt(0).toUpperCase() }}
          </span>
          <span class="min-w-0 font-medium text-[var(--text-primary)] truncate">{{
            getGroupName(group)
          }}</span>
        </div>
        <button
          type="button"
          class="w-11 h-11 flex items-center justify-center shrink-0"
          :aria-pressed="!isHidden(group.id)"
          :aria-label="isHidden(group.id) ? `Show ${getGroupName(group)}` : `Hide ${getGroupName(group)}`"
          @click.stop="toggleVisibility(group.id)"
        >
          <span
            class="w-6 h-6 rounded-full border flex items-center justify-center transition-colors"
            :class="
              !isHidden(group.id)
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300 dark:border-gray-600'
            "
          >
            <span
              v-if="!isHidden(group.id)"
              class="mdi mdi-check text-sm"
            ></span>
          </span>
        </button>
      </div>
    </div>

    <template #footer>
      <div class="w-full flex justify-end">
        <button
          @click="emit('close')"
          class="px-4 py-2 min-h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </template>
  </AppDialog>
</template>
