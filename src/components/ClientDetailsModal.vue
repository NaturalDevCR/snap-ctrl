<script setup lang="ts">
import { computed } from "vue";
import { formatLastSeen } from "@/utils/last-seen";
import type { Client } from "@/stores/snapcast";

const props = defineProps<{
  open: boolean;
  client: Client | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const displayName = computed(() => {
  if (!props.client) return "";
  return props.client.config.name || props.client.host.name;
});

const status = computed(() => (props.client?.connected ? "Connected" : "Disconnected"));
const lastSeen = computed(() =>
  props.client ? formatLastSeen(props.client.lastSeen.sec) : ""
);
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
      v-if="props.open && props.client"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div
        class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800 transform transition-all"
        @click.stop
      >
        <div
          class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between"
        >
          <h3
            class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"
          >
            <span class="mdi mdi-information-outline text-blue-500"></span>
            Client Details
          </h3>
          <button
            @click="emit('close')"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <span class="mdi mdi-close text-xl"></span>
          </button>
        </div>

        <div class="p-6">
          <div class="space-y-4">
            <div
              class="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800"
            >
              <div
                class="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400"
              >
                <span class="mdi mdi-monitor-speaker text-2xl"></span>
              </div>
              <div class="min-w-0">
                <h4
                  class="font-bold text-lg text-gray-900 dark:text-white truncate"
                >
                  {{ displayName }}
                </h4>
                <p
                  class="text-sm text-gray-500 dark:text-gray-400 font-mono truncate"
                >
                  {{ props.client.id }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
                  >Status</label
                >
                <div class="flex items-center gap-2">
                  <span
                    class="w-2 h-2 rounded-full"
                    :class="props.client.connected ? 'bg-green-500' : 'bg-red-500'"
                  ></span>
                  <span
                    class="text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {{ status }}
                  </span>
                </div>
              </div>

              <div>
                <label
                  class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
                  >Last Seen</label
                >
                <p
                  class="text-sm font-medium text-gray-900 dark:text-white"
                >
                  {{ lastSeen }}
                </p>
              </div>

              <div>
                <label
                  class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
                  >IP Address</label
                >
                <p
                  class="text-sm font-medium text-gray-900 dark:text-white font-mono"
                >
                  {{ props.client.host.ip }}
                </p>
              </div>

              <div>
                <label
                  class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
                  >MAC Address</label
                >
                <p
                  class="text-sm font-medium text-gray-900 dark:text-white font-mono"
                >
                  {{ props.client.host.mac }}
                </p>
              </div>

              <div>
                <label
                  class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
                  >Host Name</label
                >
                <p
                  class="text-sm font-medium text-gray-900 dark:text-white truncate"
                >
                  {{ props.client.host.name }}
                </p>
              </div>

              <div>
                <label
                  class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
                  >OS / Arch</label
                >
                <p
                  class="text-sm font-medium text-gray-900 dark:text-white"
                >
                  {{ props.client.host.os }} /
                  {{ props.client.host.arch }}
                </p>
              </div>

              <div>
                <label
                  class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
                  >Version</label
                >
                <p
                  class="text-sm font-medium text-gray-900 dark:text-white"
                >
                  {{ props.client.snapclient.version }}
                </p>
              </div>

              <div>
                <label
                  class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
                  >Latency</label
                >
                <p
                  class="text-sm font-medium text-gray-900 dark:text-white"
                >
                  {{ props.client.config.latency }} ms
                </p>
              </div>

              <div>
                <label
                  class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
                  >Instance</label
                >
                <p
                  class="text-sm font-medium text-gray-900 dark:text-white"
                >
                  {{ props.client.config.instance }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end"
        >
          <button
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
            @click="emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
