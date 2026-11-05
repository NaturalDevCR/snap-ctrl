<template>
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--scrim)] backdrop-blur-sm"
    @click.self="$emit('cancel')"
  >
    <div
      class="bg-[var(--surface-1)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] overflow-hidden border border-[var(--border)] transform transition-all"
      @click.stop
    >
      <div
        class="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between"
      >
        <h3 class="text-lg font-bold text-[var(--text-primary)]">
          Configure Permissions
        </h3>
        <button
          @click="$emit('cancel')"
          aria-label="Close"
          class="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <span class="mdi mdi-close text-xl"></span>
        </button>
      </div>

      <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar max-h-[calc(90dvh-140px)]">
        <!-- Feature Permissions -->
        <div>
          <h4
            class="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2"
          >
            <span class="mdi mdi-shield-check-outline"></span>
            Feature Permissions
          </h4>
          <div class="space-y-3">
            <label
              class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--border)] transition-colors"
            >
              <span class="font-medium text-[var(--text-primary)]"
                >Allow Volume Adjustments</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.canAdjustVolumes"
                  class="sr-only peer"
                />
                <div
                  class="app-toggle"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--border)] transition-colors"
            >
              <span class="font-medium text-[var(--text-primary)]"
                >Allow Renaming Zones</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.canRenameGroups"
                  class="sr-only peer"
                />
                <div
                  class="app-toggle"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--border)] transition-colors"
            >
              <span class="font-medium text-[var(--text-primary)]"
                >Allow Renaming Speakers</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.canRenameClients"
                  class="sr-only peer"
                />
                <div
                  class="app-toggle"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--border)] transition-colors"
            >
              <span class="font-medium text-[var(--text-primary)]"
                >Allow Source Selection</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.canSelectStream"
                  class="sr-only peer"
                />
                <div
                  class="app-toggle"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--border)] transition-colors"
            >
              <span class="font-medium text-[var(--text-primary)]"
                >Allow Per-Source Volume Config</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.canConfigurePSV"
                  class="sr-only peer"
                />
                <div
                  class="app-toggle"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--border)] transition-colors"
            >
              <span class="font-medium text-[var(--text-primary)]"
                >Allow Speaker Assignment</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.canAssignClients"
                  class="sr-only peer"
                />
                <div
                  class="app-toggle"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--border)] transition-colors"
            >
              <span class="font-medium text-[var(--text-primary)]"
                >Allow Speaker Linking</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.canLinkClients"
                  class="sr-only peer"
                />
                <div
                  class="app-toggle"
                ></div>
              </div>
            </label>
          </div>
        </div>

        <!-- UI Visibility Permissions -->
        <div>
          <h4
            class="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2"
          >
            <span class="mdi mdi-eye-outline"></span>
            UI Visibility
          </h4>
          <div class="space-y-3">
            <label
              class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--border)] transition-colors"
            >
              <span class="font-medium text-[var(--text-primary)]"
                >Show Zone Settings</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.showGroupSettings"
                  class="sr-only peer"
                />
                <div
                  class="app-toggle"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--border)] transition-colors"
            >
              <span class="font-medium text-[var(--text-primary)]"
                >Show Speaker Settings</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.showClientSettings"
                  class="sr-only peer"
                />
                <div
                  class="app-toggle"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--border)] transition-colors"
            >
              <span class="font-medium text-[var(--text-primary)]"
                >Show Manage Zones</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.showGroupFilter"
                  class="sr-only peer"
                />
                <div
                  class="app-toggle"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--border)] transition-colors"
            >
              <span class="font-medium text-[var(--text-primary)]"
                >Show Add Zone</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.showCreateGroup"
                  class="sr-only peer"
                />
                <div
                  class="app-toggle"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--border)] transition-colors"
            >
              <span class="font-medium text-[var(--text-primary)]"
                >Show Browser Player</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.showBrowserPlayer"
                  class="sr-only peer"
                />
                <div
                  class="app-toggle"
                ></div>
              </div>
            </label>
          </div>
        </div>

        <!-- Entity Restrictions -->
        <div>
          <h4
            class="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2"
          >
            <span class="mdi mdi-filter-outline"></span>
            Access Restrictions
          </h4>
          <p class="text-xs text-[var(--text-tertiary)] mb-4">
            Leave empty to allow all. Select specific items to restrict access.
          </p>

          <div class="space-y-4">
            <!-- Allowed Groups -->
            <div>
              <label
                class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
              >
                Allowed Zones
                <span class="text-xs text-[var(--text-tertiary)]"
                  >({{ localPermissions.allowedGroups.length || "All" }})</span
                >
              </label>
              <div
                class="max-h-32 overflow-y-auto custom-scrollbar space-y-1 p-2 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]"
              >
                <label
                  v-for="group in availableGroups"
                  :key="group.id"
                  class="flex items-center gap-2 p-2 min-h-11 hover:bg-[var(--surface-1)] rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    :value="group.id"
                    v-model="localPermissions.allowedGroups"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span class="text-sm text-[var(--text-primary)]">{{
                    getGroupName(group)
                  }}</span>
                </label>
                <div
                  v-if="availableGroups.length === 0"
                  class="text-sm text-[var(--text-tertiary)] text-center py-2"
                >
                  No zones available
                </div>
              </div>
            </div>

            <!-- Allowed Sources -->
            <div>
              <label
                class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
              >
                Allowed Sources
                <span class="text-xs text-[var(--text-tertiary)]"
                  >({{ localPermissions.allowedSources.length || "All" }})</span
                >
              </label>
              <div
                class="max-h-32 overflow-y-auto custom-scrollbar space-y-1 p-2 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]"
              >
                <label
                  v-for="source in availableSources"
                  :key="source.id"
                  class="flex items-center gap-2 p-2 min-h-11 hover:bg-[var(--surface-1)] rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    :value="source.id"
                    v-model="localPermissions.allowedSources"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span class="text-sm text-[var(--text-primary)]">{{
                    getSourceName(source)
                  }}</span>
                </label>
                <div
                  v-if="availableSources.length === 0"
                  class="text-sm text-[var(--text-tertiary)] text-center py-2"
                >
                  No sources available
                </div>
              </div>
            </div>

            <!-- Allowed Clients -->
            <div>
              <label
                class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
              >
                Allowed Speakers
                <span class="text-xs text-[var(--text-tertiary)]"
                  >({{ localPermissions.allowedClients.length || "All" }})</span
                >
              </label>
              <div
                class="max-h-32 overflow-y-auto custom-scrollbar space-y-1 p-2 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]"
              >
                <label
                  v-for="client in availableClients"
                  :key="client.id"
                  class="flex items-center gap-2 p-2 min-h-11 hover:bg-[var(--surface-1)] rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    :value="client.id"
                    v-model="localPermissions.allowedClients"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span class="text-sm text-[var(--text-primary)]">{{
                    client.config.name || client.host.name
                  }}</span>
                </label>
                <div
                  v-if="availableClients.length === 0"
                  class="text-sm text-[var(--text-tertiary)] text-center py-2"
                >
                  No speakers available
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="px-6 py-4 bg-[var(--surface-2)] border-t border-[var(--border)] flex justify-end gap-3"
      >
        <button
          class="px-4 min-h-11 text-[var(--text-secondary)] font-medium hover:bg-[var(--border)] rounded-lg transition-colors"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="px-4 min-h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          @click="handleSave"
        >
          Save Permissions
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import type { AuthPermissions } from "@/stores/auth";
import { getStreamName } from "@/utils/stream-name";
import { getGroupDisplayName } from "@/utils/group-name";
import { useEscapeToClose } from "@/composables/useEscapeToClose";

