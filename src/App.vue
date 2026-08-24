<template>
  <div
    id="app"
    class="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300"
  >
    <Toast />

    <!-- Setup Passcode Flow -->
    <SetupPasscode
      v-if="showingPasscodeSetup || (auth.requiresSetup && !showingPermissionsSetup)"
      title="Enable Authentication"
      description="Create a passcode to protect settings and permissions."
      submit-label="Enable Authentication"
      :can-cancel="!auth.requiresSetup"
      @complete="handlePasscodeSetup"
      @cancel="handlePasscodeSetupCancel"
    />

    <!-- Unlock Prompt (when locked) -->
    <UnlockPrompt
      v-if="auth.isAuthEnabled && auth.isLocked && !auth.requiresSetup"
      :can-cancel="false"
      @unlock="auth.unlock()"
    />

    <!-- Main App UI (only shown when authenticated and unlocked) -->
    <!-- During initial setup: show connection UI but not permissions until connected -->
    <template v-if="auth.isAuthenticated && !auth.isLocked">
      <!-- Initial Permissions Configuration (after first connection) -->
      <PermissionsConfig
        v-if="showingPermissionsSetup && snapcast.isConnected"
        :initial-permissions="auth.permissions"
        @save="handleInitialPermissionsSetup"
        @cancel="() => {}"
      />

      <!-- Change Permissions Modal -->
      <PermissionsConfig
        v-if="showingPermissionsChange"
        :initial-permissions="auth.permissions"
        @save="handlePermissionsChange"
        @cancel="showingPermissionsChange = false"
      />

      <!-- Unlock for Permissions Change -->
      <UnlockPrompt
        v-if="showingUnlockForPermissions"
        :can-cancel="true"
        @unlock="handleUnlockForPermissions"
        @cancel="showingUnlockForPermissions = false"
      />

      <header
        class="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-gray-800 transition-all duration-300 shadow-sm"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16 gap-4">
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="SnapCtrl Logo"
                  class="w-8 h-8 object-contain"
                />
                <h1
                  class="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 hidden sm:block"
                >
                  Snapcast Control
                </h1>
                <h1
                  class="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 sm:hidden"
                >
                  SnapCtrl
                </h1>
              </div>

              <div
                class="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-300"
                :class="{
                  'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30':
                    snapcast.isConnected,
                  'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30':
                    snapcast.isConnecting,
                  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/30':
                    connectionStatus === 'setup',
                  'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700':
                    connectionStatus === 'disconnected',
                }"
              >
                <span class="relative flex h-2 w-2">
                  <span
                    v-if="snapcast.isConnecting"
                    class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"
                  ></span>
                  <span
                    class="relative inline-flex rounded-full h-2 w-2 bg-current"
                  ></span>
                </span>
                <span v-if="connectionStatus === 'connecting'">Connecting...</span>
                <span v-else-if="connectionStatus === 'connected'">Connected</span>
                <span v-else-if="connectionStatus === 'setup'">Setup needed</span>
                <span v-else>Disconnected</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <Tooltip text="Server Info" position="bottom">
                <button
                  v-if="snapcast.isConnected"
                  @click="showServerInfo = true"
                  class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
                >
                  <span class="mdi mdi-information-outline text-xl"></span>
                </button>
              </Tooltip>

              <Tooltip text="Settings" position="bottom">
                <button
                  @click="openAppSettings"
                  class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
                >
                  <span class="mdi mdi-cog text-xl"></span>
                </button>
              </Tooltip>
            </div>
          </div>

          <!-- Browser Player in Header when connected -->
          <div
            v-if="
              snapcast.isConnected &&
              !isMobile &&
              auth.permissions.showBrowserPlayer
            "
            class="py-3 border-t border-gray-200 dark:border-gray-800"
          >
            <BrowserPlayer />
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <ConnectionPanel
          v-if="!snapcast.isConnected && !snapcast.isConnecting"
          :showing-permissions-setup="showingPermissionsSetup"
        />

        <div
          v-else-if="snapcast.isConnecting"
          class="flex flex-col items-center justify-center min-h-[60vh]"
        >
          <LoadingSpinner
            size="60px"
            label="Connecting to Snapcast server..."
          />
        </div>

        <ZoneGrid
          v-else
          @zone-control="openZoneControl"
          @group-settings="openGroupSettings"
          @create-group="openCreateGroup"
        />
      </main>

      <!-- Footer -->
      <footer
        v-if="snapcast.isConnected"
        class="mt-8 py-6 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>
            Made with <span class="text-red-500">♥</span> by
            <a
              href="https://github.com/jdavidoa91"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >Josue O.A</a
            >
            /
            <a
              href="https://github.com/NaturalDevCR"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >NaturalDevCR</a
            >
            <span class="opacity-50 ml-2">v{{ appVersion }}</span>
          </p>
        </div>
      </footer>

      <!-- Zone Control Modal -->
      <ZoneControlModal
        v-if="zoneControlGroup"
        :is-open="!!zoneControlGroup"
        :group-id="zoneControlGroup!.id"
        :group-name="getGroupName(zoneControlGroup!)"
        :stream-id="zoneControlGroup!.stream_id"
        :streams="displayStreams"
        :stream-name="getStreamName(snapcast.streams.find(s => s.id === zoneControlGroup!.stream_id))"
        :stream-status-icon="getStreamStatusIcon(snapcast.streams, zoneControlGroup!.stream_id)"
        :stream-status-color="getStreamStatusColor(snapcast.streams, zoneControlGroup!.stream_id)"
        :volume="getGroupVolume(zoneControlGroup!.id)"
        :is-muted="zoneControlGroup!.muted"
        :clients="zoneControlGroup!.clients"
        :linked-client-ids="settings.groupVolumeLinks[zoneControlGroup!.id]?.linkedClientIds || []"
        :show-settings-button="auth.permissions.showGroupSettings"
        :show-client-settings-button="auth.permissions.showClientSettings"
        :can-select-stream="auth.permissions.canSelectStream"
        @close="closeZoneControl"
        @update:volume="setGroupVolume(zoneControlGroup!.id, $event)"
        @adjust-volume="adjustGroupVolume(zoneControlGroup!.id, $event)"
        @toggle-mute="toggleGroupMute(zoneControlGroup!)"
        @update-client-volume="setVolume"
        @toggle-client-mute="toggleClientMute"
        @open-settings="handleOpenSettingsFromZoneControl"
        @open-client-settings="openClientSettings"
        @open-client-details="openClientDetails"
        @update:streamId="changeGroupStream(zoneControlGroup!, $event)"
      />

      <!-- Group Settings Modal -->
      <GroupSettingsModal
        :open="groupSettingsModal.open"
        :group="groupSettingsModal.group"
        @close="closeGroupSettings"
      />

      <!-- Client Details Modal -->
      <ClientDetailsModal
        :open="clientDetailsModal.open"
        :client="clientDetailsModal.client"
        @close="closeClientDetails"
      />

      <!-- Client Settings Modal -->
      <ClientSettingsModal
        :open="clientModal.open"
        :client="clientModal.client"
        @close="closeClientSettings"
      />

      <!-- App Settings Modal -->
      <AppSettingsModal
        :open="appModal.open"
        @close="closeAppSettings"
        @enable-authentication="handleEnableAuthentication"
        @disable-authentication="handleDisableAuthentication"
        @change-permissions="promptForPermissionsChange"
      />

      <!-- Create Group Modal -->
      <CreateGroupModal
        :open="createGroupModal.open"
        @close="closeCreateGroup"
      />
    </template>

    <!-- Server Info Modal -->
    <ServerInfo
      v-if="showServerInfo"
      :is-open="showServerInfo"
      @close="showServerInfo = false"
    />

    <!-- End Main App UI -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useSnapcastStore } from "./stores/snapcast";
