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
          @click="connected ? disconnect() : connect()"
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
import { ref, onUnmounted, watch } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { useNotificationStore } from "@/stores/notification";

const snapcast = useSnapcastStore();
const notifications = useNotificationStore();

const ws = ref<WebSocket | null>(null);
const audioCtx = ref<AudioContext | null>(null);
const gainNode = ref<GainNode | null>(null);
const codec = ref<string>("");
const connected = ref(false);
const connecting = ref(false);
const error = ref<string>("");

// Audio buffer management
const audioSources: AudioBufferSourceNode[] = [];
const bufferSize = ref(0);
const maxBufferSize = 10;
let nextPlayTime = 0;

// Audio settings
const volume = ref(80);
const isMuted = ref(false);
const latency = ref(200);

// WAVE header info
let sampleRate = 48000;
let channels = 2;
let bitsPerSample = 16;

watch(volume, (newVolume) => {
  if (gainNode.value) {
    gainNode.value.gain.value = newVolume / 100;
  }
});

function toggleMute() {
  isMuted.value = !isMuted.value;
  if (gainNode.value) {
    gainNode.value.gain.value = isMuted.value ? 0 : volume.value / 100;
  }
}

function connect() {
  if (connected.value || connecting.value) return;

  connecting.value = true;
  error.value = "";

  try {
    audioCtx.value = new (window.AudioContext ||
      (window as any).webkitAudioContext)({
      latencyHint: "interactive",
    });

    gainNode.value = audioCtx.value.createGain();
    gainNode.value.gain.value = volume.value / 100;
    gainNode.value.connect(audioCtx.value.destination);

    nextPlayTime = audioCtx.value.currentTime;
  } catch (err) {
    console.error("Failed to create AudioContext:", err);
    error.value = "Failed to initialize audio system";
    connecting.value = false;
    return;
  }

  const url = `ws://${snapcast.host}/stream`;

  try {
    ws.value = new WebSocket(url);
    ws.value.binaryType = "arraybuffer";

    ws.value.onopen = () => {
      connected.value = true;
      connecting.value = false;

      const helloPayload = JSON.stringify({
        ClientName: "BrowserPlayer",
        HostName: window.location.hostname,
        OS: navigator.platform,
        Version: "web-1.0",
        ID: `browser-${Date.now()}`,
        Instance: 1,
      });
      const helloFrame = buildMessage(5, strToUint8(helloPayload));
      ws.value?.send(helloFrame);

      notifications.success("Browser player connected");
    };

    ws.value.onmessage = (e) => handleMessage(e.data as ArrayBuffer);

    ws.value.onclose = () => {
      cleanupAudioContext();
      connected.value = false;
      connecting.value = false;
    };

    ws.value.onerror = (err) => {
      error.value = "Failed to connect to audio stream";
      cleanupAudioContext();
      connected.value = false;
      connecting.value = false;
    };
  } catch (err) {
    error.value = "Failed to create audio stream connection";
    connecting.value = false;
  }
}

function disconnect() {
  if (ws.value) {
    ws.value.close();
    ws.value = null;
  }
  cleanupAudioContext();
  connected.value = false;
  connecting.value = false;
  codec.value = "";
  error.value = "";
}

function cleanupAudioContext() {
  audioSources.forEach((source) => {
    try {
      source.stop();
    } catch (e) {}
  });
  audioSources.length = 0;
  bufferSize.value = 0;

  if (audioCtx.value) {
    audioCtx.value.close();
    audioCtx.value = null;
  }
  gainNode.value = null;
  nextPlayTime = 0;
}

function handleMessage(buf: ArrayBuffer) {
  const dv = new DataView(buf);
  const type = dv.getUint16(0, true);
  const size = dv.getUint32(20, true);
  const payloadOffset = 24;
  const payload = new Uint8Array(buf, payloadOffset, size);

  if (type === 1) {
    handleCodecHeader(payload);
  } else if (type === 2) {
    handleWireChunk(payload);
  }
}

function handleCodecHeader(payload: Uint8Array) {
  const pdv = new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength
  );
  const codecSize = pdv.getUint32(0, true);
  const codecStr = new TextDecoder().decode(payload.slice(4, 4 + codecSize));
  codec.value = codecStr;

  if (codecStr === "PCM") {
    const waveHeaderOffset = 4 + codecSize;
    const waveHeader = payload.slice(waveHeaderOffset);
    if (waveHeader.length >= 44) {
      const wdv = new DataView(
        waveHeader.buffer,
        waveHeader.byteOffset,
        waveHeader.byteLength
      );
      channels = wdv.getUint16(22, true);
      sampleRate = wdv.getUint32(24, true);
      bitsPerSample = wdv.getUint16(34, true);
    }
  }
}

function handleWireChunk(payload: Uint8Array) {
  if (!audioCtx.value || !gainNode.value) return;

  if (codec.value === "PCM") {
    try {
      const audioBuffer = decodePCM(payload);
      if (audioBuffer) {
        scheduleAudioPlayback(audioBuffer);
      }
    } catch (err) {
      console.error("Error decoding audio chunk:", err);
    }
  }
}

function decodePCM(payload: Uint8Array): AudioBuffer | null {
  if (!audioCtx.value) return null;

  const view = new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength
  );
  const samplesPerChannel =
    payload.byteLength / (channels * (bitsPerSample / 8));

  const buffer = audioCtx.value.createBuffer(
    channels,
    samplesPerChannel,
    sampleRate
  );

  if (bitsPerSample === 16) {
    for (let ch = 0; ch < channels; ch++) {
      const channelData = buffer.getChannelData(ch);
      for (let i = 0; i < samplesPerChannel; i++) {
        const offset = (i * channels + ch) * 2;
        const sample = view.getInt16(offset, true);
        channelData[i] = sample / 32768.0;
      }
    }
  }
  // Add 24-bit support if needed, omitted for brevity as mostly 16-bit is used

  return buffer;
}

function scheduleAudioPlayback(audioBuffer: AudioBuffer) {
  if (!audioCtx.value || !gainNode.value) return;

  const source = audioCtx.value.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(gainNode.value);

  const now = audioCtx.value.currentTime;
  const latencySeconds = latency.value / 1000;

  if (nextPlayTime < now) {
    nextPlayTime = now + latencySeconds;
  }

  source.start(nextPlayTime);
  nextPlayTime += audioBuffer.duration;

  source.onended = () => {
    const index = audioSources.indexOf(source);
    if (index > -1) {
      audioSources.splice(index, 1);
      bufferSize.value = audioSources.length;
    }
  };

  audioSources.push(source);
  bufferSize.value = audioSources.length;

  if (audioSources.length > maxBufferSize) {
    const oldSource = audioSources.shift();
    if (oldSource)
      try {
        oldSource.stop();
      } catch (e) {}
    bufferSize.value = audioSources.length;
  }
}

function buildMessage(type: number, payload: Uint8Array): ArrayBuffer {
  const baseSize = 24;
  const buf = new ArrayBuffer(baseSize + payload.byteLength);
  const dv = new DataView(buf);
  dv.setUint16(0, type, true);
  const now = Date.now();
  const sec = Math.floor(now / 1000);
  const usec = (now % 1000) * 1000;
  dv.setUint32(8, sec, true);
  dv.setUint32(12, usec, true);
  dv.setUint32(16, sec, true);
  dv.setUint32(20, payload.byteLength, true);
  new Uint8Array(buf, baseSize).set(payload);
  return buf;
}

function strToUint8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

onUnmounted(() => {
  disconnect();
});
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
