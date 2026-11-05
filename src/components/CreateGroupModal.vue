<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { getStreamName } from "@/utils/stream-name";
import { getGroupDisplayName } from "@/utils/group-name";
import AppDialog from "@/components/AppDialog.vue";
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

// A client picked here can currently belong to another group — Snapcast
// clients only ever belong to one group at a time, so adding one here
// silently pulls it out of wherever it already is. filteredClients doesn't
// distinguish "unassigned" from "already grouped", so surface which group
// (if any) each client would be moved out of instead of letting that
// happen invisibly.
const clientCurrentGroup = computed(() => {
  const map = new Map<string, string>();
  for (const g of snapcast.groups) {
    const label = getGroupDisplayName(g, snapcast.streams);
    for (const c of g.clients) {
      // A client sits in exactly one group's `clients` array, so no
      // conflict is possible here — later groups can't overwrite an
      // earlier assignment for the same id.
      map.set(c.id, label);
    }
  }
  return map;
});

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
  <AppDialog :open="props.open" title="Create New Group" size="lg" @close="emit('close')">
    <div class="space-y-6">
      <div>
        <label
          class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
          >Stream</label
        >
        <div class="relative">
          <select
            v-model="streamId"
            class="w-full pl-4 pr-10 py-2.5 min-h-11 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-[var(--text-primary)]"
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
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
          >
            <span class="mdi mdi-chevron-down"></span>
          </span>
        </div>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
          >Select Clients</label
        >
        <div class="space-y-2">
          <label
            v-for="c in availableClients"
            :key="c.id"
            class="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
          >
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1 flex-1 min-w-0 pr-3">
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :class="
                  c.connected
                    ? 'bg-green-500'
                    : 'bg-gray-400 dark:bg-gray-600'
                "
              ></span>
              <span
                class="font-medium text-[var(--text-secondary)] truncate min-w-0"
                >{{ c.config.name || c.host.name }}</span
              >
              <span
                v-if="!c.connected"
                class="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded flex-shrink-0"
              >
                Offline
              </span>
              <span
                v-if="clientCurrentGroup.has(c.id)"
                class="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded max-w-full truncate"
                :title="`Currently in ${clientCurrentGroup.get(c.id)} — adding it here moves it out of that group`"
              >
                From: {{ clientCurrentGroup.get(c.id) }}
              </span>
            </div>
            <div
              class="relative inline-flex items-center cursor-pointer shrink-0"
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
        <!-- This list shows every client regardless of its current
             group (see the "From: <group>" badge above) — it's never
             actually empty because clients are "already assigned"; it's
             empty because the server doesn't know about any clients
             yet. -->
        <p
          v-if="availableClients.length === 0"
          class="mt-3 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30"
        >
          No clients connected yet. Start a Snapcast client and it will
          appear here.
        </p>
      </div>
    </div>

    <template #footer>
      <div class="w-full flex justify-end gap-3">
        <button
          class="px-4 py-2 min-h-11 text-[var(--text-secondary)] font-medium hover:bg-[var(--surface-2)] rounded-lg transition-colors"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 min-h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          @click="createGroup"
          :disabled="clientIds.length === 0"
        >
          Create Group
        </button>
      </div>
    </template>
  </AppDialog>
</template>
