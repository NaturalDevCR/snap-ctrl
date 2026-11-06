<template>
  <div
    class="relative bg-[var(--surface-1)]/60 backdrop-blur-xl border rounded-lg md:rounded-xl px-3 py-2 overflow-hidden transition-all duration-300 shadow-sm"
    :class="
      connected
        ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
        : 'border-[var(--border)]'
    "
  >
    <div class="flex items-center justify-between gap-3 relative z-10">
      <!-- Left: Status & Info -->
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div
          class="relative w-8 h-8 bg-[var(--surface-2)] rounded-lg flex items-center justify-center text-lg text-[var(--text-secondary)] shrink-0"
        >
          <span class="mdi mdi-headphones"></span>
          <div
            v-if="connected"
            class="absolute bottom-1 right-1 flex gap-[2px] items-end h-2"
          >
            <span
              class="w-[2px] bg-blue-500 rounded-[1px] animate-[equalize_1s_ease-in-out_infinite]"
            ></span>
            <span
              class="w-[2px] bg-blue-500 rounded-[1px] animate-[equalize_1s_ease-in-out_infinite_0.2s] h-full"
            ></span>
            <span
              class="w-[2px] bg-blue-500 rounded-[1px] animate-[equalize_1s_ease-in-out_infinite_0.4s] h-[60%]"
            ></span>
          </div>
        </div>

        <div class="min-w-0 flex flex-col justify-center">
          <h3
            class="m-0 text-xs font-bold text-[var(--text-primary)] truncate leading-tight"
          >
            Browser Player
          </h3>
          <div class="text-[10px] font-medium truncate leading-tight">
            <span
              v-if="connected"
              class="text-green-600 dark:text-green-400 flex items-center gap-1"
            >
              <span class="mdi mdi-circle-small text-sm"></span> Live
            </span>
            <span
              v-else-if="connecting"
              class="text-yellow-600 dark:text-yellow-400"
              >Connecting...</span
            >
            <span v-else class="text-[var(--text-tertiary)]">Ready</span>
          </div>
        </div>

        <div class="flex items-center gap-2 min-w-0">
          <!-- Stream Selector -->
          <select
            v-if="availableStreams.length > 0"
            v-model="currentStreamId"
            aria-label="Source"
            class="h-11 text-xs bg-[var(--surface-2)] border-none rounded-lg px-2 text-[var(--text-secondary)] focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer max-w-[120px] truncate"
            @click.stop
          >
            <option
              v-for="stream in availableStreams"
              :key="stream.id"
              :value="stream.id"
            >
              {{ getStreamName(stream) }}
            </option>
          </select>

          <select
            v-if="connected"
            v-model="bufferSetting"
            class="h-11 text-xs bg-[var(--surface-2)] border-none rounded-lg px-2 text-[var(--text-secondary)] focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer max-w-[104px] truncate"
            aria-label="Jitter buffer (safety margin)"
            title="Jitter Buffer (Safety Margin)"
            @click.stop
          >
            <option :value="0">Buffer: 0ms</option>
            <option :value="500">Buffer: 0.5s</option>
            <option :value="1000">Buffer: 1s</option>
            <option :value="2000">Buffer: 2s</option>
          </select>

          <div v-if="connected" class="flex gap-1 items-center">
            <span
              class="text-[9px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-mono uppercase font-bold tracking-wider"
              title="Current Decoder"
              >{{ codec || "PCM" }}</span
            >
            <span
              class="hidden md:inline-block text-[9px] px-1 py-0.5 bg-[var(--surface-2)] rounded text-[var(--text-secondary)] font-mono"
              title="Latency"
              >{{ latency }}ms</span
            >
          </div>
        </div>
      </div>

      <!-- Right: Controls -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Volume -->
        <div
          class="flex items-center gap-2 transition-opacity duration-200"
          :class="{ 'opacity-50 pointer-events-none': !connected }"
        >
          <button
            class="w-11 h-11 flex items-center justify-center bg-transparent border-none text-lg rounded-full transition-colors hover:bg-[var(--surface-2)] text-[var(--text-tertiary)]"
            @click="toggleMute"
            :disabled="!connected"
            :aria-label="isMuted ? 'Unmute' : 'Mute'"
            :aria-pressed="isMuted"
          >
            <span
              :class="isMuted ? 'mdi mdi-volume-off' : 'mdi mdi-volume-high'"
            ></span>
          </button>

          <!-- Volume Slider (Desktop only) -->
          <div class="hidden md:flex h-11 items-center relative w-20 lg:w-24">
            <input
              type="range"
              v-model.number="sliderValue"
              min="0"
              max="100"
              aria-label="Browser player volume"
              class="app-range relative z-10"
              :disabled="!connected || isMuted"
            />
            <div
              class="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full pointer-events-none"
              :style="{ width: `${sliderValue}%` }"
            ></div>
          </div>
        </div>

        <!-- Play Button -->
        <button
          class="w-11 h-11 rounded-full border-none bg-[var(--text-primary)] text-[var(--surface-1)] text-lg flex items-center justify-center transition-all shadow-sm hover:scale-105 hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          :class="{ '!bg-blue-600 dark:!bg-blue-500 !text-white': connected }"
          @click="handleConnect"
          :disabled="connecting"
          :aria-label="connecting ? 'Connecting…' : connected ? 'Stop playback' : 'Play in browser'"
        >
          <span v-if="connecting" class="mdi mdi-loading mdi-spin"></span>
          <span v-else-if="connected" class="mdi mdi-stop"></span>
          <span v-else class="mdi mdi-play pl-0.5"></span>
        </button>
      </div>
    </div>

    <div
      v-if="error"
      class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[var(--status-attention-deep)] text-white px-3 py-1 rounded text-xs shadow-md animate-fade-in-up whitespace-nowrap z-20"
    >
      {{ error }}
    </div>
  </div>

  <!-- Temporary Group Card (Simplified) -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="currentGroup"
      class="mt-2 mx-1 bg-[var(--surface-1)] border border-blue-200 dark:border-blue-900/30 rounded-lg px-3 py-2 flex items-center justify-between shadow-sm"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span
          class="flex items-center justify-center w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        >
          <span class="mdi mdi-speaker-group text-xs"></span>
        </span>
        <div class="min-w-0">
          <p class="text-xs font-bold text-[var(--text-primary)] truncate">
            {{ currentGroup.name }}
          </p>
          <p class="text-[10px] text-[var(--text-tertiary)] truncate">
            {{ connected ? "Temporary Audio Zone" : "Stale Browser Player" }}
          </p>
        </div>
      </div>
      <button
        @click="cleanTemporaryGroup"
        class="shrink-0 min-h-11 min-w-11 inline-flex items-center justify-center gap-1 px-3 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-colors"
        title="Remove this temporary zone"
      >
        <span class="mdi mdi-delete-outline"></span>
        Cleanup
      </button>
    </div>
  </Transition>
