<template>
  <div
    class="relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-xl md:rounded-2xl p-3 md:p-4 overflow-hidden transition-all duration-300 shadow-sm"
    :class="{
      'border-blue-500 dark:border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]':
        connected,
    }"
  >
    <div class="flex items-center justify-between gap-3 md:gap-4 relative z-10">
      <!-- Left: Status & Info -->
      <div class="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
        <div
          class="relative w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-lg md:rounded-xl flex items-center justify-center text-xl text-gray-600 dark:text-gray-300 shrink-0"
        >
          <span class="mdi mdi-headphones"></span>
          <div
            v-if="connected"
            class="absolute bottom-1.5 right-1.5 flex gap-[2px] items-end h-2.5"
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
            class="m-0 text-sm font-bold text-gray-900 dark:text-white truncate leading-tight"
          >
            Browser Player
          </h3>
          <div class="text-xs font-medium truncate leading-tight mt-0.5">
            <span
              v-if="connected"
              class="text-green-600 dark:text-green-400 flex items-center gap-1"
            >
              <span class="mdi mdi-circle-small text-lg"></span> Live Audio
            </span>
            <span
              v-else-if="connecting"
              class="text-yellow-600 dark:text-yellow-400"
              >Connecting...</span
            >
            <span v-else class="text-gray-500 dark:text-gray-400"
              >Ready to play</span
            >
          </div>

          <div v-if="connected" class="hidden md:flex gap-2 mt-1">
            <span
              class="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-gray-600 dark:text-gray-300 font-mono"
              >{{ codec || "PCM" }}</span
            >
            <span
              class="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-gray-600 dark:text-gray-300 font-mono"
              >{{ latency }}ms latency</span
            >
          </div>

          <!-- Stream Selector -->
          <div v-if="connected && currentGroup" class="mt-2">
            <select
              v-model="currentStreamId"
              class="text-xs bg-gray-100 dark:bg-slate-700 border-none rounded px-2 py-1 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer max-w-[150px] truncate"
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
        </div>
      </div>

      <!-- Right: Controls -->
      <div class="flex items-center gap-3 md:gap-4 shrink-0">
        <!-- Volume -->
        <div
          class="flex items-center gap-2 md:gap-3 transition-opacity duration-200"
          :class="{ 'opacity-50 pointer-events-none': !connected }"
        >
          <button
            class="bg-transparent border-none text-lg cursor-pointer p-1.5 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400"
            @click="toggleMute"
            :disabled="!connected"
          >
            <span
              :class="isMuted ? 'mdi mdi-volume-off' : 'mdi mdi-volume-high'"
            ></span>
          </button>

          <!-- Volume Slider (Desktop only) -->
          <div
            class="hidden md:flex flex-1 h-6 items-center relative group w-24 lg:w-32"
          >
            <input
              type="range"
              v-model.number="volume"
              min="0"
              max="100"
              class="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125 relative z-10"
              :disabled="!connected || isMuted"
            />
            <div
              class="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-blue-600 dark:bg-blue-500 rounded-full pointer-events-none"
              :style="{ width: `${volume}%` }"
            ></div>
          </div>
        </div>

        <!-- Play Button -->
        <button
          class="w-10 h-10 md:w-12 md:h-12 rounded-full border-none bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-lg md:text-xl flex items-center justify-center cursor-pointer transition-all shadow-md hover:scale-105 md:hover:scale-110 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
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
      class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm shadow-lg animate-fade-in-up whitespace-nowrap z-20"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, computed } from "vue";
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
  clientId,
} = useSnapStream();

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
