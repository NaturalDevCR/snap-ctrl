<template>
  <div
    class="relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-lg md:rounded-xl px-3 py-2 overflow-hidden transition-all duration-300 shadow-sm"
    :class="{
      'border-blue-500 dark:border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]':
        connected,
    }"
  >
    <div class="flex items-center justify-between gap-3 relative z-10">
      <!-- Left: Status & Info -->
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div
          class="relative w-8 h-8 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-lg text-gray-600 dark:text-gray-300 shrink-0"
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
          <div class="flex items-center gap-2">
            <h3
              class="m-0 text-xs font-bold text-gray-900 dark:text-white truncate leading-tight"
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
              <span v-else class="text-gray-500 dark:text-gray-400">Ready</span>
            </div>
          </div>

          <div class="flex items-center gap-2 mt-0.5">
            <!-- Stream Selector -->
            <div v-if="connected && currentGroup" class="flex items-center">
              <select
                v-model="currentStreamId"
                class="text-[10px] bg-gray-100 dark:bg-slate-700 border-none rounded px-1.5 py-0.5 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer max-w-[120px] truncate"
                @click.stop
              >
                <option
                  v-for="stream in availableStreams"
                  :key="stream.id"
                  :value="stream.id"
                >
                  {{ stream.id }}
                </option>
              </select>
            </div>
            
            <div v-if="connected" class="flex items-center">
              <select
                v-model="bufferSetting"
                class="text-[10px] bg-gray-100 dark:bg-slate-700 border-none rounded px-1.5 py-0.5 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer max-w-[80px] truncate"
                title="Jitter Buffer (Safety Margin)"
                @click.stop
              >
                <option :value="0">Buffer: 0ms</option>
                <option :value="500">Buffer: 0.5s</option>
                <option :value="1000">Buffer: 1s</option>
                <option :value="2000">Buffer: 2s</option>
              </select>
            </div>

            <div v-if="connected" class="flex gap-1 items-center">
              <span
                class="text-[9px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-mono uppercase font-bold tracking-wider"
                title="Current Decoder"
                >{{ codec || "PCM" }}</span
              >
              <span
                class="hidden md:inline-block text-[9px] px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-gray-600 dark:text-gray-300 font-mono"
                title="Latency"
                >{{ latency }}ms</span
              >
            </div>
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
            class="bg-transparent border-none text-base cursor-pointer p-1 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400"
            @click="toggleMute"
            :disabled="!connected"
          >
            <span
              :class="isMuted ? 'mdi mdi-volume-off' : 'mdi mdi-volume-high'"
            ></span>
          </button>

          <!-- Volume Slider (Desktop only) -->
          <div
            class="hidden md:flex flex-1 h-4 items-center relative group w-20 lg:w-24"
          >
            <input
              type="range"
              v-model.number="volume"
              min="0"
              max="100"
              class="w-full h-1 bg-gray-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125 relative z-10"
              :disabled="!connected || isMuted"
            />
            <div
              class="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 dark:bg-blue-500 rounded-full pointer-events-none"
              :style="{ width: `${volume}%` }"
            ></div>
          </div>
        </div>

        <!-- Play Button -->
        <button
          class="w-8 h-8 rounded-full border-none bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base flex items-center justify-center cursor-pointer transition-all shadow-sm hover:scale-105 hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          :class="{ '!bg-blue-600 dark:!bg-blue-500 !text-white': connected }"
          @click="handleConnect"
          :disabled="connecting"
        >
          <span v-if="connecting" class="mdi mdi-loading mdi-spin"></span>
          <span v-else-if="connected" class="mdi mdi-stop"></span>
          <span v-else class="mdi mdi-play pl-0.5"></span>
        </button>
      </div>
    </div>

    <div
      v-if="error"
      class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-red-500 text-white px-3 py-1 rounded text-xs shadow-md animate-fade-in-up whitespace-nowrap z-20"
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
      v-if="connected && currentGroup"
      class="mt-2 mx-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/30 rounded-lg px-3 py-2 flex items-center justify-between shadow-sm"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span
          class="flex items-center justify-center w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        >
          <span class="mdi mdi-speaker-group text-xs"></span>
        </span>
        <div class="min-w-0">
          <p class="text-xs font-bold text-gray-900 dark:text-white truncate">
            {{ currentGroup.name }}
          </p>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 truncate">
            Temporary Audio Group
          </p>
        </div>
      </div>
      <button
        @click="cleanTemporaryGroup"
        class="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded transition-colors"
        title="Remove this temporary group"
      >
        <span class="mdi mdi-delete-outline"></span>
        Cleanup
      </button>
    </div>
  </Transition>
</template>


<script setup lang="ts">
import { watch, computed, ref } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { useNotificationStore } from "@/stores/notification";
import { useSnapStream } from "@/composables/useSnapStream";

const snapcast = useSnapcastStore();
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

const currentStreamId = computed({
  get: () => currentGroup.value?.stream_id || "",
  set: (newStreamId: string) => {
    if (currentGroup.value && newStreamId) {
      snapcast.setGroupStream(currentGroup.value.id, newStreamId);
    }
  },
});

const availableStreams = computed(() => snapcast.streams);

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

async function handleConnect() {
  if (connected.value) {
    await disconnect();
  } else {
    connect(snapcast.host);
  }
}

async function cleanTemporaryGroup() {
  const idToDelete = clientId.value;
  if (idToDelete) {
    try {
      if (connected.value) {
        // disconnect() handles cleaning up the client from the server
        await disconnect();
      } else {
        // If not connected, we need to manually clean up
        await snapcast.deleteClient(idToDelete);
      }
      notifications.success("Temporary group cleaned up");
    } catch (e) {
      console.error("Failed to clean up group:", e);
      notifications.error("Failed to clean up group");
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
