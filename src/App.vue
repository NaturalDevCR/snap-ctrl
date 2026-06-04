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

      <!-- Main App UI (only shown when authenticated and unlocked) -->
      <!-- <template v-if="auth.isAuthenticated && !auth.isLocked"> already opened above -->
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
        <div
          v-if="!snapcast.isConnected && !snapcast.isConnecting"
          class="grid min-h-[60vh] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
        >
          <section
            class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="border-b border-gray-100 p-6 dark:border-slate-800 sm:p-8">
              <div class="mb-6 flex items-center gap-3">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300"
                >
                  <span class="mdi mdi-cast-audio text-2xl"></span>
                </div>
                <div>
                  <p class="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                    Snapcast server
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Default target: localhost:1780
                  </p>
                </div>
              </div>

              <h2
                class="max-w-2xl text-3xl font-bold leading-tight text-gray-950 dark:text-white sm:text-4xl"
              >
                {{ connectionPanelTitle }}
              </h2>
              <p class="mt-3 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
                {{ connectionPanelDescription }}
              </p>
            </div>

            <div class="p-6 sm:p-8">
              <!-- Initial Setup Info -->
              <div
                v-if="showingPermissionsSetup"
                class="mb-6 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-800 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-200"
              >
                <div class="flex items-start gap-3">
                  <span
                    class="mdi mdi-information-outline shrink-0 text-xl"
                  ></span>
                  <div>
                    <p class="text-sm font-semibold">Initial setup</p>
                    <p class="mt-1 text-sm leading-6">
                      Connect to your server to load groups, sources, and
                      clients. You'll configure permissions after connecting.
                    </p>
                  </div>
                </div>
              </div>

              <div
                v-if="connectionFormMessage"
                class="mb-6 rounded-xl border p-4 text-sm"
                :class="
                  connectionFormTone === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200'
                    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
                "
                aria-live="polite"
              >
                <div class="flex items-start gap-3">
                  <span
                    class="mdi shrink-0 text-lg"
                    :class="
                      connectionFormTone === 'error'
                        ? 'mdi-alert-circle-outline'
                        : 'mdi-map-marker-question-outline'
                    "
                  ></span>
                  <span>{{ connectionFormMessage }}</span>
                </div>
              </div>

              <form class="space-y-5" @submit.prevent="updateHost">
                <!-- HA addon mode: show read-only Snapcast info, no manual host entry -->
                <div v-if="haSnapcastInfo">
                  <label
                    class="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200"
                  >
                    Home Assistant proxy
                  </label>
                  <div
                    class="flex min-h-12 items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
                  >
                    <span class="mdi mdi-home-assistant text-lg text-cyan-600 dark:text-cyan-300"></span>
                    <span>
                      Snapcast:
                      <span class="font-mono text-gray-900 dark:text-white">
                        {{ haSnapcastInfo }}
                      </span>
                      <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        via addon proxy
                      </span>
                    </span>
                  </div>
                </div>

                <div v-else>
                  <label
                    for="snapcast-host"
                    class="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200"
                  >
                    IP address or hostname
                  </label>
                  <div class="relative">
                    <span
                      class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      <span class="mdi mdi-server-network"></span>
                    </span>
                    <input
                      id="snapcast-host"
                      v-model="hostInput"
                      name="snapcast-host"
                      type="text"
                      inputmode="url"
                      autocomplete="off"
                      enterkeyhint="go"
                      aria-describedby="snapcast-host-help snapcast-host-error"
                      placeholder="192.168.1.42:1780 or snapcast.local:1780"
                      class="min-h-12 w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-base text-gray-950 outline-none transition-all placeholder:text-gray-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-cyan-400"
                      @input="connectHostError = ''"
                    />
                  </div>
                  <p
                    id="snapcast-host-help"
                    class="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400"
                  >
                    Include the Snapcast JSON-RPC port. The default is
                    <span class="font-mono text-gray-700 dark:text-gray-200">
                      1780
                    </span>.
                  </p>
                  <p
                    v-if="connectHostError"
                    id="snapcast-host-error"
                    class="mt-2 text-sm font-medium text-red-700 dark:text-red-300"
                  >
                    {{ connectHostError }}
                  </p>
                </div>

                <div
                  v-if="hostSuggestions.length > 0 && !haSnapcastInfo"
                  class="flex flex-wrap gap-2"
                >
                  <button
                    v-for="suggestion in hostSuggestions"
                    :key="suggestion"
                    type="button"
                    class="rounded-lg border px-3 py-2 text-sm font-medium transition-all active:scale-[0.98]"
                    :class="
                      hostInput === suggestion
                        ? 'border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'
                    "
                    @click="useHostSuggestion(suggestion)"
                  >
                    {{ suggestion }}
                  </button>
                </div>

                <button
                  type="submit"
                  class="min-h-12 w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white shadow-sm shadow-cyan-950/10 transition-all hover:bg-cyan-500 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-cyan-500/25 dark:bg-cyan-500 dark:hover:bg-cyan-400"
                >
                  Connect to Snapcast
                </button>
              </form>
            </div>
          </section>

          <aside
            class="rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <h3 class="text-base font-semibold text-gray-950 dark:text-white">
              Where is Snapcast running?
            </h3>
            <div class="mt-5 space-y-4">
              <div class="flex gap-3">
                <span
                  class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-semibold text-cyan-700 dark:bg-slate-800 dark:text-cyan-300"
                >
                  1
                </span>
                <p class="text-sm leading-6 text-gray-600 dark:text-gray-300">
                  If this UI is installed on the same machine as Snapcast, keep
                  <span class="font-mono text-gray-800 dark:text-gray-100">
                    localhost:1780
                  </span>.
                </p>
              </div>
              <div class="flex gap-3">
                <span
                  class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-semibold text-cyan-700 dark:bg-slate-800 dark:text-cyan-300"
                >
                  2
                </span>
                <p class="text-sm leading-6 text-gray-600 dark:text-gray-300">
                  If Snapcast is on another device, use that device's LAN IP or
                  hostname.
                </p>
              </div>
              <div class="flex gap-3">
                <span
                  class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-semibold text-cyan-700 dark:bg-slate-800 dark:text-cyan-300"
                >
                  3
                </span>
                <p class="text-sm leading-6 text-gray-600 dark:text-gray-300">
                  Make sure port
                  <span class="font-mono text-gray-800 dark:text-gray-100">1780</span>
                  is reachable from this browser.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <div
          v-else-if="snapcast.isConnecting"
          class="flex flex-col items-center justify-center min-h-[60vh]"
        >
          <LoadingSpinner
            size="60px"
            label="Connecting to Snapcast server..."
          />
        </div>

        <div v-else class="space-y-8">
          <div
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <h2
              class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3"
            >
              <span
                class="mdi mdi-speaker-multiple text-blue-600 dark:text-blue-400"
              ></span>
              Audio Zones
            </h2>
            <div class="flex items-center gap-2">
              <Tooltip text="Create Group">
                <button
                  v-if="auth.permissions.showCreateGroup"
                  @click="openCreateGroup"
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
                  settings.showEmptyGroups
                    ? 'Hide empty groups'
                    : 'Show empty groups'
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
                    :class="
                      settings.showEmptyGroups ? 'mdi-eye' : 'mdi-eye-off'
                    "
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
                         <div class="flex items-center gap-1.5 text-xs truncate" :class="getStreamStatusColor(group.stream_id)">
                            <span class="mdi" :class="getStreamStatusIcon(group.stream_id)"></span>
                            <span>{{ getStreamName(snapcast.streams.find(s => s.id === group.stream_id) as any) }}</span>
                         </div>
                    </div>
                    
                      <!-- Quick Mute/Settings -->
                      <div class="flex items-center gap-1 shrink-0">
                         <Tooltip :text="group.muted ? 'Unmute Group' : 'Mute Group'">
                           <button
                              @click="toggleGroupMute(group)"
                              class="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                              :class="group.muted ? 'text-red-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
                            >
                              <span class="mdi" :class="group.muted ? 'mdi-volume-off' : 'mdi-volume-high'"></span>
                            </button>
                         </Tooltip>
                         <Tooltip v-if="auth.permissions.showGroupSettings" text="Group Settings">
                            <button
                              @click="openGroupSettings(group)"
                              class="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                              <span class="mdi mdi-cog"></span>
                            </button>
                         </Tooltip>
                      </div>
                  </div>
                </div>

                <!-- Summary Info -->
                 <div class="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                       <span class="flex items-center gap-1.5">
                           <span class="mdi mdi-speaker"></span>
                           {{ getDisplayClients(group).length }} Client{{ getDisplayClients(group).length !== 1 ? 's' : '' }}
                       </span>
                       <span class="flex items-center gap-1.5">
                           <span class="mdi mdi-volume-high"></span>
                           {{ getGroupVolume(group.id) }}%
                       </span>
                    </div>

                     <Tooltip text="Open Zone Control">
                       <button
                         @click="openZoneControl(group)"
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
              Make sure your Snapcast server is running and has clients
              connected.
            </p>
          </div>

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
        :stream-name="getStreamName(snapcast.streams.find(s => s.id === zoneControlGroup!.stream_id) as any)"
        :stream-status-icon="getStreamStatusIcon(zoneControlGroup!.stream_id)"
        :stream-status-color="getStreamStatusColor(zoneControlGroup!.stream_id)"
        :volume="Math.round(getGroupVolume(zoneControlGroup!.id))"
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
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="groupModal.open"
          class="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          @click.self="closeGroupSettings"
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
                @click="closeGroupSettings"
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
                  v-model.trim="groupModal.name"
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
                    v-model="groupModal.streamId"
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
                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
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
                      v-model="groupModal.perSourceVolumeEnabled"
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
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Volume Control Mode</label>
                  <div class="relative">
                    <select
                      v-model="groupModal.volumeMode"
                      class="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-gray-900 dark:text-white"
                    >
                      <option value="global">Global Default ({{ settings.globalVolumeControlMode }})</option>
                      <option value="linear">Linear</option>
                      <option value="nonlinear">Non-Linear</option>
                    </select>
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <span class="mdi mdi-chevron-down"></span>
                    </span>
                  </div>
                </div>

                <div v-if="groupModal.volumeMode === 'nonlinear' || (groupModal.volumeMode === 'global' && settings.globalVolumeControlMode === 'nonlinear')">
                   <div class="flex items-center justify-between mb-2">
                      <label class="text-sm font-medium text-gray-700 dark:text-white">Exponent (Curve)</label>
                      <span class="text-xs font-mono bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                        {{ groupModal.volumeExponent ?? settings.globalVolumeExponent }}
                      </span>
                   </div>
                   <input 
                      type="range"
                      v-model.number="groupModal.volumeExponent"
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
                    v-if="
                      getOfflineClientsInGroup(groupModal.groupId).length > 0
                    "
                    @click="removeOfflineClients"
                    class="px-3 py-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors flex items-center gap-1.5 border border-orange-200 dark:border-orange-800"
                  >
                    <span class="mdi mdi-trash-can-outline text-sm"></span>
                    Clean Offline ({{
                      getOfflineClientsInGroup(groupModal.groupId).length
                    }})
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
                        <span
                          class="mdi mdi-information-outline text-xs"
                        ></span>
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
                      <div
                        class="text-xs text-gray-500 dark:text-gray-400 truncate"
                      >
                        {{ c.config.volume.percent }}%
                      </div>
                    </div>

                    <!-- In Group checkbox -->
                    <div class="w-24 flex justify-center">
                      <input
                        type="checkbox"
                        :value="c.id"
                        v-model="groupModal.clientIds"
                        class="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        :disabled="!auth.permissions.canAssignClients"
                      />
                    </div>

                    <!-- Linked checkbox (only enabled if in group) -->
                    <div class="w-24 flex justify-center">
                      <input
                        type="checkbox"
                        :value="c.id"
                        v-model="groupModal.linkedClientIds"
                        :disabled="!groupModal.clientIds.includes(c.id) || !auth.permissions.canLinkClients"
                        class="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <!-- Info message -->
                <div
                  v-if="groupModal.linkedClientIds.length > 0"
                  class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <p class="text-xs text-blue-700 dark:text-blue-300">
                    <span class="mdi mdi-information text-sm"></span>
                    {{ groupModal.linkedClientIds.length }} client{{
                      groupModal.linkedClientIds.length === 1 ? "" : "s"
                    }}
                    linked. Their volumes will adjust proportionally with the
                    group volume control.
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
                  @click="deleteCurrentGroup"
                >
                  <span class="mdi mdi-delete text-xl"></span>
                </button>
              </Tooltip>
              <div class="flex gap-2">
                <Tooltip text="Cancel">
                    <button
                      class="w-10 h-10 flex items-center justify-center rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      @click="closeGroupSettings"
                    >
                      <span class="mdi mdi-close text-xl"></span>
                    </button>
                </Tooltip>
                <Tooltip text="Save Changes">
                    <button
                      class="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                      @click="applyGroupSettings"
                    >
                      <span class="mdi mdi-check text-xl"></span>
                    </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Group Filter Modal -->
      <GroupFilterModal :open="showGroupFilter" @close="showGroupFilter = false" />
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
import { useSettingsStore } from "./stores/settings"; // Force reload
import { useAuthStore } from "./stores/auth";
import { useZoneOrder } from "@/composables/useZoneOrder";
import type { Client, Group } from "./stores/snapcast";
import type { AuthPermissions } from "./stores/auth";
import BrowserPlayer from "@/components/BrowserPlayer.vue";
import Toast from "@/components/Toast.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import VolumeControl from "@/components/VolumeControl.vue";
import ZoneControlModal from "@/components/ZoneControlModal.vue";
import GroupFilterModal from "@/components/GroupFilterModal.vue";
import ClientDetailsModal from "@/components/ClientDetailsModal.vue";
import ClientSettingsModal from "@/components/ClientSettingsModal.vue";
import AppSettingsModal from "@/components/AppSettingsModal.vue";
import CreateGroupModal from "@/components/CreateGroupModal.vue";

