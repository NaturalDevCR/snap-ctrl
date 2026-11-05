<template>
  <AppDialog :open="isOpen" title="Server Information" title-icon="mdi-server" @close="close">
    <div v-if="serverInfo && serverInfo.server && serverInfo.server.server" class="space-y-6">
      <!-- Server Status Header -->
      <div class="flex items-center gap-4 pb-4 border-b border-[var(--border)]">
        <div class="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
          <span class="mdi mdi-raspberry-pi text-3xl"></span>
        </div>
        <div class="min-w-0">
          <h4 class="font-bold text-xl text-[var(--text-primary)] truncate">
            {{ serverInfo.server.server.host.name || 'Snapserver' }}
          </h4>
          <p class="text-sm text-[var(--text-tertiary)] font-mono truncate">
            {{ serverInfo.server.server.host.ip }}
          </p>
        </div>
      </div>

      <!-- Info Grid -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
            IP Address
          </label>
          <p class="text-sm font-medium text-[var(--text-primary)] font-mono">
            {{ displayIp }}
          </p>
        </div>

        <div>
          <label class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
            Version
          </label>
          <p class="text-sm font-medium text-[var(--text-primary)]">
            v{{ serverInfo.server.server.snapserver.version }}
          </p>
        </div>

        <div>
          <label class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
            Protocol
          </label>
          <p class="text-sm font-medium text-[var(--text-primary)]">
            v{{ serverInfo.server.server.snapserver.protocolVersion }}
          </p>
        </div>

        <div>
          <label class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
            OS
          </label>
          <p class="text-sm font-medium text-[var(--text-primary)]">
            {{ serverInfo.server.server.host.os }}
          </p>
        </div>

        <div>
          <label class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
            Arch
          </label>
          <p class="text-sm font-medium text-[var(--text-primary)]">
            {{ serverInfo.server.server.host.arch }}
          </p>
        </div>
        
        <div>
          <label class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
            MAC Address
          </label>
          <p class="text-sm font-medium text-[var(--text-primary)] font-mono">
            {{ serverInfo.server.server.host.mac }}
          </p>
        </div>
      </div>

      <!-- Stats -->
      <div class="bg-[var(--surface-2)] rounded-lg p-4 grid grid-cols-3 gap-2 text-center">
         <div>
           <div class="text-lg font-bold text-blue-600 dark:text-blue-400">
             {{ groupsCount }}
           </div>
           <div class="text-xs text-[var(--text-tertiary)]">Groups</div>
         </div>
         <div>
           <div class="text-lg font-bold text-blue-600 dark:text-blue-400">
             {{ clientsCount }}
           </div>
           <div class="text-xs text-[var(--text-tertiary)]">Clients</div>
         </div>
         <div>
           <div class="text-lg font-bold text-blue-600 dark:text-blue-400">
             {{ streamsCount }}
           </div>
           <div class="text-xs text-[var(--text-tertiary)]">Streams</div>
         </div>
      </div>
    </div>
    <div v-else class="flex flex-col items-center justify-center py-8 text-[var(--text-tertiary)]">
      <span class="mdi mdi-loading mdi-spin text-3xl mb-2"></span>
      <p>Loading server info...</p>
    </div>

    <template #footer>
      <div class="w-full flex justify-end">
        <button
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          @click="close"
        >
          Close
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSnapcastStore } from '@/stores/snapcast';
import AppDialog from '@/components/AppDialog.vue';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const snapcast = useSnapcastStore();

const serverInfo = computed(() => snapcast.serverStatus);
const groupsCount = computed(() => snapcast.groups.length);
const clientsCount = computed(() => snapcast.allClients.length);
const streamsCount = computed(() => snapcast.streams.length);

const displayIp = computed(() => {
  // First try to use the IP reported by the server
  const reportedIp = serverInfo.value?.server?.server?.host?.ip;
  if (reportedIp && reportedIp.trim() !== '') return reportedIp;
  
  // Fallback: use the host we connected to (stripping port)
  // If we are on localhost/127.0.0.1, this might just be "localhost"
  const connectedHost = snapcast.host.split(':')[0];
  return connectedHost;
});

function close() {
  emit('close');
}
</script>
