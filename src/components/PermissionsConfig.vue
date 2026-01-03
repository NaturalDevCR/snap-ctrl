<template>
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    @click.self="$emit('cancel')"
  >
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 transform transition-all"
      @click.stop
    >
      <div
        class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between"
      >
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">
          Configure Permissions
        </h3>
        <button
          @click="$emit('cancel')"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <span class="mdi mdi-close text-xl"></span>
        </button>
      </div>

      <div class="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
        <!-- Feature Permissions -->
        <div>
          <h4
            class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"
          >
            <span class="mdi mdi-shield-check-outline"></span>
            Feature Permissions
          </h4>
          <div class="space-y-3">
            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span class="font-medium text-gray-900 dark:text-white"
                >Allow Volume Adjustments</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.canAdjustVolumes"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span class="font-medium text-gray-900 dark:text-white"
                >Allow Renaming Groups</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.canRenameGroups"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span class="font-medium text-gray-900 dark:text-white"
                >Allow Renaming Clients</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.canRenameClients"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span class="font-medium text-gray-900 dark:text-white"
                >Allow Stream Selection</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.canSelectStream"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span class="font-medium text-gray-900 dark:text-white"
                >Allow Per-Source Volume Config</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.canConfigurePSV"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span class="font-medium text-gray-900 dark:text-white"
                >Allow Client Assignment</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.canAssignClients"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span class="font-medium text-gray-900 dark:text-white"
                >Allow Client Linking</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.canLinkClients"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>
          </div>
        </div>

        <!-- UI Visibility Permissions -->
        <div>
          <h4
            class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"
          >
            <span class="mdi mdi-eye-outline"></span>
            UI Visibility
          </h4>
          <div class="space-y-3">
            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span class="font-medium text-gray-900 dark:text-white"
                >Show Group Settings</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.showGroupSettings"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span class="font-medium text-gray-900 dark:text-white"
                >Show Client Settings</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.showClientSettings"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span class="font-medium text-gray-900 dark:text-white"
                >Show Group Filter</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.showGroupFilter"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span class="font-medium text-gray-900 dark:text-white"
                >Show Create Group</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.showCreateGroup"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span class="font-medium text-gray-900 dark:text-white"
                >Show Browser Player</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localPermissions.showBrowserPlayer"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>
          </div>
        </div>

        <!-- Entity Restrictions -->
        <div>
          <h4
            class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"
          >
            <span class="mdi mdi-filter-outline"></span>
            Access Restrictions
          </h4>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Leave empty to allow all. Select specific items to restrict access.
          </p>

          <div class="space-y-4">
            <!-- Allowed Groups -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Allowed Groups
                <span class="text-xs text-gray-500 dark:text-gray-400"
                  >({{ localPermissions.allowedGroups.length || "All" }})</span
                >
              </label>
              <div
                class="max-h-32 overflow-y-auto space-y-1 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <label
                  v-for="group in availableGroups"
                  :key="group.id"
                  class="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-slate-700 rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    :value="group.id"
                    v-model="localPermissions.allowedGroups"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span class="text-sm text-gray-900 dark:text-white">{{
                    getGroupDisplayName(group)
                  }}</span>
                </label>
                <div
                  v-if="availableGroups.length === 0"
                  class="text-sm text-gray-500 dark:text-gray-400 text-center py-2"
                >
                  No groups available
                </div>
              </div>
            </div>

            <!-- Allowed Sources -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Allowed Sources
                <span class="text-xs text-gray-500 dark:text-gray-400"
                  >({{ localPermissions.allowedSources.length || "All" }})</span
                >
              </label>
              <div
                class="max-h-32 overflow-y-auto space-y-1 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <label
                  v-for="source in availableSources"
                  :key="source.id"
                  class="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-slate-700 rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    :value="source.id"
                    v-model="localPermissions.allowedSources"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span class="text-sm text-gray-900 dark:text-white">{{
                    getSourceName(source)
                  }}</span>
                </label>
                <div
                  v-if="availableSources.length === 0"
                  class="text-sm text-gray-500 dark:text-gray-400 text-center py-2"
                >
                  No sources available
                </div>
              </div>
            </div>

            <!-- Allowed Clients -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Allowed Clients
                <span class="text-xs text-gray-500 dark:text-gray-400"
                  >({{ localPermissions.allowedClients.length || "All" }})</span
                >
              </label>
              <div
                class="max-h-32 overflow-y-auto space-y-1 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <label
                  v-for="client in availableClients"
                  :key="client.id"
                  class="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-slate-700 rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    :value="client.id"
                    v-model="localPermissions.allowedClients"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span class="text-sm text-gray-900 dark:text-white">{{
                    client.config.name || client.host.name
                  }}</span>
                </label>
                <div
                  v-if="availableClients.length === 0"
                  class="text-sm text-gray-500 dark:text-gray-400 text-center py-2"
                >
                  No clients available
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3"
      >
        <button
          class="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
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

const props = defineProps<{
  initialPermissions: AuthPermissions;
}>();

const emit = defineEmits<{
  save: [permissions: AuthPermissions];
  cancel: [];
}>();

const snapcast = useSnapcastStore();

const localPermissions = ref<AuthPermissions>({ ...props.initialPermissions });

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

function getSourceName(source: { uri: any; id: string }): string {
  const uri = source.uri;
  if (!uri) return source.id;

  if (typeof uri === "string") {
    const q = uri.split("?")[1] || "";
    const params = new URLSearchParams(q);
    return params.get("name") || uri;
  }

  if (typeof uri === "object") {
    const query = uri.query;
    if (typeof query === "string") {
      const params = new URLSearchParams(query);
      return params.get("name") || (uri.path ?? source.id);
    }
    if (query && typeof query === "object") {
      return query.name || (uri.path ?? source.id);
    }
    return uri.path ?? source.id;
  }
  return source.id;
}

// Calculate group display name (same logic as main UI)
function getGroupDisplayName(group: { id: string; name: string }): string {
  // Prioritize custom name if set
  if (group.name && group.name.trim().length > 0) return group.name;

  // Find the group in snapcast store to get stream info
  const fullGroup = snapcast.groups.find((g) => g.id === group.id);
  if (!fullGroup) return `Group ${group.id.substring(0, 8)}`;

  // Try to use stream name
  const stream = snapcast.streams.find((s) => s.id === fullGroup.stream_id);
  if (stream) {
    const streamName = getStreamName(stream);
    if (streamName) return streamName;
  }

  // Fall back to first client name or client count
  if (fullGroup.clients && fullGroup.clients.length > 0) {
    const first = fullGroup.clients[0];
    if (first?.config?.name) return `${first.config.name} Group`;
    return `${fullGroup.clients.length} Clients`;
  }

  return `Group ${group.id.substring(0, 8)}`;
}

function getStreamName(stream: { id: string; uri: any }): string {
  const uri = stream.uri;
  if (!uri) return stream.id;

  if (typeof uri === "string") {
    const q = uri.split("?")[1] || "";
    const params = new URLSearchParams(q);
    return params.get("name") || uri;
  }

  if (typeof uri === "object") {
    const query = uri.query;
    if (typeof query === "string") {
      const params = new URLSearchParams(query);
      return params.get("name") || (uri.path ?? stream.id);
    }
    if (query && typeof query === "object") {
      return query.name || (uri.path ?? stream.id);
    }
    return uri.path ?? stream.id;
  }
  return stream.id;
}

function handleSave() {
  emit("save", localPermissions.value);
}
</script>
