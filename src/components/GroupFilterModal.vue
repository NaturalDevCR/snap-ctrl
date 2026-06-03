<script setup lang="ts">
import { computed, toRef } from "vue";
import { useSettingsStore } from "@/stores/settings";
import { useSnapcastStore } from "@/stores/snapcast";
import { useZoneOrder } from "@/composables/useZoneOrder";
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

function getGroupColor(groupId: string): string {
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index]!;
}

function onBackdropClick() {
  emit("close");
}
</script>

<template>
  <div
    v-if="props.open"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
    @click.self="onBackdropClick"
  >
    <div
      class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden"
    >
      <div
        class="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between"
      >
        <h3 class="font-bold text-lg text-gray-900 dark:text-white">
          Manage Groups
        </h3>
        <button
          @click="emit('close')"
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <span class="mdi mdi-close text-xl"></span>
        </button>
      </div>
      <div class="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
        <div
          v-if="snapcast.groups.length === 0"
          class="p-4 text-center text-gray-500 dark:text-gray-400"
        >
          No groups available
        </div>
        <div
          v-for="(group, index) in orderedZonesForFilter"
          :key="group.id"
          draggable="true"
          @dragstart="handleDragStart(index, $event)"
          @dragover.prevent="handleDragOver(index, $event)"
          @drop="handleDrop(index, $event)"
          @dragend="handleDragEnd"
          class="flex items-center justify-between p-3 mb-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl cursor-move transition-colors border border-gray-200 dark:border-gray-700"
          :class="{ 'opacity-50': draggedIndex === index }"
        >
          <div class="flex items-center gap-3">
            <span class="mdi mdi-drag-vertical text-gray-400"></span>
            <span
              class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              :class="getGroupColor(group.id)"
            >
              {{ getGroupName(group).charAt(0).toUpperCase() }}
            </span>
            <span class="font-medium text-gray-900 dark:text-white">{{
              getGroupName(group)
            }}</span>
          </div>
          <div
            class="w-6 h-6 rounded-full border flex items-center justify-center transition-colors"
            :class="
              !isHidden(group.id)
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300 dark:border-gray-600'
            "
            @click.stop="toggleVisibility(group.id)"
          >
            <span
              v-if="!isHidden(group.id)"
              class="mdi mdi-check text-sm"
            ></span>
          </div>
        </div>
      </div>
      <div
        class="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 flex justify-end"
      >
        <button
          @click="emit('close')"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