</template>


<script setup lang="ts">
import { logger } from "@/utils/logger";
import { watch, computed, ref } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { useNotificationStore } from "@/stores/notification";
import { useSnapStream } from "@/composables/useSnapStream";

import { useSettingsStore } from "@/stores/settings";
import { sliderToVolume, volumeToSlider } from "@/utils/volume";
import { getStreamName } from "@/utils/stream-name";

const snapcast = useSnapcastStore();
const settings = useSettingsStore();
const notifications = useNotificationStore();

const {
  connected,
  connecting,
  error,
  codec,
  latency,
  volume,
  isMuted,
  bufferLength,
  bufferDuration,
  timeDiff,
  syncSamples,
  connect,
  disconnect,
  toggleMute,
  setVolume,
  setAdditionalLatency,
  clientId,
  setInternalMute,
  cleanupBrowserClient,
  retryPendingClientCleanups,
} = useSnapStream();

// Buffer Settings
const bufferSetting = ref(parseInt(localStorage.getItem("snapcast-buffer") || "0"));

watch(bufferSetting, (val) => {
  localStorage.setItem("snapcast-buffer", val.toString());
  setAdditionalLatency(val);
});

// Initialize buffer
setAdditionalLatency(bufferSetting.value);

// Stream Selection Logic
const currentGroup = computed(() => {
  if (!clientId.value) return null;
  // Find the group that contains this client
  return snapcast.groups.find((g) =>
    g.clients.some((c) => c.id === clientId.value)
  );
});