import { useSettingsStore } from "./stores/settings";
import { useAuthStore } from "./stores/auth";
import type { Client, Group } from "./stores/snapcast";
import type { AuthPermissions } from "./stores/auth";
import { getStreamName } from "@/utils/stream-name";
import { getGroupDisplayName } from "@/utils/group-name";
import {
  getStreamStatusColor,
  getStreamStatusIcon,
} from "@/utils/stream-status";
import { averageGroupVolume } from "@/utils/group-volume";
import BrowserPlayer from "@/components/BrowserPlayer.vue";
import Toast from "@/components/Toast.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import Tooltip from "@/components/Tooltip.vue";
import ConnectionPanel from "@/components/ConnectionPanel.vue";
import ZoneGrid from "@/components/ZoneGrid.vue";
import ZoneControlModal from "@/components/ZoneControlModal.vue";
import GroupSettingsModal from "@/components/GroupSettingsModal.vue";
import ClientDetailsModal from "@/components/ClientDetailsModal.vue";
import ClientSettingsModal from "@/components/ClientSettingsModal.vue";
import AppSettingsModal from "@/components/AppSettingsModal.vue";
import CreateGroupModal from "@/components/CreateGroupModal.vue";
import SetupPasscode from "@/components/SetupPasscode.vue";
import PermissionsConfig from "@/components/PermissionsConfig.vue";
import UnlockPrompt from "@/components/UnlockPrompt.vue";
import ServerInfo from "@/components/ServerInfo.vue";
import pkg from "../package.json";

