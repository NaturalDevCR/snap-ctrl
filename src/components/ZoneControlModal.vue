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
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click="close"
    >
      <div
        class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] border border-gray-200 dark:border-gray-800 transform transition-all flex flex-col"
        @click.stop="handleModalClick"
      >
        <!-- Header -->
        <div
          class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 rounded-t-2xl bg-white dark:bg-slate-900 z-10 relative"
          @click="isDropdownOpen = false"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1" @click.stop>
             <div
                class="w-10 h-10 rounded-lg bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm"
              >
                <span class="mdi mdi-speaker-multiple text-xl"></span>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white truncate">
                  {{ groupName }}
                </h3>
                  <div class="relative flex items-center gap-1.5 text-xs w-full" :class="streamStatusColor || 'text-gray-500 dark:text-gray-400'">
                      <span class="mdi shrink-0" :class="streamStatusIcon"></span>
                      
                      <!-- Custom Dropdown -->
                      <div class="relative inline-block" ref="dropdownRef">
                        <button
                          type="button"
                          @click="toggleDropdown"
                          class="group flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-xs font-medium cursor-pointer text-gray-900 dark:text-gray-200"
                        >
                          <span class="truncate max-w-[200px]">{{ streams.find(s => s.id === streamId)?.name || streamId }}</span>
                          <span class="mdi mdi-chevron-down text-base opacity-50 group-hover:opacity-100 transition-all duration-200" :class="{ 'rotate-180': isDropdownOpen }"></span>
                        </button>

                        <Transition
                          enter-active-class="transition duration-100 ease-out"
                          enter-from-class="transform scale-95 opacity-0"
                          enter-to-class="transform scale-100 opacity-100"
                          leave-active-class="transition duration-75 ease-in"
                          leave-from-class="transform scale-100 opacity-100"
                          leave-to-class="transform scale-95 opacity-0"
                        >
                          <div
                            v-if="isDropdownOpen"
                            class="absolute top-full left-0 min-w-full w-max mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 max-h-60 overflow-y-auto custom-scrollbar"
                          >
                            <button
                              v-for="stream in streams"
                              :key="stream.id"
                              @click="selectStream(stream.id)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-2"
                              :class="stream.id === streamId ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10' : 'text-gray-700 dark:text-gray-300'"
                            >
                              <span class="mdi text-sm" :class="stream.id === streamId ? 'mdi-check' : 'opacity-0'"></span>
                              <span class="whitespace-nowrap">{{ stream.name }}</span>
                            </button>
                          </div>
                        </Transition>
                      </div>
                  </div>
              </div>
          </div>
          <div class="flex items-center gap-2" @click.stop>
            <button
              v-if="showSettingsButton"
              @click="$emit('open-settings')"
              class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
            >
               <span class="mdi mdi-cog text-xl"></span>
            </button>
            <button
              @click="close"
              class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
            >
              <span class="mdi mdi-close text-xl"></span>
            </button>
          </div>
        </div>

        <!-- Content (Scrollable) -->
        <div class="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8 rounded-b-2xl">
            
            <!-- Group Volume Master -->
            <div v-if="linkedClientIds.length > 0" class="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800 flex flex-col gap-3">
                 <span class="text-sm font-bold text-gray-500 uppercase tracking-wider">Master Volume</span>
                 <VolumeControl
                    :volume="volume"
                    :muted="isMuted"
                    :name="groupName + ' Master'"
                    variant="inline"
                    @update:volume="$emit('update:volume', $event)"
                    @toggle-mute="$emit('toggle-mute')"
                  />
            </div>

            <!-- Client List -->
            <div>
                 <div class="flex items-center justify-between mb-3 px-1">
                    <span class="text-sm font-bold text-gray-900 dark:text-white">Clients</span>
                    <span class="text-xs text-gray-500">{{ clients.length }} devices</span>
                </div>
                
                <div class="flex flex-col border-t border-gray-100 dark:border-gray-800">
                  <div
                    v-for="(client, index) in clients"
                    :key="client.id"
                    class="flex flex-col gap-2 py-3 px-1 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors rounded-lg -mx-1 px-3"
                  >
                    <!-- Top Row: Icon and Name -->
                    <div class="flex items-center gap-3 w-full">
                        <!-- Status Icon -->
                        <div class="shrink-0 flex items-center justify-center w-8">
                            <div class="relative">
                               <span
                                class="mdi text-xl"
                                :class="
                                  client.connected
                                    ? 'mdi-speaker text-gray-700 dark:text-gray-300'
                                    : 'mdi-speaker-off text-gray-400'
                                "
                              ></span>
                              <span
                                 v-if="client.connected"
                                class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-green-500"
                              ></span>
                            </div>
                        </div>

                        <!-- Name -->
                        <div class="flex-1 min-w-0 flex items-center gap-2">
                             <div class="font-medium text-sm text-gray-900 dark:text-gray-200 break-words">
                                  {{ client.config.name || client.host.name }}
                             </div>
                             <Tooltip v-if="isLinked(client.id)" text="Linked to group">
                                 <div class="flex items-center justify-center w-5 h-5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 cursor-help">
                                     <span class="mdi mdi-link-variant text-xs"></span>
                                 </div>
                             </Tooltip>
                             <div class="flex items-center gap-1">
                               <button
                                  @click="$emit('open-client-details', client)"
                                  class="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                                  title="Client Info"
                               >
                                  <span class="mdi mdi-information-outline text-lg"></span>
                               </button>
                               <button
                                  @click="$emit('open-client-settings', client)"
                                  class="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                                  title="Client Settings"
                               >
                                  <span class="mdi mdi-cog-outline text-lg"></span>
                               </button>
                             </div>
                        </div>
                    </div>

                    <!-- Bottom Row: Volume Control (Inline) -->
                    <div class="pl-11 pr-2 w-full">
                       <VolumeControl
                         :volume="client.config.volume.percent"
                         :muted="client.config.volume.muted"
                         :name="client.config.name || client.host.name"
                         variant="inline"
                         @update:volume="$emit('update-client-volume', client, $event)"
                         @update:muted="$emit('toggle-client-mute', client)"
                       />
                    </div>
                  </div>
                </div>
            </div>
        </div>

        <!-- Footer Actions -->
         <div class="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end rounded-b-2xl">
              <button
                class="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors shadow-sm"
                @click="close"
              >
                Close
              </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import VolumeControl from './VolumeControl.vue';