// Zone Control Modal State
// Zone Control Modal State
const zoneControlGroupId = ref<string | null>(null);

const zoneControlGroup = computed(() => {
  if (!zoneControlGroupId.value) return null;
  return snapcast.groups.find(g => g.id === zoneControlGroupId.value) || null;
});

function openZoneControl(group: any) {
  zoneControlGroupId.value = group.id;
}

function closeZoneControl() {
  zoneControlGroupId.value = null;
}

function handleOpenSettingsFromZoneControl() {
  const group = zoneControlGroup.value;
  // Don't close zone control to allow stacking (dialog over dialog)
  // closeZoneControl(); 
  if (group) {
    openGroupSettings(group);
  }
}
import SetupPasscode from "@/components/SetupPasscode.vue";
import PermissionsConfig from "@/components/PermissionsConfig.vue";
import UnlockPrompt from "@/components/UnlockPrompt.vue";
import ServerInfo from "@/components/ServerInfo.vue";
import pkg from "../package.json";

const snapcast = useSnapcastStore();
const settings = useSettingsStore();
const auth = useAuthStore();

const hostInput = ref(snapcast.host);
const haSnapcastInfo = (window as any).__HA_SNAPCAST_INFO__ as string | undefined;
const connectHostError = ref("");
const refreshing = ref(false);


