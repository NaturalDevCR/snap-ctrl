/**
 * Audio stream buffer manager
 * Manages queued audio chunks and handles time synchronization
 */

import { type DecodedAudio } from "./decoders";
import { type Timestamp, timestampToMs } from "./message-protocol";
import { TimeProvider } from "./time-provider";

interface AudioChunk {
  audio: DecodedAudio;
  timestamp: Timestamp;
  playTime: number; // When this chunk should start playing (ms)
}

export class AudioStream {
  private chunks: AudioChunk[] = [];
  private readonly maxChunks = 1000; // Support up to ~20s buffer (assuming 20ms chunks)
  private playedFrames = 0;
  private readonly hardSyncThreshold = 500; // ms - increased to allow playbackRate sync
  private readonly softSyncThreshold = 60; // ms - reduced to enable soft sync before hard sync
  private readonly softSyncFrames = 10; // frames to adjust per sync

  constructor(private timeProvider: TimeProvider, private sampleRate: number) {}

  /**
   * Add a decoded audio chunk to the stream
   */
  addChunk(audio: DecodedAudio): void {
    if (!audio.timestamp) {
      console.warn("Audio chunk missing timestamp, skipping");
      return;
    }

    const timestamp = audio.timestamp;
    const playTime = timestampToMs(timestamp);

    this.chunks.push({
      audio,
      timestamp,
      playTime,
    });

    // Keep only recent chunks
    if (this.chunks.length > this.maxChunks) {
      this.chunks.shift();
    }
  }

  /**
   * Get the next audio buffer for playback, applying synchronization
   * @param clientPlayTime - The client time (AudioContext) when this buffer will start playing
   * @param latencyMs - Latency offset
   */
  getNextBuffer(clientPlayTime: number, latencyMs: number): DecodedAudio | null {
    if (this.chunks.length === 0) {
      return null;
    }
    
    // Ensure we are synced before attempting to calculate server time
    if (!this.timeProvider.isSynced()) {
       return null; 
    }

    // Convert to server time for comparison with chunk timestamps
    // Chunks have server absolute timestamps, so we need to convert our playback time
    const serverPlaybackTime = this.timeProvider.serverTime(
      clientPlayTime + latencyMs
    );

    // Find the chunk that should be playing now
    let chunkIndex = -1;

    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      if (chunk && chunk.playTime <= serverPlaybackTime) {
        chunkIndex = i;
      } else {
        break;
      }
    }

    if (chunkIndex === -1 && this.chunks.length > 0) {
      // If we couldn't find a chunk that started in the past,
      // check if the first chunk is "close enough" (or if we just need to play it to maintain flow).
      // If the first chunk is in the future relative to serverPlaybackTime, 
      // it means we are slightly behind the data stream (or data is future).
      // We should start playing it to avoid starvation.
      // The sync logic will handle the time difference (inserting silence if needed).
      chunkIndex = 0;
      
      // Optional: limit how far we jump?
      // For now, assume any gap is better filled than starving.
    }

    if (chunkIndex === -1) {
      // No chunk ready yet, too early (and no future chunks?)
      return null;
    }

    // Get the chunk
    const chunk = this.chunks[chunkIndex];
    if (!chunk) {
      return null;
    }

    const timeDiff = serverPlaybackTime - chunk.playTime;

    // Remove chunks up to and including this one
    this.chunks.splice(0, chunkIndex + 1);

