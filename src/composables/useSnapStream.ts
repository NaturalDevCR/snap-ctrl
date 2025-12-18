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
  timestampToMs,
  buildHelloMessage,
  MessageType,
  type Timestamp,
  type SampleFormat,
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
  const clientId = ref<string>("");

  // Audio state
  const codec = ref<string>("");
  const bufferMs = ref(1000); // Default buffer 1000ms
  const latency = ref(0);
  const volume = ref(80);
  const isMuted = ref(false);
  const sampleFormat = ref<SampleFormat | null>(null);

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

  // Event handlers for AudioContext resume
  let handleVisibilityChange: (() => void) | null = null;
  let handleFocus: (() => void) | null = null;

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

        // Get or generate persistent Client ID
        let storedId = localStorage.getItem("snapcast-client-id");
        if (!storedId) {
          // Generate a random MAC address-like string
          storedId = Array.from({ length: 6 }, () =>
            Math.floor(Math.random() * 256)
              .toString(16)
              .padStart(2, "0")
          ).join(":");
          localStorage.setItem("snapcast-client-id", storedId);
        }

        clientId.value = storedId;

        const helloMsg = buildHelloMessage(
          "SnapCtrl", // Client Name
          window.location.hostname,
          storedId,
          storedId // Pass MAC explicitly
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

    // Handle AudioContext suspension when tab loses focus
    // Resume audio context when tab becomes visible/focused again
    handleVisibilityChange = () => {
      if (audioCtx && audioCtx.state === "suspended" && !document.hidden) {
        console.log("Resuming AudioContext after visibility change");
        audioCtx.resume().catch((err) => {
          console.error("Failed to resume AudioContext:", err);
        });
      }
    };

    handleFocus = () => {
      if (audioCtx && audioCtx.state === "suspended") {
        console.log("Resuming AudioContext after focus");
        audioCtx.resume().catch((err) => {
          console.error("Failed to resume AudioContext:", err);
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
  }

  /**
   * Disconnect from stream
   */
  async function disconnect(): Promise<void> {
    // Store clientId before cleanup
    const clientToDelete = clientId.value;

    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
    cleanup();
    connected.value = false;
    connecting.value = false;
    codec.value = "";
    error.value = "";

    // Clean up the browser player client from the server
    // This will automatically remove the orphaned group if it becomes empty
    if (clientToDelete) {
      try {
        // Import snapcast store dynamically to avoid circular dependency
        const { useSnapcastStore } = await import("@/stores/snapcast");
        const snapcast = useSnapcastStore();

        console.log(`Cleaning up browser player client: ${clientToDelete}`);
        await snapcast.deleteClient(clientToDelete);
      } catch (error) {
        console.warn("Failed to cleanup browser player client:", error);
        // Don't throw - cleanup failure shouldn't prevent disconnection
      }
    }

    // Clear clientId after cleanup attempt
    clientId.value = "";
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
      // Initialize decoder with header payload
      await decoder.init(codecMsg.payload);
      sampleFormat.value = decoder.getSampleFormat();
      console.log("Decoder initialized:", codecMsg.codec);

      // Create time provider with AudioContext
      if (!timeProvider && audioCtx) {
        timeProvider = new TimeProvider(audioCtx);
        timeProvider.start((msg) => {
          ws.value?.send(msg);
        });
        console.log("Time provider started");
      }

      // Create audio stream
      if (!audioStream && audioCtx && timeProvider) {
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

    if (!sampleFormat.value) return;
    const chunkMsg = parseWireChunk(msg, sampleFormat.value);

    try {
      // Decode audio - payload is already pure audio data (timestamps extracted by parseWireChunk)
      const decoded = await decoder.decode(
        chunkMsg.payload,
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

    bufferMs.value = settings.bufferMs;
    latency.value = settings.latency;
    bufferMs.value = settings.bufferMs;

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
    // console.log("Received TimeMessage", msg);

    if (!timeProvider) return;

    // Parse latency from payload (8 bytes: sec + usec)
    if (!msg.payload || msg.payload.length < 8) {
      console.warn("Invalid TimeMessage payload");
      return;
    }

    const dv = new DataView(
      msg.payload.buffer,
      msg.payload.byteOffset,
      msg.payload.byteLength
    );
    const latency = {
      sec: dv.getInt32(0, true),
      usec: dv.getInt32(4, true),
    };

    // Call handleTimeResponse with latency from payload
    timeProvider.handleTimeResponse(msg.id, msg.sent, msg.received, latency);
  }

  /**
   * Schedule next buffer for playback
   */
  function scheduleNextBuffer(): void {
    if (!audioCtx || !gainNode || !audioStream || !connected.value) {
      return;
    }

    // Get next buffer from stream
    // Buffer playback: chunks with timestamp = now - (bufferMs + latency)
    const decodedAudio = audioStream.getNextBuffer(
      -(bufferMs.value + latency.value)
    );

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

        // Soft sync: adjust playback rate to match server time
        if (timeProvider && decodedAudio.timestamp) {
          // When we plan to play this chunk
          const serverPlayTime = timeProvider.serverTime(nextPlayTime * 1000);

          // When the chunk SHOULD be played (server time)
          const targetPlayTime =
            decodedAudio.timestamp.sec * 1000 +
            decodedAudio.timestamp.usec / 1000 +
            bufferMs.value;

          // Drift: positive means we are playing LATE (need to speed up)
          // negative means we are playing EARLY (need to slow down)
          const drift = serverPlayTime - targetPlayTime;

          let rate = 1.0;

          // Ignore drift < 50ms to prevent resampling artifacts
          if (Math.abs(drift) > 50) {
            // Correction: correct over 2 seconds (gentler)
            rate = 1.0 + drift / 2000;
          }

          // Limit rate to avoid pitch bending artifacts (0.95 - 1.05)
          source.playbackRate.value = Math.max(0.95, Math.min(1.05, rate));

          // console.log(
          //   `Sync: drift=${drift.toFixed(
          //     2
          //   )}ms, rate=${source.playbackRate.value.toFixed(4)}`
          // );
        }

        // Start playback
        source.start(nextPlayTime);
        nextPlayTime += audioBuffer.duration / source.playbackRate.value;

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

    // Remove event listeners
    if (handleVisibilityChange) {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      handleVisibilityChange = null;
    }
    if (handleFocus) {
      window.removeEventListener("focus", handleFocus);
      handleFocus = null;
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect();
  });

  // Also cleanup on page unload (tab close, navigation, etc.)
  // This ensures cleanup even if onUnmounted doesn't complete
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      // Call disconnect synchronously
      // Note: The async cleanup in disconnect() will do its best before the page closes
      disconnect();
    });
  }

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
    clientId,
  };
}