// UI State
const showServerInfo = ref(false);

// Setup flow state
const showingPasscodeSetup = ref(false);
const showingPermissionsSetup = ref(false);
const tempPasscode = ref("");
const showingPermissionsChange = ref(false);
const showingUnlockForPermissions = ref(false);

// Client ordering helpers
const showGroupFilter = ref(false);

const {
  sortedZones: sortedGroups,
  moveInCustomOrder,
  isBrowserZone: isBrowserGroup,
} = useZoneOrder(computed(() => snapcast.filteredGroups), {
  hiddenZoneIds: computed(() => settings.hiddenGroups),
  showEmptyZones: computed(() => settings.showEmptyGroups),
  browserPlayerId: computed(() => snapcast.browserPlayerId),
});

function handleMainDragStart(group: Group, event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", group.id);
  }
  draggedGroupId.value = group.id;
}

function handleMainDragOver(group: Group, event: DragEvent) {
  if (draggedGroupId.value && draggedGroupId.value !== group.id) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }
}

function handleMainDrop(targetGroup: Group, event: DragEvent) {
  event.preventDefault();
  if (!draggedGroupId.value || draggedGroupId.value === targetGroup.id) return;
  moveInCustomOrder(draggedGroupId.value, targetGroup.id);
  draggedGroupId.value = null;
}

