<script setup lang="ts">
import { ref, watch } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { useAuthStore } from "@/stores/auth";
import Tooltip from "@/components/Tooltip.vue";
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
    await snapcast.setClientLatency(clientId.value, latency.value);
    emit("saved");
    emit("close");
  } catch (e) {
    console.error("Failed to save client settings:", e);
  }
}
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
      v-if="props.open"
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
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">
            Client Settings
          </h3>
          <button
            @click="emit('close')"
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
              class="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-slate-800/50"
              v-model.trim="name"
              :disabled="!auth.permissions.canRenameClients"
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
              v-model.number="latency"
            />
          </div>
        </div>

        <div
          v-if="clientId && !isClientConnected(clientId)"
          class="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800"
        >
          <button
            @click="deleteClient"
            class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span class="mdi mdi-delete"></span>
            Delete Offline Client
          </button>
          <p
            class="mt-2 text-xs text-red-600 dark:text-red-400 text-center"
          >
            This action cannot be undone
          </p>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2"
        >
          <Tooltip text="Cancel">
              <button
                class="w-10 h-10 flex items-center justify-center rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                @click="emit('close')"
              >
                <span class="mdi mdi-close text-xl"></span>
              </button>
          </Tooltip>
          <Tooltip text="Save Changes">
              <button
                class="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                @click="save"
              >
                <span class="mdi mdi-check text-xl"></span>
              </button>
          </Tooltip>
        </div>
      </div>
    </div>
  </Transition>
</template>
