<script setup lang="ts">
import { ref, computed } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import { useZoneOrder } from "@/composables/useZoneOrder";
import { getGroupDisplayName } from "@/utils/group-name";
import { getStreamName } from "@/utils/stream-name";
import {
  getStreamStatusColor,
  getStreamStatusIcon,
} from "@/utils/stream-status";
import { averageGroupVolume } from "@/utils/group-volume";
import Tooltip from "@/components/Tooltip.vue";
import GroupFilterModal from "@/components/GroupFilterModal.vue";
import type { Client, Group } from "@/stores/snapcast";

const emit = defineEmits<{
  (e: "zone-control", group: Group): void;
  (e: "group-settings", group: Group): void;
  (e: "create-group"): void;
}>();

const snapcast = useSnapcastStore();
const settings = useSettingsStore();
const auth = useAuthStore();

const refreshing = ref(false);
const showGroupFilter = ref(false);

const { sortedZones: sortedGroups } = useZoneOrder(
  computed(() => snapcast.filteredGroups),
  {
    hiddenZoneIds: computed(() => settings.hiddenGroups),
    showEmptyZones: computed(() => settings.showEmptyGroups),
    browserPlayerId: computed(() => snapcast.browserPlayerId),
  }
);

async function refreshStatus() {
  refreshing.value = true;
  try {
    await snapcast.getServerStatus();
  } finally {
    refreshing.value = false;
  }
}

function getGroupName(group: Group): string {
  return getGroupDisplayName(group, snapcast.streams);
}

function getGroupVolume(groupId: string): number {
  const linkedIds = settings.groupVolumeLinks[groupId]?.linkedClientIds || [];
  const group = snapcast.groups.find((g) => g.id === groupId);
  return averageGroupVolume(group, linkedIds);
}

function getDisplayClients(group: Group): Client[] {
  return auth.filterAllowedEntities("client", group.clients);
}

function toggleGroupMute(group: Group) {
  snapcast.setGroupMute(group.id, !group.muted);
}

function streamOf(group: Group) {
  return snapcast.streams.find((s) => s.id === group.stream_id);
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <h2
        class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3"
      >
        <span class="mdi mdi-speaker-multiple text-blue-600 dark:text-blue-400"></span>
        Audio Zones
      </h2>
      <div class="flex items-center gap-2">
        <Tooltip text="Create Group">
          <button
            v-if="auth.permissions.showCreateGroup"
            @click="emit('create-group')"
            class="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors cursor-pointer"
          >
            <span class="mdi mdi-plus text-xl"></span>
          </button>
        </Tooltip>
        <Tooltip text="Refresh Status">
          <button
            @click="refreshStatus"
            class="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm transition-colors cursor-pointer"
            :disabled="refreshing"
          >
            <span
              class="mdi mdi-refresh text-xl block"
              :class="{ 'animate-spin': refreshing }"
            ></span>
          </button>
        </Tooltip>
        <Tooltip
          :text="
            settings.showEmptyGroups ? 'Hide empty groups' : 'Show empty groups'
          "
        >
          <button
            class="w-10 h-10 flex items-center justify-center rounded-lg border shadow-sm transition-colors cursor-pointer"
            :class="
              settings.showEmptyGroups
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
            "
            @click="settings.showEmptyGroups = !settings.showEmptyGroups"
          >
            <span
              class="mdi"
              :class="settings.showEmptyGroups ? 'mdi-eye' : 'mdi-eye-off'"
            ></span>
          </button>
        </Tooltip>

        <Tooltip text="Filter Groups">
          <button
            v-if="auth.permissions.showGroupFilter"
            class="w-10 h-10 flex items-center justify-center rounded-lg border shadow-sm transition-colors cursor-pointer"
            :class="
              showGroupFilter
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
            "
            @click="showGroupFilter = !showGroupFilter"
          >
            <span class="mdi mdi-filter-variant text-xl"></span>
          </button>
        </Tooltip>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="group in sortedGroups"
        :key="group.id"
        class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full"
      >
        <div class="p-4">
          <div class="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
            <!-- Header: Name & Controls -->
            <div class="flex items-center gap-3 w-full mb-3">
              <div
                class="w-8 h-8 rounded-lg bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm"
              >
                <span class="mdi mdi-speaker-multiple"></span>
              </div>
              <div class="flex-1 min-w-0">
                <h3
                  class="font-bold text-lg text-gray-900 dark:text-white truncate"
                  :title="getGroupName(group)"
                >
                  {{ getGroupName(group) }}
                </h3>
                <!-- Stream Name Subtitle -->
                <div
                  class="flex items-center gap-1.5 text-xs truncate"
                  :class="getStreamStatusColor(snapcast.streams, group.stream_id)"
                >
                  <span
                    class="mdi"
                    :class="getStreamStatusIcon(snapcast.streams, group.stream_id)"
                  ></span>
                  <span>{{ getStreamName(streamOf(group)) }}</span>
                </div>
              </div>

              <!-- Quick Mute/Settings -->
              <div class="flex items-center gap-1 shrink-0">
                <Tooltip :text="group.muted ? 'Unmute Group' : 'Mute Group'">
                  <button
                    @click="toggleGroupMute(group)"
                    class="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    :class="
                      group.muted
                        ? 'text-red-500'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    "
                  >
                    <span
                      class="mdi"
                      :class="group.muted ? 'mdi-volume-off' : 'mdi-volume-high'"
                    ></span>
                  </button>
                </Tooltip>
                <Tooltip
                  v-if="auth.permissions.showGroupSettings"
                  text="Group Settings"
                >
                  <button
                    @click="emit('group-settings', group)"
                    class="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <span class="mdi mdi-cog"></span>
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          <!-- Summary Info -->
          <div
            class="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-800"
          >
            <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span class="flex items-center gap-1.5">
                <span class="mdi mdi-speaker"></span>
                {{ getDisplayClients(group).length }} Client{{
                  getDisplayClients(group).length !== 1 ? "s" : ""
                }}
              </span>
              <span class="flex items-center gap-1.5">
                <span class="mdi mdi-volume-high"></span>
                {{ getGroupVolume(group.id) }}%
              </span>
            </div>

            <Tooltip text="Open Zone Control">
              <button
                @click="emit('zone-control', group)"
                class="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Control</span>
                <span class="mdi mdi-chevron-right"></span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="snapcast.isConnected && snapcast.groups.length === 0"
      class="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-slate-900/50"
    >
      <div
        class="w-20 h-20 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500"
      >
        <span class="mdi mdi-magnify text-4xl"></span>
      </div>
      <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
        No groups found
      </h3>
      <p class="text-gray-500 dark:text-gray-400 max-w-sm">
        Make sure your Snapcast server is running and has clients connected.
      </p>
    </div>

    <!-- Group Filter Modal -->
    <GroupFilterModal :open="showGroupFilter" @close="showGroupFilter = false" />
  </div>
</template>
