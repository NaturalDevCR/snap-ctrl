<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { getStreamName } from "@/utils/stream-name";
import type { Client } from "@/stores/snapcast";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "created"): void;
}>();

const snapcast = useSnapcastStore();

const streamId = ref<string | null>(null);
const clientIds = ref<string[]>([]);

const availableClients = computed<Client[]>(() => snapcast.filteredClients);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      clientIds.value = [];
      streamId.value =
        snapcast.filteredStreams.length > 0
          ? snapcast.filteredStreams[0]?.id ?? null
          : null;
    }
  }
);

async function createGroup() {
  if (clientIds.value.length === 0) return;
  if (!streamId.value) return;

  try {
    await snapcast.setGroupClients("", clientIds.value);
    await snapcast.getServerStatus();

    const newGroup = snapcast.groups.find((g) =>
      g.clients.some((c) => clientIds.value.includes(c.id))
    );

    if (newGroup && streamId.value) {
      await snapcast.setGroupStream(newGroup.id, streamId.value);
    }

    emit("created");
    emit("close");
  } catch (error) {
    console.error("Failed to create group:", error);
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
              >Stream</label
            >
            <div class="relative">
              <select
                v-model="streamId"
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

          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >Select Clients</label
            >
            <div class="max-h-48 overflow-y-auto space-y-2 p-1">
              <label
                v-for="c in availableClients"
                :key="c.id"
                class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <div class="flex items-center gap-2 flex-1">
                  <span
                    class="w-2 h-2 rounded-full flex-shrink-0"
                    :class="
                      c.connected
                        ? 'bg-green-500'
                        : 'bg-gray-400 dark:bg-gray-600'
                    "
                  ></span>
                  <span
                    class="font-medium text-gray-700 dark:text-gray-200 truncate"
                    >{{ c.config.name || c.host.name }}</span
                  >
                  <span
                    v-if="!c.connected"
                    class="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded flex-shrink-0"
                  >
                    Offline
                  </span>
                </div>
                <div
                  class="relative inline-flex items-center cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :value="c.id"
                    v-model="clientIds"
                    class="sr-only peer"
                  />
                  <div
                    class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                  ></div>
                </div>
              </label>
            </div>
            <p
              v-if="availableClients.length === 0"
              class="mt-3 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30"
            >
              All clients are already assigned to groups. You can move
              clients between groups using group settings.
            </p>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3"
        >
          <button
            class="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            @click="createGroup"
            :disabled="clientIds.length === 0"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