const props = defineProps<{
  initialPermissions: AuthPermissions;
}>();

const emit = defineEmits<{
  save: [permissions: AuthPermissions];
  cancel: [];
}>();

// Unlike most modals here, this one is created/destroyed by the parent's
// v-if rather than toggling an internal `open` prop — its whole mounted
// lifetime is "open", so it just registers for as long as it exists.
useEscapeToClose(
  () => true,
  () => emit("cancel")
);

const snapcast = useSnapcastStore();

const localPermissions = ref<AuthPermissions>({
  ...props.initialPermissions,
});

// Make these computed so they update reactively when snapcast data changes
const availableGroups = computed(() => {
  return snapcast.groups.map((g) => ({
    id: g.id,
    name: g.name,
  }));
});

const availableSources = computed(() => {
  return snapcast.streams.map((s) => ({
    id: s.id,
    uri: s.uri,
  }));
});

const availableClients = computed(() => {
  return snapcast.clients.map((c) => ({
    id: c.id,
    config: { name: c.config.name },
    host: { name: c.host.name },
  }));
});

function getSourceName(source: { uri: unknown; id: string }): string {
  return getStreamName(source);
}

function getGroupName(group: { id: string; name: string }): string {
  const fullGroup = snapcast.groups.find((g) => g.id === group.id);
  if (!fullGroup) return `Zone ${group.id.substring(0, 8)}`;
  return getGroupDisplayName(fullGroup, snapcast.streams);
}

function handleSave() {
  emit("save", localPermissions.value);
}
</script>
