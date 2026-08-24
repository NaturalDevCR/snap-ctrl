<script setup lang="ts">
import { ref, watch } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import { getStreamName } from "@/utils/stream-name";
import { logger } from "@/utils/logger";
import Tooltip from "@/components/Tooltip.vue";
import type { Client, Group } from "@/stores/snapcast";

const props = defineProps<{
  open: boolean;
  group: Group | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const snapcast = useSnapcastStore();
const settings = useSettingsStore();
const auth = useAuthStore();

const groupId = ref<string | null>(null);
const name = ref("");
const streamId = ref<string | null>(null);
const clientIds = ref<string[]>([]);
const linkedClientIds = ref<string[]>([]);
const perSourceVolumeEnabled = ref(false);
const volumeMode = ref<"global" | "linear" | "nonlinear">("global");
const volumeExponent = ref<number | null>(null);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.group) {
      const group = props.group;
      const linkedIds =
        settings.groupVolumeLinks[group.id]?.linkedClientIds || [];
      groupId.value = group.id;
      name.value = group.name || "";
      streamId.value = group.stream_id;
      clientIds.value = group.clients.map((c) => c.id);
      linkedClientIds.value = [...linkedIds];
      perSourceVolumeEnabled.value = settings.isPerSourceVolumeEnabled(group.id);
      volumeMode.value =
        settings.groupVolumeControlConfig[group.id]?.mode || "global";
      volumeExponent.value =
        settings.groupVolumeControlConfig[group.id]?.exponent ?? null;
    }
  }
);

function getOfflineClientsInGroup(): Client[] {
  if (!groupId.value) return [];
  const group = snapcast.groups.find((g) => g.id === groupId.value);
  if (!group) return [];
  return group.clients.filter((c) => !c.connected);
}

// Remove all offline clients from current group
async function removeOfflineClients() {
  if (!groupId.value) return;

  for (const client of getOfflineClientsInGroup()) {
    try {
      await snapcast.deleteClient(client.id);
    } catch (error) {
      console.error(`Failed to delete client ${client.id}:`, error);
    }
  }

  // Refresh the modal data
  const group = snapcast.groups.find((g) => g.id === groupId.value);
  if (group) {
    clientIds.value = group.clients.map((c) => c.id);
    linkedClientIds.value = linkedClientIds.value.filter((id) =>
      group.clients.some((c) => c.id === id)
    );
  }
}

async function apply() {
  if (!groupId.value) return;

  // Save per-source volume setting first
  settings.setPerSourceVolumeEnabled(groupId.value, perSourceVolumeEnabled.value);

  // SNAPSHOT: If enabled, snapshot current volumes for current stream
  // immediately so the current state becomes the baseline.
  if (perSourceVolumeEnabled.value) {
    const group = snapcast.groups.find((g) => g.id === groupId.value);
    // Use group stream unless overridden by modal selection
    const targetStream = streamId.value || group?.stream_id;

    if (group && targetStream) {
      group.clients.forEach((client) => {
        settings.saveClientVolume(
          client.id,
          targetStream,
          client.config.volume.percent
        );
      });
    }
  }

  // Update stream
  if (streamId.value) {
    await snapcast.setGroupStream(groupId.value, streamId.value);
  }

  // Update clients in group
  try {
    await snapcast.setGroupClients(groupId.value, clientIds.value);
  } catch {
    // Suppress errors - group might have been auto-deleted if emptied
    logger.debug("Group clients update skipped (group may have been deleted)");
  }

  // Save custom name
  try {
    await snapcast.setGroupName(groupId.value, name.value);
  } catch {
    // Suppress errors - group might have been auto-deleted
    logger.debug("Group name update skipped (group may have been deleted)");
  }

  // Calculate reference volumes for linked clients.
  // Use current volume as the 100% baseline for each client.
  const group = snapcast.groups.find((g) => g.id === groupId.value);
  const referenceVolumes: Record<string, number> = {};

  if (group) {
    for (const clientId of linkedClientIds.value) {
      const client = group.clients.find((c) => c.id === clientId);
      if (client) {
        referenceVolumes[clientId] = client.config.volume.percent;
      }
    }
  }

  // Save linked clients configuration with reference volumes
  settings.setGroupVolumeLinks(
    groupId.value,
    linkedClientIds.value,
    referenceVolumes
  );

  // Save volume control config
  settings.setGroupVolumeControlConfig(
    groupId.value,
    volumeMode.value,
    volumeExponent.value ?? undefined
  );

  emit("close");
}

