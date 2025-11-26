/**
 * Main composable for Snapserver audio streaming
 * Orchestrates WebSocket connection, decoding, time sync, and playback
 */

import { ref, computed, onUnmounted } from "vue";
import {
  parseMessage,
  parseCodecHeader,
  parseWireChunk,
  parseServerSettings,
  buildHelloMessage,
  MessageType,
  type Timestamp,
} from "@/services/audio/message-protocol";
import { createDecoder, type AudioDecoder } from "@/services/audio/decoders";
import { TimeProvider } from "@/services/audio/time-provider";
import { AudioStream } from "@/services/audio/audio-stream";

export function useSnapStream() {
  // Connection state
  const ws = ref<WebSocket | null>(null);
  const connected = ref(false);
  const connecting = ref(false);
  const error = ref<string>("");

  // Audio state
  const codec = ref<string>("");
  const latency = ref(200); // Default latency in ms
  const volume = ref(80);
  const isMuted = ref(false);

  // Audio context
  let audioCtx: AudioContext | null = null;
  let gainNode: GainNode | null = null;

  // Audio processing
  let decoder: AudioDecoder | null = null;
  let timeProvider: TimeProvider | null = null;
  let audioStream: AudioStream | null = null;

  // Playback buffers
  const activeBuffers: AudioBufferSourceNode[] = [];
  const maxActiveBuffers = 3;
  let nextPlayTime = 0;

  // Stats
  const bufferLength = computed(() => audioStream?.getBufferLength() ?? 0);
  const bufferDuration = computed(() => audioStream?.getBufferDuration() ?? 0);
  const timeDiff = computed(() => timeProvider?.getDiff() ?? 0);
  const syncSamples = computed(() => timeProvider?.getSampleCount() ?? 0);

  /**
   * Connect to Snapserver stream endpoint
   */
  async function connect(host: string): Promise<void> {
    if (connected.value || connecting.value) return;

    connecting.value = true;
    error.value = "";

    try {
      // Create Audio Context
      audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        latencyHint: "interactive",
      });

      // Create gain node for volume control
      gainNode = audioCtx.createGain();
      gainNode.gain.value = isMuted.value ? 0 : volume.value / 100;
      gainNode.connect(audioCtx.destination);

      nextPlayTime = audioCtx.currentTime;

      console.log("Audio context created");
    } catch (err) {
      console.error("Failed to create AudioContext:", err);
      error.value = "Failed to initialize audio system";
      connecting.value = false;
      return;
    }

    // Connect WebSocket to /stream endpoint
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${host}/stream`;
    console.log(`Connecting to ${url}...`);

    try {
      ws.value = new WebSocket(url);
      ws.value.binaryType = "arraybuffer";

      ws.value.onopen = () => {
        console.log("WebSocket connected");

        // Generate a random MAC address-like string
        const randomMac = Array.from({ length: 6 }, () =>
          Math.floor(Math.random() * 256)
            .toString(16)
            .padStart(2, "0")
        ).join(":");

        // Use MAC as Client ID (Snapweb behavior)
        const clientId = randomMac;

        const helloMsg = buildHelloMessage(
          "SnapCtrl", // Client Name
          window.location.hostname,
          clientId,
          randomMac // Pass MAC explicitly
        );

        ws.value?.send(helloMsg);
        console.log("Hello message sent");

        connected.value = true;
        connecting.value = false;
      };

      ws.value.onmessage = (event) => handleMessage(event.data as ArrayBuffer);

      ws.value.onclose = () => {
        console.log("WebSocket closed");
        cleanup();
        connected.value = false;
        connecting.value = false;
      };

      ws.value.onerror = (err) => {
        console.error("WebSocket error:", err);
        error.value = "Failed to connect to audio stream";
        cleanup();
        connected.value = false;
        connecting.value = false;
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      error.value = "Failed to create audio stream connection";
      connecting.value = false;
      cleanup();
    }
  }

  /**
   * Disconnect from stream
   */
  function disconnect(): void {
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
    cleanup();
    connected.value = false;
    connecting.value = false;
    codec.value = "";
    error.value = "";
  }

  /**
   * Handle binary message from server
   */
  function handleMessage(buffer: ArrayBuffer): void {
    const msg = parseMessage(buffer);

    switch (msg.type) {
      case MessageType.CodecHeader:
        handleCodecHeader(msg);
        break;
      case MessageType.WireChunk:
        handleWireChunk(msg);
        break;
      case MessageType.ServerSettings:
        handleServerSettings(msg);
        break;
      case MessageType.Time:
        handleTimeMessage(msg);
        break;
    }
  }

  /**
   * Handle codec header message
   */
  async function handleCodecHeader(msg: any): Promise<void> {
    const codecMsg = parseCodecHeader(msg);
    codec.value = codecMsg.codec;

    console.log(`Codec: ${codecMsg.codec}`);

    // Close old decoder if exists
    if (decoder) {
      decoder.close();
    }

    // Create new decoder
    decoder = createDecoder(codecMsg.codec);

    try {
      await decoder.init(codecMsg.codecPayload);
      console.log(`Decoder initialized: ${codecMsg.codec}`);

      // Create time provider
      if (!timeProvider) {
        timeProvider = new TimeProvider();
        timeProvider.start((msg) => {
          ws.value?.send(msg);
        });
        console.log("Time provider started");
      }

      // Create audio stream
      if (!audioStream && audioCtx) {
        audioStream = new AudioStream(timeProvider, decoder.getSampleRate());
        console.log("Audio stream created");

        // Start playback loop
        scheduleNextBuffer();
      }
    } catch (err) {
      console.error("Failed to initialize decoder:", err);
      error.value = `Failed to initialize ${codecMsg.codec} decoder`;
    }
  }

  /**
   * Handle wire chunk (audio data)
   */
  async function handleWireChunk(msg: any): Promise<void> {
    if (!decoder || !audioStream) return;

    const chunkMsg = parseWireChunk(msg);

    try {
      // Decode audio
      const decoded = await decoder.decode(
        chunkMsg.payload.slice(8), // Skip timestamp (first 8 bytes)
        chunkMsg.timestamp
      );

      if (decoded) {
        audioStream.addChunk(decoded);
      }
    } catch (err) {
      console.error("Failed to decode chunk:", err);
    }
  }

  /**
   * Handle server settings message
   */
  function handleServerSettings(msg: any): void {
    const settings = parseServerSettings(msg);

    console.log("Server settings:", settings);

    latency.value = settings.latency;

    if (!isMuted.value) {
      volume.value = settings.volume;
      if (gainNode) {
        gainNode.gain.value = volume.value / 100;
      }
    }
  }

  /**
   * Handle time message (sync response)
   */
  function handleTimeMessage(msg: any): void {
    if (!timeProvider) return;

    timeProvider.handleTimeMessage(msg.sent, msg.received);
  }

  /**
   * Schedule next buffer for playback
   */
  function scheduleNextBuffer(): void {
    if (!audioCtx || !gainNode || !audioStream || !connected.value) {
      return;
    }

    // Get next buffer from stream
    const decodedAudio = audioStream.getNextBuffer(latency.value);

    if (
      decodedAudio &&
      decodedAudio.samples.length > 0 &&
      decodedAudio.samples[0]
    ) {
      const samplesPerChannel = decodedAudio.samples[0].length;

      if (samplesPerChannel > 0) {
        // Create AudioBuffer
        const audioBuffer = audioCtx.createBuffer(
          decodedAudio.samples.length,
          samplesPerChannel,
          decodedAudio.sampleRate
        );

        // Copy samples to buffer
        for (let ch = 0; ch < decodedAudio.samples.length; ch++) {
          const channelData = decodedAudio.samples[ch];
          if (channelData) {
            audioBuffer.getChannelData(ch).set(channelData);
          }
        }

        // Create source
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNode);

        // Calculate play time
        const now = audioCtx.currentTime;

        if (nextPlayTime < now) {
          nextPlayTime = now;
        }

        // Start playback
        source.start(nextPlayTime);
        nextPlayTime += audioBuffer.duration;

        // Cleanup on end
        source.onended = () => {
          const index = activeBuffers.indexOf(source);
          if (index > -1) {
            activeBuffers.splice(index, 1);
          }
        };

        activeBuffers.push(source);

        // Keep only recent buffers
        if (activeBuffers.length > maxActiveBuffers) {
          const oldSource = activeBuffers.shift();
          if (oldSource) {
            try {
              oldSource.stop();
            } catch (e) {
              // Ignore errors
            }
          }
        }
      }
    }

    // Schedule next buffer
    requestAnimationFrame(() => scheduleNextBuffer());
  }

  /**
   * Toggle mute
   */
  function toggleMute(): void {
    isMuted.value = !isMuted.value;
    if (gainNode) {
      gainNode.gain.value = isMuted.value ? 0 : volume.value / 100;
    }
  }

  /**
   * Set volume (0-100)
   */
  function setVolume(newVolume: number): void {
    volume.value = Math.max(0, Math.min(100, newVolume));
    if (gainNode && !isMuted.value) {
      gainNode.gain.value = volume.value / 100;
    }
  }

  /**
   * Cleanup resources
   */
  function cleanup(): void {
    // Stop playback
    activeBuffers.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors
      }
    });
    activeBuffers.length = 0;

    // Stop time sync
    if (timeProvider) {
      timeProvider.stop();
      timeProvider = null;
    }

    // Clear stream
    if (audioStream) {
      audioStream.clear();
      audioStream = null;
    }

    // Close decoder
    if (decoder) {
      decoder.close();
      decoder = null;
    }

    // Close audio context
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }

    gainNode = null;
    nextPlayTime = 0;
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect();
  });

  return {
    // State
    connected,
    connecting,
    error,
    codec,
    latency,
    volume,
    isMuted,

    // Stats
    bufferLength,
    bufferDuration,
    timeDiff,
    syncSamples,

    // Methods
    connect,
    disconnect,
    toggleMute,
    setVolume,
  };
}
