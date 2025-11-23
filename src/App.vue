<template>
  <div
    id="app"
    class="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300"
  >
    <Toast />

    <header
      class="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-gray-800 transition-all duration-300 shadow-sm"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16 gap-4">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-3">
              <span
                class="mdi mdi-music-circle text-3xl text-blue-600 dark:text-blue-500"
              ></span>
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
                'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30':
                  snapcast.connectionError,
                'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700':
                  !snapcast.isConnected &&
                  !snapcast.isConnecting &&
                  !snapcast.connectionError,
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
              <span v-if="snapcast.isConnecting">Connecting...</span>
              <span v-else-if="snapcast.isConnected">Connected</span>
              <span v-else-if="snapcast.connectionError">Error</span>
              <span v-else>Disconnected</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Tooltip text="Settings" position="bottom">
              <button
                @click="openAppSettings"
                class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <span class="mdi mdi-cog text-xl"></span>
              </button>
            </Tooltip>
          </div>
        </div>

        <!-- Browser Player in Header when connected -->
        <div
          v-if="snapcast.isConnected"
          class="py-3 border-t border-gray-200 dark:border-gray-800"
        >
          <BrowserPlayer />
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div
        v-if="!snapcast.isConnected && !snapcast.isConnecting"
        class="flex flex-col items-center justify-center min-h-[60vh]"
      >
        <div
          class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 text-center"
        >
          <div
            class="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
          >
            <span class="mdi mdi-cast-audio text-3xl"></span>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Connect to Server
          </h2>
          <p class="text-gray-500 dark:text-gray-400 mb-8">
            Enter your Snapcast server address to start controlling your
            multiroom audio system.
          </p>

          <div
            v-if="snapcast.connectionError"
            class="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 text-sm text-left flex items-start gap-3"
          >
            <span class="mdi mdi-alert-circle text-lg shrink-0"></span>
            <span>{{ snapcast.connectionError }}</span>
          </div>

          <div class="flex flex-col gap-4">
            <div class="relative">
              <span
                class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <span class="mdi mdi-server"></span>
              </span>
              <input
                v-model="hostInput"
                @keyup.enter="updateHost"
                placeholder="localhost:1780"
                class="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            <button
              @click="updateHost"
              class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900"
            >
              Connect
            </button>
          </div>
        </div>
      </div>

      <div
        v-else-if="snapcast.isConnecting"
        class="flex flex-col items-center justify-center min-h-[60vh]"
      >
        <LoadingSpinner size="60px" label="Connecting to Snapcast server..." />
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
                @click="openCreateGroup"
                class="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                <span class="mdi mdi-plus text-xl"></span>
              </button>
            </Tooltip>
            <Tooltip text="Refresh Status">
              <button
                @click="refreshStatus"
                class="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
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
                class="w-10 h-10 flex items-center justify-center rounded-lg border shadow-sm transition-colors"
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
                class="w-10 h-10 flex items-center justify-center rounded-lg border shadow-sm transition-colors"
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

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div
            v-for="group in sortedGroups"
            :key="group.id"
            class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
          >
            <div
              class="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between gap-3"
            >
              <h3
                class="font-bold text-lg text-gray-900 dark:text-white truncate"
                :title="getGroupName(group)"
              >
                {{ getGroupName(group) }}
              </h3>
              <div class="flex items-center gap-1 shrink-0">
                <Tooltip :text="group.muted ? 'Unmute group' : 'Mute group'">
                  <button
                    @click="toggleGroupMute(group)"
                    class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                    :class="
                      group.muted
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-400'
                    "
                  >
                    <span
                      class="mdi text-xl"
                      :class="
                        group.muted ? 'mdi-volume-off' : 'mdi-volume-high'
                      "
                    ></span>
                  </button>
                </Tooltip>
                <Tooltip text="Group settings">
                  <button
                    @click="openGroupSettings(group)"
                    class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 transition-colors"
                  >
                    <span class="mdi mdi-cog text-xl"></span>
                  </button>
                </Tooltip>
              </div>
            </div>

            <div class="p-5 border-b border-gray-100 dark:border-gray-800">
              <div class="relative">
                <span
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                >
                  <span class="mdi mdi-music-note"></span>
                </span>
                <select
                  v-model="group.stream_id"
                  @change="changeGroupStream(group, $event)"
                  class="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none appearance-none cursor-pointer transition-colors"
                >
                  <option
                    v-for="stream in snapcast.streams"
                    :key="stream.id"
                    :value="stream.id"
                  >
                    {{ getStreamName(stream) }}
                  </option>
                </select>
                <span
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                >
                  <span class="mdi mdi-chevron-down"></span>
                </span>
              </div>
            </div>

            <div class="p-5 flex-1 flex flex-col gap-4">
              <div
                v-for="client in getDisplayClients(group)"
                :key="client.id"
                class="rounded-lg p-4 border transition-all duration-200"
                :class="
                  client.connected
                    ? 'bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    : 'bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-gray-800 opacity-70'
                "
                v-show="client.connected || settings.showDisconnectedClients"
              >
                <div class="flex items-start justify-between mb-4 gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span
                        class="mdi"
                        :class="
                          client.connected
                            ? 'mdi-speaker text-blue-500'
                            : 'mdi-speaker-off text-gray-400'
                        "
                      ></span>
                      <input
                        v-model.trim="client.config.name"
                        @blur="updateClientName(client)"
                        @keyup.enter="
                          ($event.target as HTMLInputElement).blur()
                        "
                        class="bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 rounded px-1.5 py-0.5 -ml-1.5 font-semibold text-gray-900 dark:text-white w-full outline-none transition-colors truncate"
                        placeholder="Rename client"
                      />
                    </div>
                    <div
                      class="text-xs text-gray-500 dark:text-gray-400 font-mono pl-7 truncate"
                    >
                      {{ client.host.name }}
                    </div>
                  </div>

                  <div class="flex items-center gap-1 shrink-0">
                    <Tooltip
                      :text="client.config.volume.muted ? 'Unmute' : 'Mute'"
                    >
                      <button
                        class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        :class="
                          client.config.volume.muted
                            ? 'text-red-500'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        "
                        @click="toggleClientMute(client)"
                      >
                        <span
                          class="mdi"
                          :class="
                            client.config.volume.muted
                              ? 'mdi-volume-off'
                              : 'mdi-volume-high'
                          "
                        ></span>
                      </button>
                    </Tooltip>
                    <Tooltip text="Client settings">
                      <button
                        class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        @click="openClientSettings(client)"
                      >
                        <span class="mdi mdi-cog"></span>
                      </button>
                    </Tooltip>
                  </div>
                </div>

                <div class="pl-7">
                  <VolumeControl
                    :volume="client.config.volume.percent"
                    :muted="client.config.volume.muted"
                    @update:volume="setVolume(client, $event)"
                    @update:muted="toggleClientMute(client)"
                  />
                </div>

                <div v-if="!client.connected" class="mt-2 pl-7">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                  >
                    Offline
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="snapcast.groups.length === 0"
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
      </div>
    </main>

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
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
                class="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-gray-900 dark:text-white"
                v-model.trim="groupModal.name"
                placeholder="Custom group name"
              />
            </div>

            <div>
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
                    v-for="s in snapcast.streams"
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

            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >Clients</label
              >
              <div class="max-h-48 overflow-y-auto space-y-2 p-1">
                <label
                  v-for="c in snapcast.clients"
                  :key="c.id"
                  class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <span class="font-medium text-gray-700 dark:text-gray-200">{{
                    c.config.name || c.host.name
                  }}</span>
                  <div class="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      :value="c.id"
                      v-model="groupModal.clientIds"
                      class="sr-only peer"
                    />
                    <div
                      class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                    ></div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div
            class="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between"
          >
            <button
              class="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
              @click="deleteCurrentGroup"
            >
              Delete group
            </button>
            <div class="flex gap-3">
              <button
                class="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                @click="closeGroupSettings"
              >
                Cancel
              </button>
              <button
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                @click="applyGroupSettings"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Group Filter Modal -->
    <div
      v-if="showGroupFilter"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      @click.self="showGroupFilter = false"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden"
      >
        <div
          class="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between"
        >
          <h3 class="font-bold text-lg text-gray-900 dark:text-white">
            Filter Groups
          </h3>
          <button
            @click="showGroupFilter = false"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <span class="mdi mdi-close text-xl"></span>
          </button>
        </div>
        <div class="p-2 max-h-[60vh] overflow-y-auto">
          <div
            v-if="snapcast.groups.length === 0"
            class="p-4 text-center text-gray-500 dark:text-gray-400"
          >
            No groups available
          </div>
          <div
            v-for="group in snapcast.groups"
            :key="group.id"
            class="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-colors"
            @click="toggleGroupVisibility(group.id)"
          >
            <div class="flex items-center gap-3">
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
                !settings.hiddenGroups.includes(group.id)
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-gray-300 dark:border-gray-600'
              "
            >
              <span
                v-if="!settings.hiddenGroups.includes(group.id)"
                class="mdi mdi-check text-sm"
              ></span>
            </div>
          </div>
        </div>
        <div
          class="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 flex justify-end"
        >
          <button
            @click="showGroupFilter = false"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
    <!-- Client Settings Modal -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="clientModal.open"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="closeClientSettings"
      >
        <div
          class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800 transform transition-all"
          @click.stop
        >
          <div
            class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between"
          >
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              Client Settings
            </h3>
            <button
              @click="closeClientSettings"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <span class="mdi mdi-close text-xl"></span>
            </button>
          </div>

          <div class="p-6 space-y-6">
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >Name</label
              >
              <input
                class="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-gray-900 dark:text-white"
                v-model.trim="clientModal.name"
              />
            </div>
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >Latency (ms)</label
              >
              <input
                type="number"
                min="0"
                class="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-gray-900 dark:text-white"
                v-model.number="clientModal.latency"
              />
            </div>
          </div>

          <div
            class="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3"
          >
            <button
              class="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              @click="closeClientSettings"
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
              @click="applyClientSettings"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- App Settings Modal -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="appModal.open"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="closeAppSettings"
      >
        <div
          class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800 transform transition-all"
          @click.stop
        >
          <div
            class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between"
          >
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              Application Settings
            </h3>
            <button
              @click="closeAppSettings"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <span class="mdi mdi-close text-xl"></span>
            </button>
          </div>

          <div class="p-6 space-y-6">
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >Server Host</label
              >
              <input
                class="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-gray-900 dark:text-white"
                v-model="hostInput"
                placeholder="localhost:1780"
              />
            </div>

            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >Theme</label
              >
              <div
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="mdi mdi-white-balance-sunny text-yellow-500"
                    v-if="settings.theme === 'light'"
                  ></span>
                  <span
                    class="mdi mdi-weather-night text-blue-400"
                    v-else
                  ></span>
                  <span
                    class="font-medium text-gray-900 dark:text-white capitalize"
                    >{{ settings.theme }} Mode</span
                  >
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="settings.theme === 'dark'"
                    @change="
                      settings.setTheme(
                        settings.theme === 'dark' ? 'light' : 'dark'
                      )
                    "
                    class="sr-only peer"
                  />
                  <div
                    class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                  ></div>
                </label>
              </div>
            </div>

            <div class="space-y-3">
              <label
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
              >
                <span class="font-medium text-gray-900 dark:text-white"
                  >Auto Connect</span
                >
                <div class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="settings.autoConnect"
                    class="sr-only peer"
                  />
                  <div
                    class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                  ></div>
                </div>
              </label>

              <label
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
              >
                <span class="font-medium text-gray-900 dark:text-white"
                  >Show Empty Groups</span
                >
                <div class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="settings.showEmptyGroups"
                    class="sr-only peer"
                  />
                  <div
                    class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                  ></div>
                </div>
              </label>
            </div>
          </div>

          <div
            class="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3"
          >
            <button
              class="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              @click="closeAppSettings"
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
              @click="applyAppSettings"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Create Group Modal -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="createGroupModal.open"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="closeCreateGroup"
      >
        <div
          class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800 transform transition-all"
          @click.stop
        >
          <div
            class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between"
          >
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              Create New Group
            </h3>
            <button
              @click="closeCreateGroup"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <span class="mdi mdi-close text-xl"></span>
            </button>
          </div>

          <div class="p-6 space-y-6">
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >Stream</label
              >
              <div class="relative">
                <select
                  v-model="createGroupModal.streamId"
                  class="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-gray-900 dark:text-white"
                >
                  <option
                    v-for="s in snapcast.streams"
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

            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >Select Clients</label
              >
              <div class="max-h-48 overflow-y-auto space-y-2 p-1">
                <label
                  v-for="c in availableClientsForNewGroup"
                  :key="c.id"
                  class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <span class="font-medium text-gray-700 dark:text-gray-200">{{
                    c.config.name || c.host.name
                  }}</span>
                  <div class="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      :value="c.id"
                      v-model="createGroupModal.clientIds"
                      class="sr-only peer"
                    />
                    <div
                      class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                    ></div>
                  </div>
                </label>
              </div>
              <p
                v-if="availableClientsForNewGroup.length === 0"
                class="mt-3 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30"
              >
                All clients are already assigned to groups. You can move clients
                between groups using group settings.
              </p>
            </div>
          </div>

          <div
            class="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3"
          >
            <button
              class="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              @click="closeCreateGroup"
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              @click="createNewGroup"
              :disabled="createGroupModal.clientIds.length === 0"
            >
              Create Group
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useSnapcastStore } from "./stores/snapcast";
import { useSettingsStore } from "./stores/settings";
import type { Client, Group } from "./stores/snapcast";
import BrowserPlayer from "@/components/BrowserPlayer.vue";
import Toast from "@/components/Toast.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import VolumeControl from "@/components/VolumeControl.vue";