import Tooltip from '@/components/Tooltip.vue';

// Define props to receive group data
// We'll pass disconnected entities so App-level logic can handle it
const props = defineProps<{
  isOpen: boolean;
  groupName: string;
  streamId: string;
  streams: any[];
  streamName: string;
  streamStatusIcon: string;
  streamStatusColor?: string;
  volume: number; // Group volume
  isMuted: boolean;
  clients: any[]; // Array of clients
  linkedClientIds: string[];
  showSettingsButton?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:volume', val: number): void;
  (e: 'adjust-volume', delta: number): void;
  (e: 'toggle-mute'): void;
  (e: 'update-client-volume', client: any, val: number): void;
  (e: 'toggle-client-mute', client: any): void;
  (e: 'open-settings'): void;
  (e: 'open-client-settings', client: any): void;
  (e: 'open-client-details', client: any): void;
  (e: 'update:streamId', val: string): void;
}>();

// Dropdown state
const isDropdownOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
}

function selectStream(id: string) {
  emit('update:streamId', id);
  isDropdownOpen.value = false;
}

function handleModalClick(event: MouseEvent) {
  // Try to close dropdown if clicked outside
  if (isDropdownOpen.value && dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false;
  }
}

function close() {
  emit('close');
}

function toggleMute() {
  emit('toggle-mute');
}

function isLinked(clientId: string) {
    return props.linkedClientIds.includes(clientId);
}
</script>

<style scoped>
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
