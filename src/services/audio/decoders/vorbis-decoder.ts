/**
 * Vorbis audio decoder using @wasm-audio-decoders/ogg-vorbis
 */

import { OggVorbisDecoder } from "@wasm-audio-decoders/ogg-vorbis";
import { type Timestamp, type SampleFormat } from "../message-protocol";
import { type AudioDecoder, type DecodedAudio } from "./types";

export class VorbisDecoder implements AudioDecoder {
  private decoder: any | null = null;
  private sampleRate = 48000;
  private channels = 2;
  private isInitialized = false;

  async init(header: Uint8Array): Promise<void> {
    try {
      // Initialize the decoder
      this.decoder = new OggVorbisDecoder();
      
      if (this.decoder) {
        await this.decoder.ready;
      }

      this.isInitialized = true;

      // Feed the header to the decoder
      // Snapcast sends the Ogg Vorbis headers in the initial chunk
      if (header && header.length > 0) {
        const decoded = await this.decoder.decode(header);
        // We might get sample rate and channels from the header decoding result
        if (decoded) {
            if (decoded.sampleRate) this.sampleRate = decoded.sampleRate;
            if (decoded.channelData) this.channels = decoded.channelData.length;
        }
      }
      
      console.log(`Vorbis decoder initialized: ${this.sampleRate}Hz, ${this.channels}ch`);
    } catch (error) {
      console.error("Failed to initialize Vorbis decoder:", error);
      throw error;
    }
  }

  async decode(
    data: Uint8Array,
    timestamp?: Timestamp
  ): Promise<DecodedAudio | null> {
    if (!this.decoder || !this.isInitialized) {
      console.warn("Vorbis decoder not initialized");
      return null;
    }

    if (data.length === 0) return null;

    try {
      const decoded = await this.decoder.decode(data);

      if (
        !decoded ||
        !decoded.channelData ||
        decoded.channelData.length === 0
      ) {
        return null;
      }

      // Update format info if it changes or was set from header
      if (decoded.sampleRate) this.sampleRate = decoded.sampleRate;
      this.channels = decoded.channelData.length;

      const samples: Float32Array[] = decoded.channelData;

      // Check if we actually have samples
      if (samples.length === 0 || (samples[0] && samples[0].length === 0)) {
        return null;
      }

      return {
        samples,
        sampleRate: this.sampleRate,
        timestamp,
      };
    } catch (error) {
      console.error("Error decoding Vorbis frame:", error);
      return null;
    }
  }

  getSampleRate(): number {
    return this.sampleRate;
  }

  getSampleFormat(): SampleFormat {
    return {
      rate: this.sampleRate,
      channels: this.channels,
      bits: 16, // Vorbis is typically decoded to float32, but 16-bit equivalent quality
    };
  }

  getChannels(): number {
    return this.channels;
  }

  close(): void {
    if (this.decoder) {
      try {
        this.decoder.free();
      } catch (error) {
        console.error("Error closing Vorbis decoder:", error);
      }
      this.decoder = null;
      this.isInitialized = false;
    }
  }
}