const snapcast = useSnapcastStore();
const settings = useSettingsStore();

const hostInput = ref(snapcast.host);
const refreshing = ref(false);
let refreshInterval: number | null = null;

// Client ordering helpers
const showGroupFilter = ref(false);

const sortedGroups = computed(() => {
  let groups = [...snapcast.groups];

  // Filter out hidden groups
  groups = groups.filter((g) => !settings.hiddenGroups.includes(g.id));

  if (!settings.showEmptyGroups) {
    groups = groups.filter((g) => g.clients.length > 0);
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name));
});

const toggleGroupVisibility = (groupId: string) => {
  const index = settings.hiddenGroups.indexOf(groupId);
  if (index === -1) {
    settings.hiddenGroups.push(groupId);
  } else {
    settings.hiddenGroups.splice(index, 1);
  }
};

const getGroupColor = (groupId: string) => {
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
  return colors[index];
};

function getDisplayClients(group: Group): Client[] {
  return group.clients;
}

/**
 * Derive a human-friendly stream name from Snapcast stream URI.
 * Handles both string URIs and parsed URI objects returned by Server.GetStatus.
 */
function getStreamName(stream: any): string {
  const uri = stream?.uri;
  if (!uri) return stream?.id ?? "Unknown Stream";

  if (typeof uri === "string") {
    const q = uri.split("?")[1] || "";
    const params = new URLSearchParams(q);
    return params.get("name") || uri;
  }

  if (typeof uri === "object") {
    const query = (uri as any).query;
    if (typeof query === "string") {
      const params = new URLSearchParams(query);
      return params.get("name") || (uri.path ?? stream.id);
    }
    if (query && typeof query === "object") {
      return query.name || (uri.path ?? stream.id);
    }
    return uri.path ?? stream.id;
  }
  return stream?.id ?? "Unknown Stream";
}

