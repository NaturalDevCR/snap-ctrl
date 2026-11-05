<script setup lang="ts">
import { computed } from "vue";
import { formatLastSeen } from "@/utils/last-seen";
import AppDialog from "@/components/AppDialog.vue";
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
  <AppDialog
    :open="props.open && !!props.client"
    title="Speaker details"
    title-icon="mdi-information-outline"
    @close="emit('close')"
  >
    <div v-if="props.client" class="space-y-4">
      <div
        class="flex items-center gap-3 pb-4 border-b border-[var(--border)]"
      >
        <div
          class="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400"
        >
          <span class="mdi mdi-monitor-speaker text-2xl"></span>
        </div>
        <div class="min-w-0">
          <h4
            class="font-bold text-lg text-[var(--text-primary)] truncate"
          >
            {{ displayName }}
          </h4>
          <p
            class="text-sm text-[var(--text-tertiary)] font-mono truncate"
          >
            {{ props.client.id }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label
            class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1"
            >Status</label
          >
          <div class="flex items-center gap-2">
            <span
              class="w-2 h-2 rounded-full"
              :class="props.client.connected ? 'bg-[var(--status-playing)]' : 'bg-[var(--status-idle)]'"
            ></span>
            <span
              class="text-sm font-medium text-[var(--text-primary)]"
            >
              {{ status }}
            </span>
          </div>
        </div>

        <div>
          <label
            class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1"
            >Last Seen</label
          >
          <p
            class="text-sm font-medium text-[var(--text-primary)]"
          >
            {{ lastSeen }}
          </p>
        </div>

        <div>
          <label
            class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1"
            >IP Address</label
          >
          <p
            class="text-sm font-medium text-[var(--text-primary)] font-mono"
          >
            {{ props.client.host.ip }}
          </p>
        </div>

        <div>
          <label
            class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1"
            >MAC Address</label
          >
          <p
            class="text-sm font-medium text-[var(--text-primary)] font-mono"
          >
            {{ props.client.host.mac }}
          </p>
        </div>

        <div>
          <label
            class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1"
            >Host Name</label
          >
          <p
            class="text-sm font-medium text-[var(--text-primary)] truncate"
          >
            {{ props.client.host.name }}
          </p>
        </div>

        <div>
          <label
            class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1"
            >OS / Arch</label
          >
          <p
            class="text-sm font-medium text-[var(--text-primary)]"
          >
            {{ props.client.host.os }} /
            {{ props.client.host.arch }}
          </p>
        </div>

        <div>
          <label
            class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1"
            >Version</label
          >
          <p
            class="text-sm font-medium text-[var(--text-primary)]"
          >
            {{ props.client.snapclient.version }}
          </p>
        </div>

        <div>
          <label
            class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1"
            >Latency</label
          >
          <p
            class="text-sm font-medium text-[var(--text-primary)]"
          >
            {{ props.client.config.latency }} ms
          </p>
        </div>

        <div>
          <label
            class="block text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1"
            >Instance</label
          >
          <p
            class="text-sm font-medium text-[var(--text-primary)]"
          >
            {{ props.client.config.instance }}
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="w-full flex justify-end">
        <button
          class="px-4 py-2 min-h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          @click="emit('close')"
        >
          Close
        </button>
      </div>
    </template>
  </AppDialog>
</template>