function handleMainDragEnd() {
  draggedGroupId.value = null;
}

const draggedGroupId = ref<string | null>(null);

const appVersion = computed(() => pkg.version || "0.0.0");
const connectionStatus = computed(() => {
  if (snapcast.isConnected) return "connected";
  if (snapcast.isConnecting) return "connecting";
  if (snapcast.connectionError) return "setup";
  return "disconnected";
});

const isLoopbackTarget = computed(() => isLoopbackHost(snapcast.host));

const connectionPanelTitle = computed(() => {
  if (!snapcast.connectionError) return "Connect to Snapcast";
  if (haSnapcastInfo) return "Check the Home Assistant proxy";
  return "Tell SnapCtrl where your server is";
});

const connectionPanelDescription = computed(() => {
  if (haSnapcastInfo) {
    return "SnapCtrl is using the Home Assistant add-on proxy. If this fails, check the add-on configuration and Snapcast service.";
  }

  if (snapcast.connectionError && isLoopbackTarget.value) {
    return "We tried localhost first. If Snapcast runs on another device, enter that device's IP address or hostname below.";
  }

  if (snapcast.connectionError) {
    return "We could not reach the saved server address. Check the host, port, and network access, then try again.";
  }

  return "SnapCtrl will try the local server first. If Snapcast is on another device, use its LAN IP address or hostname.";
});