/**
 * Determine group display name. Prefer the group name if available; otherwise
 * try to use the assigned stream's name, falling back to a concise
 * description based on client names.
 */
function getGroupName(group: Group): string {
  // Prioritize custom name if set
  if (group.name && group.name.trim().length > 0) return group.name;

  // Try to use stream name
  const stream = snapcast.streams.find(
    (s) => s.id === (group as any).stream_id
  );
  const streamName = stream ? getStreamName(stream) : null;
  if (streamName) return streamName;

  // Fall back to first client name or client count
  if (group.clients && group.clients.length > 0) {
    const first = group.clients[0];
    if (first?.config?.name) return `${first.config.name} Group`;
    return `${group.clients.length} Clients`;
  }
  return "Unnamed Group";
}

function updateHost() {
  snapcast.setHost(hostInput.value);
  snapcast.disconnect();
  snapcast.connect();
}

function toggleGroupMute(group: Group) {
  snapcast.setGroupMute(group.id, !group.muted);
}

function changeGroupStream(group: Group, event: Event) {
  const streamId = (event.target as HTMLSelectElement).value;
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

function updateClientName(client: Client) {
  snapcast.setClientName(client.id, client.config.name);
}

// Group modal state
const groupModal = ref<{
  open: boolean;
  groupId: string | null;
  clientIds: string[];
  streamId: string | null;
  name: string;
}>({
  open: false,
  groupId: null,
  clientIds: [],
  streamId: null,
  name: "",
});

function openGroupSettings(group: Group) {
  groupModal.value = {
    open: true,
    groupId: group.id,
    clientIds: group.clients.map((c) => c.id),
    streamId: group.stream_id,
    name: group.name || "",
  };
}

function closeGroupSettings() {
  groupModal.value.open = false;
}

async function applyGroupSettings() {
  if (!groupModal.value.groupId) return;

  if (groupModal.value.streamId) {
    await snapcast.setGroupStream(
      groupModal.value.groupId,
      groupModal.value.streamId
    );
  }

  await snapcast.setGroupClients(
    groupModal.value.groupId,
    groupModal.value.clientIds
  );

  // Save custom name
  await snapcast.setGroupName(groupModal.value.groupId, groupModal.value.name);

  closeGroupSettings();
}

async function deleteCurrentGroup() {
  if (!groupModal.value.groupId) return;
  await snapcast.setGroupClients(groupModal.value.groupId, []);
  closeGroupSettings();
}

// Client modal state
const clientModal = ref<{
  open: boolean;
  clientId: string | null;
  name: string;
  latency: number;
}>({ open: false, clientId: null, name: "", latency: 0 });
function openClientSettings(client: Client) {
  clientModal.value = {
    open: true,
    clientId: client.id,
    name: client.config.name,
    latency: client.config.latency,
  };
}
function closeClientSettings() {
  clientModal.value.open = false;
}
async function applyClientSettings() {
  if (!clientModal.value.clientId) return;
  await snapcast.setClientName(
    clientModal.value.clientId,
    clientModal.value.name
  );
  await snapcast.setClientLatency(
    clientModal.value.clientId,
    clientModal.value.latency
  );
  closeClientSettings();
}

// Create group modal state
const createGroupModal = ref<{
  open: boolean;
  clientIds: string[];
  streamId: string | null;
}>({
  open: false,
  clientIds: [],
  streamId: null,
});

const availableClientsForNewGroup = computed(() => {
  // Return all clients - user can create groups with any clients
  // Snapcast will handle moving clients between groups
  return snapcast.clients;
});

function openCreateGroup() {
  // Pre-select first stream if available
  createGroupModal.value = {
    open: true,
    clientIds: [],
    streamId:
      snapcast.streams.length > 0 ? snapcast.streams[0]?.id ?? null : null,
  };
}

function closeCreateGroup() {
  createGroupModal.value.open = false;
}

async function createNewGroup() {
  if (createGroupModal.value.clientIds.length === 0) return;
  if (!createGroupModal.value.streamId) return;

  try {
    // Create group by setting clients
    // Snapcast automatically creates a new group when you assign clients that aren't in a group
    // We'll use the first client's current group or create implicitly
    const firstClientId = createGroupModal.value.clientIds[0];

    // Find an empty group or the system will create one
    // Set the stream for the new group
    await snapcast.setGroupClients("", createGroupModal.value.clientIds);

    // Refresh to get the new group ID and then set its stream
    await snapcast.getServerStatus();

    // Find the group that has our clients
    const newGroup = snapcast.groups.find((g) =>
      g.clients.some((c) => createGroupModal.value.clientIds.includes(c.id))
    );

    if (newGroup && createGroupModal.value.streamId) {
      await snapcast.setGroupStream(
        newGroup.id,
        createGroupModal.value.streamId
      );
    }

    closeCreateGroup();
  } catch (error) {
    console.error("Failed to create group:", error);
  }
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
function applyAppSettings() {
  updateHost();
  closeAppSettings();
}

import Tooltip from "@/components/Tooltip.vue";

// Watch theme changes handled in store
// Removed local watcher as it is now in the store

onMounted(() => {
  if (settings.autoConnect) {
    snapcast.connect();
  }

  // Set up periodic refresh
  refreshInterval = window.setInterval(() => {
    if (snapcast.isConnected) {
      snapcast.getServerStatus();
    }
  }, settings.refreshInterval);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  snapcast.disconnect();
});
</script>

<style scoped>
/* Scoped styles removed in favor of Tailwind CSS */
</style>