    // Apply synchronization
    return this.applySync(chunk.audio, timeDiff);
  }

  /**
   * Apply time synchronization to audio
   */
  private applySync(audio: DecodedAudio, timeDiff: number): DecodedAudio {
    const absTimeDiff = Math.abs(timeDiff);

    // Hard sync: large time difference (> 5ms)
    if (absTimeDiff > this.hardSyncThreshold) {
      return this.hardSync(audio, timeDiff);
    }

    // Soft sync: small time difference (0.1ms - 5ms)
    if (absTimeDiff > this.softSyncThreshold) {
      return this.softSync(audio, timeDiff);
    }

    // No sync needed
    return audio;
  }

  /**
   * Hard sync: discard old samples or insert silence
   */
  private hardSync(audio: DecodedAudio, timeDiff: number): DecodedAudio {
    const framesToAdjust = Math.floor(
      (Math.abs(timeDiff) / 1000) * this.sampleRate
    );

    const firstChannel = audio.samples[0];
    if (!firstChannel) {
      return audio;
    }

    if (timeDiff > 0) {
      // We're ahead, need to discard frames
      const framesToDiscard = Math.min(framesToAdjust, firstChannel.length);

      if (framesToDiscard >= firstChannel.length) {
        // Discard entire chunk
        console.log(
          `Hard sync: discarding entire chunk (${timeDiff.toFixed(2)}ms ahead)`
        );
        return {
          samples: audio.samples.map(() => new Float32Array(0)),
          sampleRate: audio.sampleRate,
        };
      }

      // console.log(
      //   `Hard sync: discarding ${framesToDiscard} frames (${timeDiff.toFixed(
      //     2
      //   )}ms ahead, now=${this.timeProvider.now().toFixed(0)}, chunk=${
      //     audio.timestamp?.sec
      //   }.${audio.timestamp?.usec})`
      // );

      return {
        samples: audio.samples.map((channel) => channel.slice(framesToDiscard)),
        sampleRate: audio.sampleRate,
      };
    } else {
      // We're behind, need to insert silence
      const absDiff = Math.abs(timeDiff);
      
      // SAFETY GUARD: If the lag is massive (> 60 seconds), something is wrong with sync.
      // Do not attempt to allocate gigabytes of silence.
      if (absDiff > 60000) {
         console.warn(`Hard sync: Ignoring massive lag of ${absDiff.toFixed(2)}ms. Clock not synced?`);
         return audio;
      }
      
      console.log(
        `Hard sync: inserting ${framesToAdjust} silent frames (${Math.abs(
          timeDiff
        ).toFixed(2)}ms behind)`
      );

      return {
        samples: audio.samples.map((channel) => {
          try {
             const newChannel = new Float32Array(channel.length + framesToAdjust);
             newChannel.set(channel, framesToAdjust);
             return newChannel;
          } catch(e) {
             console.error("Hard sync allocation failed:", e);
             return channel;
          }
        }),
        sampleRate: audio.sampleRate,
      };
    }
  }

  /**
   * Soft sync: gradually adjust by adding/removing a few frames
   */
  private softSync(audio: DecodedAudio, timeDiff: number): DecodedAudio {
    const framesToAdjust = Math.min(
      this.softSyncFrames,
      Math.floor((Math.abs(timeDiff) / 1000) * this.sampleRate)
    );

    if (framesToAdjust === 0) {
      return audio;
    }

    const firstChannel = audio.samples[0];
    if (!firstChannel) {
      return audio;
    }

    if (timeDiff > 0) {
      // We're ahead, remove frames from the end
      const newLength = Math.max(0, firstChannel.length - framesToAdjust);

      return {
        samples: audio.samples.map((channel) => channel.slice(0, newLength)),
        sampleRate: audio.sampleRate,
      };
    } else {
      // We're behind, duplicate some frames at the end
      return {
        samples: audio.samples.map((channel) => {
          const newChannel = new Float32Array(channel.length + framesToAdjust);
          newChannel.set(channel);

          // Duplicate last frame
          const lastSample = channel[channel.length - 1] ?? 0;
          for (let i = 0; i < framesToAdjust; i++) {
            newChannel[channel.length + i] = lastSample;
          }

          return newChannel;
        }),
        sampleRate: audio.sampleRate,
      };
    }
  }

  /**
   * Get number of chunks in buffer
   */
  getBufferLength(): number {
    return this.chunks.length;
  }

  /**
   * Get buffer duration in milliseconds
   */
  getBufferDuration(): number {
    if (this.chunks.length === 0) return 0;

    const firstChunk = this.chunks[0];
    const lastChunk = this.chunks[this.chunks.length - 1];

    if (!firstChunk || !lastChunk || !lastChunk.audio.samples[0]) return 0;

    const firstPlayTime = firstChunk.playTime;
    const lastDuration =
      (lastChunk.audio.samples[0].length / this.sampleRate) * 1000;
    const lastPlayTime = lastChunk.playTime + lastDuration;

    return lastPlayTime - firstPlayTime;
  }

  /**
   * Clear all buffered chunks
   */
  clear(): void {
    this.chunks = [];
    this.playedFrames = 0;
  }

  /**
   * Update sample rate (when codec changes)
   */
  setSampleRate(sampleRate: number): void {
    this.sampleRate = sampleRate;
  }

  getDebugInfo(latencyMs: number): string {
    const clientNow = this.timeProvider.now();
    const serverPlaybackTime = this.timeProvider.serverTime(
      clientNow + latencyMs
    );
    
    if (this.chunks.length === 0) return "No chunks";

    const first = this.chunks[0];
    const last = this.chunks[this.chunks.length - 1];

    if (!first) return "No chunks";

    return `Now(Srv): ${serverPlaybackTime.toFixed(0)}, Head: ${first.playTime.toFixed(0)} (${(first.playTime - serverPlaybackTime).toFixed(0)}ms away), Tail: ${last?.playTime.toFixed(0)}`; 
  }
}