const connectionFormTone = computed<"warning" | "error">(() => {
  if (connectHostError.value) return "error";
  return "warning";
});

const connectionFormMessage = computed(() => {
  if (connectHostError.value) return connectHostError.value;
  if (!snapcast.connectionError) return "";
  if (haSnapcastInfo) {
    return "The add-on proxy could not reach Snapcast. Confirm the add-on host and port settings.";
  }
  if (isLoopbackTarget.value) {
    return "Snapcast did not answer on localhost:1780. Enter the IP or hostname of the machine running Snapcast.";
  }
  return `Snapcast did not answer on ${snapcast.host}. Try another address or confirm port 1780 is open.`;
});

const hostSuggestions = computed(() => {
  const suggestions = new Set<string>();
  const pageHostname = window.location.hostname;

  if (pageHostname && !isLoopbackHost(pageHostname)) {
    suggestions.add(`${pageHostname}:1780`);
  }

  suggestions.add("localhost:1780");
  suggestions.add("snapcast.local:1780");

  return Array.from(suggestions);
});

function isLoopbackHost(value: string): boolean {
  const host = value.trim().toLowerCase();
  return (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host === "[::1]" ||
    host.startsWith("[::1]:")
  );
}

function getDisplayClients(group: Group): Client[] {
  // Filter clients based on permissions
  let clients = auth.filterAllowedEntities("client", group.clients);

  // Sort: Linked clients first (in link order), then others (alphabetical)
  const linkedIds = settings.groupVolumeLinks[group.id]?.linkedClientIds || [];
  
  return clients.sort((a, b) => {
    const aLinkedIndex = linkedIds.indexOf(a.id);
    const bLinkedIndex = linkedIds.indexOf(b.id);
    const aIsLinked = aLinkedIndex !== -1;
    const bIsLinked = bLinkedIndex !== -1;

    // 1. Linked status (Linked first)
    if (aIsLinked && !bIsLinked) return -1;
    if (!aIsLinked && bIsLinked) return 1;

    // 2. Link order (for linked clients)
    if (aIsLinked && bIsLinked) {
      return aLinkedIndex - bLinkedIndex;
    }

    // 3. Alphabetical (for unlinked clients)
    const nameA = a.config.name || a.host.name;
    const nameB = b.config.name || b.host.name;
    return nameA.localeCompare(nameB);
  });
}

