/**
 * PCM audio decoder
 * Handles raw PCM data (16-bit and 24-bit)
 */

import { type Timestamp, type SampleFormat } from "../message-protocol";
import { type AudioDecoder, type DecodedAudio } from "./types";

export class PcmDecoder implements AudioDecoder {
  private sampleRate = 48000;
  private channels = 2;
  private bitsPerSample = 16;

  async init(header: Uint8Array): Promise<void> {
    // Parse WAVE header
    if (header.length >= 44) {
      const dv = new DataView(
        header.buffer,
        header.byteOffset,
        header.byteLength
      );

      // Check RIFF header
      const riff = String.fromCharCode(
        header[0] ?? 0,
        header[1] ?? 0,
        header[2] ?? 0,
        header[3] ?? 0
      );

      if (riff === "RIFF") {
        this.channels = dv.getUint16(22, true);
        this.sampleRate = dv.getUint32(24, true);
        this.bitsPerSample = dv.getUint16(34, true);

        console.log(
          `PCM initialized: ${this.sampleRate}Hz, ${this.channels}ch, ${this.bitsPerSample}bit`
        );
      }
    }
  }

  async decode(
    data: Uint8Array,
    timestamp?: Timestamp
  ): Promise<DecodedAudio | null> {
    if (data.length === 0) return null;

    const bytesPerSample = this.bitsPerSample / 8;
    const samplesPerChannel = data.length / (this.channels * bytesPerSample);

    if (samplesPerChannel % 1 !== 0) {
      console.warn("Invalid PCM chunk size");
      return null;
    }

    const samples: Float32Array[] = [];

    for (let ch = 0; ch < this.channels; ch++) {
      samples.push(new Float32Array(samplesPerChannel));
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    if (this.bitsPerSample === 16) {
      for (let i = 0; i < samplesPerChannel; i++) {
        for (let ch = 0; ch < this.channels; ch++) {
          const offset = (i * this.channels + ch) * 2;
          const sample = view.getInt16(offset, true);
          const channel = samples[ch];
          if (channel) {
            channel[i] = sample / 32768.0;
          }
        }
      }
    } else if (this.bitsPerSample === 24) {
      for (let i = 0; i < samplesPerChannel; i++) {
        for (let ch = 0; ch < this.channels; ch++) {
          const offset = (i * this.channels + ch) * 3;
          // Read 24-bit integer (little-endian)
          const byte1 = data[offset] ?? 0;
          const byte2 = data[offset + 1] ?? 0;
          const byte3 = data[offset + 2] ?? 0;

          let sample = (byte3 << 16) | (byte2 << 8) | byte1;

          // Convert to signed
          if (sample & 0x800000) {
            sample = sample - 0x1000000;
          }

          const channel = samples[ch];
          if (channel) {
            channel[i] = sample / 8388608.0;
          }
        }
      }
    } else if (this.bitsPerSample === 32) {
      for (let i = 0; i < samplesPerChannel; i++) {
        for (let ch = 0; ch < this.channels; ch++) {
          const offset = (i * this.channels + ch) * 4;
          const sample = view.getInt32(offset, true);
          const channel = samples[ch];
          if (channel) {
            channel[i] = sample / 2147483648.0;
          }
        }
      }
    }

    return {
      samples,
      sampleRate: this.sampleRate,
      timestamp,
    };
  }

  getSampleRate(): number {
    return this.sampleRate;
  }

  getSampleFormat(): SampleFormat {
    return {
      rate: this.sampleRate,
      channels: this.channels,
      bits: this.bitsPerSample,
    };
  }

  getChannels(): number {
    return this.channels;
  }

  close(): void {
    // No cleanup needed for PCM
  }
}