const snapcast = useSnapcastStore();
const settings = useSettingsStore();
const auth = useAuthStore();

// UI State
const showServerInfo = ref(false);

// Setup flow state
const showingPasscodeSetup = ref(false);
const showingPermissionsSetup = ref(false);
const tempPasscode = ref("");
const showingPermissionsChange = ref(false);
const showingUnlockForPermissions = ref(false);

const appVersion = computed(() => pkg.version || "0.0.0");
const connectionStatus = computed(() => {
  if (snapcast.isConnected) return "connected";
  if (snapcast.isConnecting) return "connecting";
  if (snapcast.connectionError) return "setup";
  return "disconnected";
});

// Zone Control Modal State
const zoneControlGroupId = ref<string | null>(null);

const zoneControlGroup = computed(() => {
  if (!zoneControlGroupId.value) return null;
  return snapcast.groups.find((g) => g.id === zoneControlGroupId.value) || null;
});

function openZoneControl(group: Group) {
  zoneControlGroupId.value = group.id;
}

function closeZoneControl() {
  zoneControlGroupId.value = null;
}

function handleOpenSettingsFromZoneControl() {
  // Don't close zone control to allow stacking (dialog over dialog)
  if (zoneControlGroup.value) {
    openGroupSettings(zoneControlGroup.value);
  }
}

function getGroupName(group: Group): string {
  return getGroupDisplayName(group, snapcast.streams);
}

const displayStreams = computed(() => {
  return snapcast.streams.map((stream) => ({
    id: stream.id,
    name: getStreamName(stream),
  }));
});

function toggleGroupMute(group: Group) {
  snapcast.setGroupMute(group.id, !group.muted);
}

function changeGroupStream(group: Group, streamId: string) {
  if (!streamId) return;
  snapcast.setGroupStream(group.id, streamId);
}

function toggleClientMute(client: Client) {
  snapcast.setClientVolume(
    client.id,
    client.config.volume.percent,
    !client.config.volume.muted
  );
}

function setVolume(client: Client, volume: number) {
  snapcast.setClientVolume(client.id, volume, client.config.volume.muted);
}

function getGroupVolume(groupId: string): number {
  const linkedIds = settings.groupVolumeLinks[groupId]?.linkedClientIds || [];
  const group = snapcast.groups.find((g) => g.id === groupId);
  return averageGroupVolume(group, linkedIds);
}

/**
 * Set group volume (adjusts all linked clients proportionally)
 */
async function setGroupVolume(groupId: string, groupVolume: number) {
  const linkConfig = settings.groupVolumeLinks[groupId];
  const linkedIds = linkConfig?.linkedClientIds || [];

  if (linkedIds.length === 0) return;

  // Get reference volumes from settings (or current volumes as fallback)
  const referenceVolumes = linkConfig?.referenceVolumes || {};

  await snapcast.setGroupVolumeProportional(
    groupId,
    groupVolume,
    linkedIds,
    referenceVolumes
  );
}

/**
 * Adjust group volume by delta
 */
async function adjustGroupVolume(groupId: string, delta: number) {
  const currentVolume = getGroupVolume(groupId);
  const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
  await setGroupVolume(groupId, newVolume);
}

// Group settings modal state
const groupSettingsModal = ref<{
  open: boolean;
  group: Group | null;
}>({ open: false, group: null });

function openGroupSettings(group: Group) {
  groupSettingsModal.value = { open: true, group };
}

function closeGroupSettings() {
  groupSettingsModal.value.open = false;
}

