/**
 * Opus audio decoder using opus-decoder
 */

import { OpusDecoder as OpusDecoderLib } from "opus-decoder";
import { type Timestamp } from "../message-protocol";
import { type AudioDecoder, type DecodedAudio } from "./types";

export class OpusDecoder implements AudioDecoder {
  private decoder: any | null = null;
  private sampleRate = 48000;
  private channels = 2;
  private isInitialized = false;

  async init(header: Uint8Array): Promise<void> {
    try {
      // Parse Opus header from Ogg container if present
      // Opus in Ogg starts with "OpusHead"
      if (header.length >= 19) {
        const headerStr = String.fromCharCode(
          header[0] ?? 0,
          header[1] ?? 0,
          header[2] ?? 0,
          header[3] ?? 0,
          header[4] ?? 0,
          header[5] ?? 0,
          header[6] ?? 0,
          header[7] ?? 0
        );

        if (headerStr === "OpusHead") {
          // OpusHead structure:
          // 0-7: "OpusHead"
          // 8: version (should be 1)
          // 9: channel count
          // 10-11: pre-skip (little-endian uint16)
          // 12-15: sample rate (little-endian uint32)
          // 16-17: output gain
          // 18: channel mapping family

          this.channels = header[9] ?? 2;

          // Opus always decodes at 48kHz
          this.sampleRate = 48000;

          console.log(
            `Opus header parsed: ${this.sampleRate}Hz, ${this.channels}ch`
          );
        }
      }

      // Initialize opus-decoder
      this.decoder = new OpusDecoderLib({
        channels: this.channels as 1 | 2,
        sampleRate: this.sampleRate as 48000,
        streamCount: 1,
        coupledStreamCount: this.channels > 1 ? 1 : 0,
        channelMappingTable: this.channels === 2 ? [0, 1] : [0],
      });

      if (this.decoder) {
        await this.decoder.ready;
      }

      this.isInitialized = true;

      console.log(`Opus initialized: ${this.sampleRate}Hz, ${this.channels}ch`);
    } catch (error) {
      console.error("Failed to initialize Opus decoder:", error);
      throw error;
    }
  }

  async decode(
    data: Uint8Array,
    timestamp?: Timestamp
  ): Promise<DecodedAudio | null> {
    if (!this.decoder || !this.isInitialized) {
      console.warn("Opus decoder not initialized");
      return null;
    }

    if (data.length === 0) return null;

    try {
      // Decode the Opus packet
      const decoded = this.decoder.decodeFrame(data);

      if (
        !decoded ||
        !decoded.channelData ||
        decoded.channelData.length === 0
      ) {
        return null;
      }

      // opus-decoder returns {channelData: Float32Array[], samplesDecoded: number}
      const samples: Float32Array[] = [];

      for (let ch = 0; ch < this.channels; ch++) {
        const channelData = decoded.channelData[ch];
        if (channelData) {
          samples.push(channelData);
        }
      }

      if (samples.length === 0) {
        return null;
      }

      return {
        samples,
        sampleRate: this.sampleRate,
        timestamp,
      };
    } catch (error) {
      console.error("Error decoding Opus frame:", error);
      return null;
    }
  }

  getSampleRate(): number {
    return this.sampleRate;
  }

  getChannels(): number {
    return this.channels;
  }

  close(): void {
    if (this.decoder) {
      try {
        this.decoder.free();
      } catch (error) {
        console.error("Error closing Opus decoder:", error);
      }
      this.decoder = null;
      this.isInitialized = false;
    }
  }
}