/**
 * Derive a human-friendly stream name from Snapcast stream URI.
 * Handles both string URIs and parsed URI objects returned by Server.GetStatus.
 */
function getStreamStatus(streamId: string): string {
  const stream = snapcast.streams.find((s) => s.id === streamId);
  return stream?.status || "unknown";
}

function getStreamStatusIcon(streamId: string): string {
  const status = getStreamStatus(streamId).toLowerCase();
  if (status === "playing" || status === "kplaying") return "mdi-play-circle";
  if (status === "idle" || status === "kidle") return "mdi-pause-circle"; // or mdi-sleep
  return "mdi-alert-circle";
}

function getStreamStatusColor(streamId: string): string {
  const status = getStreamStatus(streamId).toLowerCase();
  if (status === "playing" || status === "kplaying") return "text-green-500";
  if (status === "idle" || status === "kidle") return "text-orange-500";
  return "text-red-500";
}

function getStreamStatusTooltip(streamId: string): string {
  const status = getStreamStatus(streamId).toLowerCase();
  if (status === "playing" || status === "kplaying")
    return "Playing: Source is active";
  if (status === "idle" || status === "kidle")
    return "Idle: Source is silent or paused";
  return "Error: Source has an issue";
}

const displayStreams = computed(() => {
  return snapcast.streams.map(stream => ({
    id: stream.id,
    name: getStreamName(stream)
  }));
});

/**
 * Determine group display name. Prefer the group name if available; otherwise
 * try to use the assigned stream's name, falling back to a concise
 * description based on client names.
 */
function getGroupName(group: Group): string {
  return getGroupDisplayName(group, snapcast.streams);
}

function updateHost() {
  const nextHost = hostInput.value.trim();

  if (!haSnapcastInfo && !nextHost) {
    connectHostError.value = "Enter an IP address or hostname to continue.";
    return;
  }

  connectHostError.value = "";
  snapcast.setHost(nextHost);
  snapcast.disconnect();
  snapcast.connect();
}

function useHostSuggestion(host: string) {
  hostInput.value = host;
  connectHostError.value = "";
}

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

function adjustVolume(client: Client, delta: number) {
  const newVolume = Math.max(
    0,
    Math.min(100, client.config.volume.percent + delta)
  );
  snapcast.setClientVolume(client.id, newVolume, client.config.volume.muted);
}

/**
 * Get current group volume (average of linked clients).
 * IMPORTANT: Always calculated dynamically, never restored from store.
 */
function getGroupVolume(groupId: string): number {
  const linkedIds = settings.groupVolumeLinks[groupId]?.linkedClientIds || [];
  const group = snapcast.groups.find((g) => g.id === groupId);

  if (!group) return 100;

  // If no clients are explicitly linked, default to using ALL clients in the group
  // This ensures single-client groups (and groups without custom links) display correct average
  const targetClients = linkedIds.length > 0 
    ? group.clients.filter((c) => linkedIds.includes(c.id))
    : group.clients;

  if (targetClients.length === 0) return 0;

  // Calculate average volume of targeted clients
  const avg =
    targetClients.reduce((sum, c) => sum + c.config.volume.percent, 0) /
    targetClients.length;

  return Math.round(avg);
}