// Client modal state
const clientModal = ref<{
  open: boolean;
  client: Client | null;
}>({ open: false, client: null });

function openClientSettings(client: Client) {
  clientModal.value = { open: true, client };
}

function closeClientSettings() {
  clientModal.value.open = false;
}

// Client Details Modal
const clientDetailsModal = ref<{
  open: boolean;
  client: Client | null;
}>({ open: false, client: null });

function openClientDetails(client: Client) {
  clientDetailsModal.value = { open: true, client };
}

function closeClientDetails() {
  clientDetailsModal.value.open = false;
}

// Create group modal state
const createGroupModal = ref<{ open: boolean }>({ open: false });

function openCreateGroup() {
  createGroupModal.value.open = true;
}

function closeCreateGroup() {
  createGroupModal.value.open = false;
}

// App settings modal
const appModal = ref<{ open: boolean }>({ open: false });

function openAppSettings() {
  appModal.value.open = true;
}

function closeAppSettings() {
  appModal.value.open = false;
}

// Authentication handlers
async function handlePasscodeSetup(passcode: string) {
  tempPasscode.value = passcode;
  await auth.setPasscode(passcode);
  showingPasscodeSetup.value = false;
  // Set flag to show permissions config after connecting to server
  showingPermissionsSetup.value = true;
}

function handlePasscodeSetupCancel() {
  showingPasscodeSetup.value = false;
  if (auth.requiresSetup) {
    auth.disableAuthentication();
  }
}

function handleInitialPermissionsSetup(permissions: AuthPermissions) {
  auth.updatePermissions(permissions);
  showingPermissionsSetup.value = false;
  tempPasscode.value = "";
  // Now authenticated, can connect if auto-connect is enabled
  if (settings.autoConnect) {
    snapcast.connect();
  }
}

async function handlePermissionsChange(permissions: AuthPermissions) {
  auth.updatePermissions(permissions);
  showingPermissionsChange.value = false;
}

function promptForPermissionsChange() {
  if (!auth.isAuthEnabled) {
    handleEnableAuthentication();
    return;
  }

  // Show unlock prompt first
  showingUnlockForPermissions.value = true;
}

function handleEnableAuthentication() {
  closeAppSettings();
  showingPasscodeSetup.value = true;
}

function handleDisableAuthentication() {
  auth.disableAuthentication();
  showingPasscodeSetup.value = false;
  showingPermissionsSetup.value = false;
  showingPermissionsChange.value = false;
  showingUnlockForPermissions.value = false;
  tempPasscode.value = "";
  closeAppSettings();
}

function handleUnlockForPermissions() {
  showingUnlockForPermissions.value = false;
  showingPermissionsChange.value = true;
  closeAppSettings();
}

const isMobile = ref(window.innerWidth < 768);

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

// Mobile browsers routinely suspend background tabs without firing the
// WebSocket's onclose promptly (or at all until the OS reclaims the
// socket) — a phone that sleeps and wakes back up can sit there reporting
// "Connected" over a dead socket. Nudge a reconnect whenever the tab comes
// back or the OS reports network back online; both paths are no-ops when
// the connection is already healthy (connect() tears down any live client
// first, and getServerStatus() just re-fetches over it).
function handleWake() {
  if (document.hidden) return;
  if (!auth.isAuthenticated || auth.isLocked || !settings.autoConnect) return;
  if (snapcast.isConnected) {
    snapcast.getServerStatus();
  } else if (!snapcast.isConnecting) {
    snapcast.connect();
  }
}

onMounted(async () => {
  window.addEventListener("resize", updateIsMobile);
  document.addEventListener("visibilitychange", handleWake);
  window.addEventListener("online", handleWake);
  window.addEventListener("focus", handleWake);

  // host is already hydrated by pinia-plugin-persistedstate from snapcast.host
  if (auth.isAuthenticated && !auth.isLocked && settings.autoConnect) {
    snapcast.connect();
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", updateIsMobile);
  document.removeEventListener("visibilitychange", handleWake);
  window.removeEventListener("online", handleWake);
  window.removeEventListener("focus", handleWake);
  // Close connection when component is destroyed
  snapcast.disconnect();
});
</script>

<style scoped>
button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 20px;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.5);
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(107, 114, 128, 0.8);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.8);
}
</style>
