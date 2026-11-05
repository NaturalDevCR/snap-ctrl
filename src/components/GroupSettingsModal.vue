<script setup lang="ts">
import { ref, watch } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import { getStreamName } from "@/utils/stream-name";
import { logger } from "@/utils/logger";
import Tooltip from "@/components/Tooltip.vue";
import AppDialog from "@/components/AppDialog.vue";
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
  const offline = getOfflineClientsInGroup();
  if (offline.length === 0) return;

  // Server.DeleteClient permanently forgets the client (name, volume,
  // latency) — it isn't just "hide until it reconnects". One misplaced tap
  // here on a shared/kiosk device wipes that config for good.
  const noun = offline.length === 1 ? "speaker" : "speakers";
  if (
    !window.confirm(
      `Permanently remove ${offline.length} offline ${noun} from this zone? This forgets their saved name and volume — they'll show up as a brand-new speaker if they reconnect.`
    )
  ) {
    return;
  }

  for (const client of offline) {
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

  // No undo: this empties the group (its clients fall back to
  // Snapserver's default group) and permanently deletes any of its
  // clients that are currently offline. A single accidental tap — easy on
  // a shared/kiosk device — is otherwise enough to do both.
  if (
    !window.confirm(
      `Delete "${name.value || group.name || "this zone"}"? Its speakers will be removed from the zone, and any offline speakers in it will be permanently forgotten.`
    )
  ) {
    return;
  }

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
  <AppDialog
    :open="props.open"
    title="Zone settings"
    size="lg"
    @close="emit('close')"
  >
    <div class="space-y-6">
      <div>
        <label
          class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
          >Zone name</label
        >
        <input
          class="w-full px-4 py-2.5 min-h-11 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
          v-model.trim="name"
          placeholder="Custom zone name"
          :disabled="!auth.permissions.canRenameGroups"
        />
      </div>

      <div v-if="auth.permissions.canSelectStream">
        <label
          class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
          >Source</label
        >
        <div class="relative">
          <select
            v-model="streamId"
            class="w-full pl-4 pr-10 py-2.5 min-h-11 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-[var(--text-primary)]"
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
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
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
          class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]"
        >
          <div class="flex flex-col">
            <span class="font-medium text-[var(--text-primary)]"
              >Per-Source Volume</span
            >
            <span class="text-xs text-[var(--text-tertiary)]"
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
              class="app-toggle"
            ></div>
          </div>
        </div>
      </label>

      <!-- Volume Control Mode -->
      <div v-if="auth.permissions.canConfigurePSV" class="space-y-4 mb-6">
        <div>
          <label
            class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >Volume Control Mode</label
          >
          <div class="relative">
            <select
              v-model="volumeMode"
              class="w-full pl-4 pr-10 py-2.5 min-h-11 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-[var(--text-primary)]"
            >
              <option value="global">
                Global Default ({{ settings.globalVolumeControlMode }})
              </option>
              <option value="linear">Linear</option>
              <option value="nonlinear">Non-Linear</option>
            </select>
            <span
              class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
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
            <label class="text-sm font-medium text-[var(--text-secondary)]"
              >Exponent (Curve)</label
            >
            <span
              class="text-xs font-mono bg-[var(--surface-2)] px-2 py-0.5 rounded text-[var(--text-secondary)]"
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
            class="app-range"
          />
          <p class="mt-1 text-xs text-[var(--text-tertiary)]">
            Higher values provide more precision at low volumes.
          </p>
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between mb-4">
          <label
            class="block text-sm font-medium text-[var(--text-secondary)]"
            >Speakers</label
          >
          <!-- Clean Offline Button (in header) -->
          <button
            v-if="getOfflineClientsInGroup().length > 0"
            @click="removeOfflineClients"
            class="px-3 py-1.5 min-h-11 text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors flex items-center gap-1.5 border border-orange-200 dark:border-orange-800"
          >
            <span class="mdi mdi-trash-can-outline text-sm"></span>
            Clean Offline ({{ getOfflineClientsInGroup().length }})
          </button>
        </div>

        <!-- Table Header -->
        <div
          class="flex items-center gap-3 px-3 pb-2 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide border-b border-[var(--border)]"
        >
          <div class="flex-1 min-w-0">Speaker</div>
          <div class="w-14 sm:w-24 shrink-0 text-center">In Zone</div>
          <div
            class="w-14 sm:w-24 shrink-0 text-center flex items-center justify-center gap-1"
          >
            <Tooltip text="Link to zone volume control">
              <span class="inline-flex items-center gap-1 cursor-help">
                Linked
                <span class="hidden sm:inline mdi mdi-information-outline text-xs"></span>
              </span>
            </Tooltip>
          </div>
        </div>

        <!-- Clients List -->
        <div>
          <div
            v-for="c in snapcast.filteredClients"
            :key="c.id"
            class="flex items-center gap-3 p-3 border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <!-- Client name and volume -->
            <div class="flex-1 min-w-0">
              <div
                class="font-medium text-[var(--text-primary)] flex flex-wrap items-center gap-x-2 gap-y-1"
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
                <span class="break-words min-w-0">
                  {{ c.config.name || c.host.name }}
                </span>
                <span
                  v-if="!c.connected"
                  class="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded flex-shrink-0"
                >
                  Offline
                </span>
              </div>
              <div class="text-xs text-[var(--text-tertiary)] truncate">
                {{ c.config.volume.percent }}%
              </div>
            </div>

            <!-- In Group checkbox -->
            <div class="w-14 sm:w-24 shrink-0 flex justify-center">
              <label
                class="min-h-11 min-w-11 flex items-center justify-center cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="c.id"
                  v-model="clientIds"
                  class="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  :disabled="!auth.permissions.canAssignClients"
                />
              </label>
            </div>

            <!-- Linked checkbox (only enabled if in group) -->
            <div class="w-14 sm:w-24 shrink-0 flex justify-center">
              <label
                class="min-h-11 min-w-11 flex items-center justify-center cursor-pointer"
              >
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
              </label>
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
            {{ linkedClientIds.length }} speaker{{
              linkedClientIds.length === 1 ? "" : "s"
            }}
            linked. Their volumes will adjust proportionally with the zone
            volume control.
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="w-full flex items-center justify-between gap-3">
        <button
          class="px-3 py-2 min-h-11 inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          @click="deleteGroup"
        >
          <span class="mdi mdi-delete" aria-hidden="true"></span>
          Delete zone
        </button>
        <div class="flex gap-3">
          <button
            class="px-4 py-2 min-h-11 text-[var(--text-secondary)] font-medium hover:bg-[var(--surface-2)] rounded-lg transition-colors"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 min-h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
            @click="apply"
          >
            Save
          </button>
        </div>
      </div>
    </template>
  </AppDialog>
</template>