async function deleteGroup() {
  if (!groupId.value) return;

  const group = snapcast.groups.find((g) => g.id === groupId.value);
  if (!group) return;

  // Delete disconnected clients first
  for (const client of group.clients.filter((c) => !c.connected)) {
    try {
      await snapcast.deleteClient(client.id);
    } catch (error) {
      console.error(`Failed to delete client ${client.id}:`, error);
    }
  }

  // Empty the group of remaining clients. Skip if the server already
  // removed the group after its last client was deleted above.
  const stillExists = snapcast.groups.some((g) => g.id === groupId.value);
  if (stillExists) {
    await snapcast.setGroupClients(groupId.value, []);
  }

  emit("close");
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="props.open"
      class="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div
        class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800 transform transition-all"
        @click.stop
      >
        <div
          class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between"
        >
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">
            Group Settings
          </h3>
          <button
            @click="emit('close')"
            aria-label="Close"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            <span class="mdi mdi-close text-xl"></span>
          </button>
        </div>

        <div class="p-6 space-y-6">
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >Group Name</label
            >
            <input
              class="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-slate-800/50"
              v-model.trim="name"
              placeholder="Custom group name"
              :disabled="!auth.permissions.canRenameGroups"
            />
          </div>

          <div v-if="auth.permissions.canSelectStream">
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >Stream</label
            >
            <div class="relative">
              <select
                v-model="streamId"
                class="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-gray-900 dark:text-white"
              >
                <option
                  v-for="s in snapcast.filteredStreams"
                  :key="s.id"
                  :value="s.id"
                >
                  {{ getStreamName(s) }}
                </option>
              </select>
              <span
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              >
                <span class="mdi mdi-chevron-down"></span>
              </span>
            </div>
          </div>

          <!-- Per-Source Volume Toggle -->
          <label
            v-if="auth.permissions.canConfigurePSV"
            class="block mb-6 cursor-pointer"
          >
            <div
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div class="flex flex-col">
                <span class="font-medium text-gray-900 dark:text-white"
                  >Per-Source Volume</span
                >
                <span class="text-xs text-gray-500 dark:text-gray-400"
                  >Remember volume settings for each source</span
                >
              </div>
              <div class="relative inline-flex items-center">
                <input
                  type="checkbox"
                  v-model="perSourceVolumeEnabled"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </div>
          </label>

          <!-- Volume Control Mode -->
          <div v-if="auth.permissions.canConfigurePSV" class="space-y-4 mb-6">
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >Volume Control Mode</label
              >
              <div class="relative">
                <select
                  v-model="volumeMode"
                  class="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-gray-900 dark:text-white"
                >
                  <option value="global">
                    Global Default ({{ settings.globalVolumeControlMode }})
                  </option>
                  <option value="linear">Linear</option>
                  <option value="nonlinear">Non-Linear</option>
                </select>
                <span
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                >
                  <span class="mdi mdi-chevron-down"></span>
                </span>
              </div>
            </div>

            <div
              v-if="
                volumeMode === 'nonlinear' ||
                (volumeMode === 'global' &&
                  settings.globalVolumeControlMode === 'nonlinear')
              "
            >
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium text-gray-700 dark:text-white"
                  >Exponent (Curve)</label
                >
                <span
                  class="text-xs font-mono bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300"
                >
                  {{ volumeExponent ?? settings.globalVolumeExponent }}
                </span>
              </div>
              <input
                type="range"
                v-model.number="volumeExponent"
                min="1.0"
                max="5.0"
                step="0.1"
                class="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Higher values provide more precision at low volumes.
              </p>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-4">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >Clients</label
              >
              <!-- Clean Offline Button (in header) -->
              <button
                v-if="getOfflineClientsInGroup().length > 0"
                @click="removeOfflineClients"
                class="px-3 py-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors flex items-center gap-1.5 border border-orange-200 dark:border-orange-800"
              >
                <span class="mdi mdi-trash-can-outline text-sm"></span>
                Clean Offline ({{ getOfflineClientsInGroup().length }})
              </button>
            </div>

            <!-- Table Header -->
            <div
              class="flex items-center gap-3 px-3 pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700"
            >
              <div class="flex-1">Client</div>
              <div class="w-24 text-center">In Group</div>
              <div
                class="w-24 text-center flex items-center justify-center gap-1"
              >
                <Tooltip text="Link to group volume control">
                  <span class="inline-flex items-center gap-1 cursor-help">
                    Linked
                    <span class="mdi mdi-information-outline text-xs"></span>
                  </span>
                </Tooltip>
              </div>
            </div>

            <!-- Clients List -->
            <div class="max-h-64 overflow-y-auto">
              <div
                v-for="c in snapcast.filteredClients"
                :key="c.id"
                class="flex items-center gap-3 p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <!-- Client name and volume -->
                <div class="flex-1 min-w-0">
                  <div
                    class="font-medium text-gray-900 dark:text-white flex items-center gap-2"
                  >
                    <!-- Online/Offline Indicator -->
                    <span
                      class="w-2 h-2 rounded-full flex-shrink-0"
                      :class="
                        c.connected
                          ? 'bg-green-500'
                          : 'bg-gray-400 dark:bg-gray-600'
                      "
                    ></span>
                    <span class="break-words">
                      {{ c.config.name || c.host.name }}
                    </span>
                    <span
                      v-if="!c.connected"
                      class="ml-auto px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded flex-shrink-0"
                    >
                      Offline
                    </span>
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {{ c.config.volume.percent }}%
                  </div>
                </div>

                <!-- In Group checkbox -->
                <div class="w-24 flex justify-center">
                  <input
                    type="checkbox"
                    :value="c.id"
                    v-model="clientIds"
                    class="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    :disabled="!auth.permissions.canAssignClients"
                  />
                </div>

                <!-- Linked checkbox (only enabled if in group) -->
                <div class="w-24 flex justify-center">
                  <input
                    type="checkbox"
                    :value="c.id"
                    v-model="linkedClientIds"
                    :disabled="
                      !clientIds.includes(c.id) ||
                      !auth.permissions.canLinkClients
                    "
                    class="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <!-- Info message -->
            <div
              v-if="linkedClientIds.length > 0"
              class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
            >
              <p class="text-xs text-blue-700 dark:text-blue-300">
                <span class="mdi mdi-information text-sm"></span>
                {{ linkedClientIds.length }} client{{
                  linkedClientIds.length === 1 ? "" : "s"
                }}
                linked. Their volumes will adjust proportionally with the group
                volume control.
              </p>
            </div>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between"
        >
          <Tooltip text="Delete group">
            <button
              class="w-10 h-10 flex items-center justify-center rounded-full text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              @click="deleteGroup"
            >
              <span class="mdi mdi-delete text-xl"></span>
            </button>
          </Tooltip>
          <div class="flex gap-2">
            <Tooltip text="Cancel">
              <button
                class="w-10 h-10 flex items-center justify-center rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                @click="emit('close')"
              >
                <span class="mdi mdi-close text-xl"></span>
              </button>
            </Tooltip>
            <Tooltip text="Save Changes">
              <button
                class="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                @click="apply"
              >
                <span class="mdi mdi-check text-xl"></span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
