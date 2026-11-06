<script setup lang="ts">
import { ref, watch } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { useAuthStore } from "@/stores/auth";
import AppDialog from "@/components/AppDialog.vue";
import type { Client } from "@/stores/snapcast";

const props = defineProps<{
  open: boolean;
  client: Client | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "deleted", clientId: string, clientName: string): void;
  (e: "saved"): void;
}>();

const snapcast = useSnapcastStore();
const auth = useAuthStore();

const name = ref("");
const latency = ref(0);
const clientId = ref<string | null>(null);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.client) {
      name.value = props.client.config.name ?? "";
      latency.value = props.client.config.latency;
      clientId.value = props.client.id;
    }
  }
);

function isClientConnected(id: string | null): boolean {
  if (!id) return false;
  const c = snapcast.findClientById(id);
  return c ? c.connected : false;
}

async function deleteClient() {
  if (!clientId.value) return;
  const id = clientId.value;
  const displayName = name.value || id;
  if (
    !window.confirm(
      `Permanently forget "${displayName}"? This deletes its saved name, volume, and latency — it'll show up as a brand-new speaker if it reconnects. This cannot be undone.`
    )
  ) {
    return;
  }
  try {
    await snapcast.deleteClient(id);
    emit("deleted", id, displayName);
    emit("close");
  } catch (e) {
    console.error("Failed to delete client:", e);
  }
}

async function save() {
  if (!clientId.value) return;
  try {
    await snapcast.setClientName(clientId.value, name.value);
    // v-model.number turns an emptied/invalid field into NaN, which
    // JSON.stringify silently sends as `null` — clamp to a safe integer
    // instead of shipping a malformed RPC param.
    const safeLatency = Number.isFinite(latency.value)
      ? Math.max(0, Math.round(latency.value))
      : 0;
    await snapcast.setClientLatency(clientId.value, safeLatency);
    emit("saved");
    emit("close");
  } catch (e) {
    console.error("Failed to save client settings:", e);
  }
}
</script>

<template>
  <AppDialog
    :open="props.open"
    title="Speaker settings"
    @close="emit('close')"
  >
    <div class="space-y-6">
      <div>
        <label
          class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
          >Name</label
        >
        <input
          class="w-full px-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-[var(--text-primary)] disabled:bg-[var(--surface-1)] disabled:text-[var(--text-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
          v-model.trim="name"
          :disabled="!auth.permissions.canRenameClients"
        />
      </div>
      <div>
        <label
          class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
          >Latency (ms)</label
        >
        <input
          type="number"
          min="0"
          class="w-full px-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-[var(--text-primary)]"
          v-model.number="latency"
        />
      </div>
    </div>

    <template #footer>
      <div class="w-full space-y-3">
        <div v-if="clientId && !isClientConnected(clientId)">
          <button
            @click="deleteClient"
            class="w-full px-4 py-2 min-h-11 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span class="mdi mdi-delete"></span>
            Delete Offline Speaker
          </button>
          <p class="mt-2 text-xs text-red-600 dark:text-red-400 text-center">
            This action cannot be undone
          </p>
        </div>
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 min-h-11 text-[var(--text-secondary)] font-medium hover:bg-[var(--surface-2)] rounded-lg transition-colors"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 min-h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
            @click="save"
          >
            Save
          </button>
        </div>
      </div>
    </template>
  </AppDialog>
</template>