// Local stream selection preference (No persistence)
const selectedStreamId = ref("");

const availableStreams = computed(() => snapcast.streams);

// Auto-select first stream if none selected
watch(
  () => availableStreams.value,
  (streams) => {
    if (!selectedStreamId.value && streams.length > 0 && streams[0]) {
      selectedStreamId.value = streams[0].id;
    }
  },
  { immediate: true }
);

// Watch for stream mismatch to mute playback until synced
watch(
  [() => currentGroup.value?.stream_id, selectedStreamId, connected],
  ([groupStreamId, selected, isConnected]) => {
    if (!isConnected) {
      setInternalMute(false);
      return;
    }

    // If user has a selected stream, ensure we are playing THAT stream
    if (selected) {
      // If group info is missing OR stream doesn't match -> MUTE
      if (!groupStreamId || groupStreamId !== selected) {
        logger.debug(`Muting browser player: stream sync pending (${groupStreamId} -> ${selected})`);
        setInternalMute(true);
        return;
      }
    }

    // Unmute when matched or no valid selection
    setInternalMute(false);
  },
  { immediate: true }
);

// Volume Exponent
const volumeExponent = computed(() => {
  return settings.getVolumeExponent(currentGroup.value?.id);
});

// Slider Value (0-100)
const sliderValue = computed({
  get: () => volumeToSlider(volume.value, volumeExponent.value),
  set: (val: number) => {
    volume.value = sliderToVolume(val, volumeExponent.value);
  }
});

const currentStreamId = computed({
  get: () => {
    // If we have a local preference, use it. Otherwise fall back to actual group stream.
    if (selectedStreamId.value) return selectedStreamId.value;
    return currentGroup.value?.stream_id || "";
  },
  set: (newStreamId: string) => {
    selectedStreamId.value = newStreamId;
    
    // If connected and we have a group, apply it immediately
    if (currentGroup.value && newStreamId) {
      snapcast.setGroupStream(currentGroup.value.id, newStreamId);
    }
  },
});



// Sync stream when connecting or when group becomes available
watch([connected, currentGroup], ([isConnected, group]) => {
  if (isConnected && group && selectedStreamId.value) {
    if (group.stream_id !== selectedStreamId.value) {
      logger.debug(`Syncing browser player stream to preferred: ${selectedStreamId.value}`);
      snapcast.setGroupStream(group.id, selectedStreamId.value);
    }
  }
});

// Watch volume changes
watch(volume, (newVolume) => {
  setVolume(newVolume);
});

// Watch connected state for notifications
watch(connected, (isConnected) => {
  if (isConnected) {
    notifications.success("Browser player connected");
  }
});

watch(
  () => snapcast.isConnected && snapcast.groups.length > 0,
  (ready) => {
    if (ready) {
      retryPendingClientCleanups();
    }
  },
  { immediate: true }
);

async function handleConnect() {
  if (connected.value) {
    await disconnect();
  } else {
    connect(snapcast.host);
  }
}

async function cleanTemporaryGroup() {
  const idToDelete = clientId.value;
  const groupToClean = currentGroup.value;
  if (idToDelete) {
    try {
      const clientExistsOnServer = snapcast.clients.some(
        (c) => c.id === idToDelete
      );

      let cleaned = false;
      if (clientExistsOnServer) {
        cleaned = connected.value
          ? await disconnect()
          : await cleanupBrowserClient(idToDelete);
      } else {
        cleaned = true;
      }

      if (
        !cleaned &&
        groupToClean &&
        groupToClean.clients.length === 1 &&
        groupToClean.clients[0]?.id === idToDelete
      ) {
        await snapcast.setGroupClients(groupToClean.id, []);
        await snapcast.getServerStatus();
        cleaned = true;
      }

      if (cleaned) {
        notifications.success("Temporary zone cleaned up");
      } else {
        notifications.error("Cleanup failed. The speaker may already be gone.");
      }
    } catch (e) {
      console.error("Failed to clean up group:", e);
      notifications.error("Failed to clean up zone");
    }
  }
}
</script>

<style scoped>
@keyframes equalize {
  0%,
  100% {
    height: 20%;
  }
  50% {
    height: 100%;
  }
}
</style>