/**
 * Get list of linked clients for a group
 */
function getLinkedClients(groupId: string): Client[] {
  const linkedIds = settings.groupVolumeLinks[groupId]?.linkedClientIds || [];
  const group = snapcast.groups.find((g) => g.id === groupId);

  if (!group) return [];

  return group.clients.filter((c) => linkedIds.includes(c.id));
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

function updateClientName(client: Client) {
  snapcast.setClientName(client.id, client.config.name);
}

// Group modal state
const groupModal = ref<{
  open: boolean;
  groupId: string | null;
  clientIds: string[];
  linkedClientIds: string[];
  streamId: string | null;
  name: string;
  perSourceVolumeEnabled: boolean;
  volumeMode: "global" | "linear" | "nonlinear";
  volumeExponent: number | null;
}>({
  open: false,
  groupId: null,
  clientIds: [],
  linkedClientIds: [],
  streamId: null,
  name: "",
  perSourceVolumeEnabled: false,
  volumeMode: "global" as "global" | "linear" | "nonlinear",
  volumeExponent: null as number | null,
});

function openGroupSettings(group: Group) {
  const linkedIds = settings.groupVolumeLinks[group.id]?.linkedClientIds || [];

  groupModal.value = {
    open: true,
    groupId: group.id,
    clientIds: group.clients.map((c) => c.id),
    linkedClientIds: [...linkedIds],
    streamId: group.stream_id,
    name: group.name || "",
    perSourceVolumeEnabled: settings.isPerSourceVolumeEnabled(group.id),
    volumeMode: settings.groupVolumeControlConfig[group.id]?.mode || "global",
    volumeExponent: settings.groupVolumeControlConfig[group.id]?.exponent ?? null,
  };
}

function closeGroupSettings() {
  groupModal.value.open = false;
}

async function applyGroupSettings() {
  if (!groupModal.value.groupId) return;

  // Save per-source volume setting first
  settings.setPerSourceVolumeEnabled(
    groupModal.value.groupId,
    groupModal.value.perSourceVolumeEnabled
  );

  // SNAPSHOT: If enabled, snapshot current volumes for current stream immediately.
  // This handles the "Se activa... y esto guarda el estado actual" requirement.
  if (groupModal.value.perSourceVolumeEnabled) {
    const group = snapcast.groups.find(
      (g) => g.id === groupModal.value.groupId
    );
    // Use group stream unless overridden by modal selection
    const targetStream = groupModal.value.streamId || group?.stream_id;
    
    if (group && targetStream) {
      group.clients.forEach((client) => {
        // Only snapshot if connected? Requirement says "clients" generally.
        // It's safer to save current config state.
         settings.saveClientVolume(
          client.id,
          targetStream,
          client.config.volume.percent
        );
      });
    }
  }

  // Update stream
  if (groupModal.value.streamId) {
    await snapcast.setGroupStream(
      groupModal.value.groupId,
      groupModal.value.streamId
    );
  }

  // Update clients in group
  try {
    await snapcast.setGroupClients(
      groupModal.value.groupId,
      groupModal.value.clientIds
    );
  } catch (error) {
    // Suppress errors - group might have been auto-deleted if emptied
    console.log("Group clients update skipped (group may have been deleted)");
  }

  // Save custom name
  try {
    await snapcast.setGroupName(
      groupModal.value.groupId,
      groupModal.value.name
    );
  } catch (error) {
    // Suppress errors - group might have been auto-deleted
    console.log("Group name update skipped (group may have been deleted)");
  }

  // Calculate reference volumes for linked clients
  // Use current volume as the 100% baseline for each client
  const group = snapcast.groups.find((g) => g.id === groupModal.value.groupId);
  const referenceVolumes: Record<string, number> = {};

  if (group) {
    for (const clientId of groupModal.value.linkedClientIds) {
      const client = group.clients.find((c) => c.id === clientId);
      if (client) {
        // Save current volume as the reference (100% baseline)
        referenceVolumes[clientId] = client.config.volume.percent;
      }
    }
  }

  // Save linked clients configuration with reference volumes
  settings.setGroupVolumeLinks(
    groupModal.value.groupId,
    groupModal.value.linkedClientIds,
    referenceVolumes
  );

  // Save volume control config
  settings.setGroupVolumeControlConfig(
    groupModal.value.groupId,
    groupModal.value.volumeMode,
    groupModal.value.volumeExponent ?? undefined
  );

  closeGroupSettings();
}

async function deleteCurrentGroup() {
  if (!groupModal.value.groupId) return;

  const group = snapcast.groups.find((g) => g.id === groupModal.value.groupId);
  if (!group) return;

  // Find all disconnected clients in this group
  const disconnectedClients = group.clients.filter((c) => !c.connected);

  // Delete disconnected clients first
  for (const client of disconnectedClients) {
    try {
      await snapcast.deleteClient(client.id);
    } catch (error) {
      console.error(`Failed to delete client ${client.id}:`, error);
    }
  }

  // Empty the group of remaining clients
  await snapcast.setGroupClients(groupModal.value.groupId, []);

  closeGroupSettings();
}

// Helper function to check if a client is connected
function isClientConnected(clientId: string): boolean {
  const client = snapcast.findClientById(clientId);
  return client ? client.connected : false;
}

// Helper function to get offline clients in a group
function getOfflineClientsInGroup(groupId: string | null): Client[] {
  if (!groupId) return [];
  const group = snapcast.groups.find((g) => g.id === groupId);
  if (!group) return [];
  return group.clients.filter((c) => !c.connected);
}

// Remove all offline clients from current group
async function removeOfflineClients() {
  if (!groupModal.value.groupId) return;

  const offlineClients = getOfflineClientsInGroup(groupModal.value.groupId);

  for (const client of offlineClients) {
    try {
      await snapcast.deleteClient(client.id);
    } catch (error) {
      console.error(`Failed to delete client ${client.id}:`, error);
    }
  }

  // Refresh the modal data
  const group = snapcast.groups.find((g) => g.id === groupModal.value.groupId);
  if (group) {
    groupModal.value.clientIds = group.clients.map((c) => c.id);
    groupModal.value.linkedClientIds = groupModal.value.linkedClientIds.filter(
      (id) => group.clients.some((c) => c.id === id)
    );
  }
}

// Client modal state
const clientModal = ref<{
  open: boolean;
  client: Client | null;
}>({ open: false, client: null });
function openClientSettings(client: Client) {
  clientModal.value = {
    open: true,
    client,
  };
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
  clientDetailsModal.value = {
    open: true,
    client: client,
  };
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

async function refreshStatus() {
  refreshing.value = true;
  try {
    await snapcast.getServerStatus();
  } finally {
    refreshing.value = false;
  }
}

// App settings modal
const appModal = ref<{ open: boolean }>({ open: false });
function openAppSettings() {
  appModal.value.open = true;
}
function closeAppSettings() {
  appModal.value.open = false;
}

import Tooltip from "@/components/Tooltip.vue";
import { getStreamName } from "@/utils/stream-name";
import { getGroupDisplayName } from "@/utils/group-name";

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

// Watch theme changes handled in store
// Removed local watcher as it is now in the store

const isMobile = ref(window.innerWidth < 768);

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

onMounted(async () => {
  window.addEventListener("resize", updateIsMobile);

  // host is already hydrated by pinia-plugin-persistedstate from snapcast.host
  if (auth.isAuthenticated && !auth.isLocked && settings.autoConnect) {
    snapcast.connect();
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", updateIsMobile);
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
