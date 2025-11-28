/**
 * FLAC audio decoder using libflacjs
 */

import Flac from "libflacjs/dist/libflac.js";
import { type Timestamp, type SampleFormat } from "../message-protocol";
import { type AudioDecoder, type DecodedAudio } from "./types";

export class FlacDecoder implements AudioDecoder {
  private decoder: any = null;
  private sampleRate = 48000;
  private channels = 2;
  private bitsPerSample = 16;
  private isInitialized = false;

  // Buffers for callbacks
  private header: Uint8Array | null = null;
  private flacChunk: Uint8Array | null = null;
  private currentDecodedSamples: Float32Array[] = [];

  constructor() {
    this.initDecoder();
  }

  private initDecoder() {
    try {
      // @ts-ignore
      this.decoder = Flac.create_libflac_decoder(true);

      if (this.decoder) {
        // @ts-ignore
        const init_status = (Flac as any).init_decoder_stream(
          this.decoder,
          this.readCallback.bind(this),
          this.writeCallback.bind(this),
          this.errorCallback.bind(this),
          this.metadataCallback.bind(this),
          false // is_ogg
        );
        console.log("Flac init status:", init_status);

        // @ts-ignore
        (Flac as any).setOptions(this.decoder, {
          analyseSubframes: true,
          analyseResiduals: true,
        });

        this.isInitialized = init_status === 0;
      }
    } catch (e) {
      console.error("Failed to create FLAC decoder:", e);
    }
  }

  async init(header: Uint8Array): Promise<void> {
    if (!this.decoder) {
      this.initDecoder();
    }

    if (this.decoder && header && header.length > 0) {
      this.header = header;

      // Debug header
      const magic = String.fromCharCode(...header.slice(0, 4));
      const bytes = Array.from(header.slice(0, 4))
        .map((b) => b.toString(16))
        .join(" ");
      console.log(`FLAC Header magic: ${magic} (${bytes})`);

      // @ts-ignore
      (Flac as any).FLAC__stream_decoder_process_until_end_of_metadata(
        this.decoder
      );
      // Header is consumed by readCallback
    }
  }

  private readCallback(bufferSize: number): any {
    if (this.header) {
      // console.log("Serving header:", this.header.length);
      const data = this.header;
      this.header = null;
      return { buffer: data, readDataLength: data.length, error: false };
    } else if (this.flacChunk && this.flacChunk.length > 0) {
      // console.log("Serving chunk:", this.flacChunk.length);
      const len = Math.min(bufferSize, this.flacChunk.length);
      const data = this.flacChunk.slice(0, len);
      this.flacChunk = this.flacChunk.slice(len);
      return { buffer: data, readDataLength: data.length, error: false };
    }
    return { buffer: new Uint8Array(0), readDataLength: 0, error: false };
  }

  private writeCallback(buffer: Array<Uint8Array>, frame: any): void {
    if (!buffer || !frame) {
      console.warn("FLAC writeCallback: invalid buffer or frame");
      return;
    }

    const blocksize = frame.blocksize;
    const channels = frame.channels;
    const samplesPerChannel = blocksize;

    // Ensure currentDecodedSamples has arrays for each channel
    for (let ch = 0; ch < channels; ch++) {
      if (!this.currentDecodedSamples[ch]) {
        this.currentDecodedSamples[ch] = new Float32Array(0);
      }
    }

    // Convert samples from each channel (matching snapweb implementation)
    for (let ch = 0; ch < channels; ch++) {
      const channelData = new Float32Array(samplesPerChannel);
      const byteBuffer = buffer[ch];

      // Validate byteBuffer
      if (!byteBuffer || !byteBuffer.buffer) {
        console.warn(
          `FLAC writeCallback: invalid byteBuffer for channel ${ch}`
        );
        continue;
      }

      const dataView = new DataView(
        byteBuffer.buffer,
        byteBuffer.byteOffset,
        byteBuffer.byteLength
      );

      const is16Bit = this.bitsPerSample <= 16;
      const bytesPerSample = is16Bit ? 2 : 4;
      const divisor = Math.pow(2, this.bitsPerSample - 1);

      for (let i = 0; i < samplesPerChannel; i++) {
        let sample = 0;
        const offset = i * bytesPerSample;

        if (offset < dataView.byteLength) {
          if (is16Bit) {
            sample = dataView.getInt16(offset, true);
          } else {
            sample = dataView.getInt32(offset, true);
          }
        }

        channelData[i] = sample / divisor;
      }

      // Append to currentDecodedSamples[ch]
      const oldBuffer = this.currentDecodedSamples[ch] || new Float32Array(0);
      const newBuffer = new Float32Array(oldBuffer.length + channelData.length);
      newBuffer.set(oldBuffer);
      newBuffer.set(channelData, oldBuffer.length);
      this.currentDecodedSamples[ch] = newBuffer;
    }
  }

  private metadataCallback(decoder: any, metadata: any): void {
    if (metadata.type === 0) {
      // STREAMINFO block
      this.sampleRate = metadata.data.sampleRate;
      this.channels = metadata.data.channels;
      this.bitsPerSample = metadata.data.bitsPerSample;

      console.log(
        `FLAC initialized: ${this.sampleRate}Hz, ${this.channels}ch, ${this.bitsPerSample}bit`
      );
    }
  }

  private errorCallback(decoder: any, error: any): void {
    console.error("FLAC decoder error:", error);
  }

  async decode(
    data: Uint8Array,
    timestamp?: Timestamp
  ): Promise<DecodedAudio | null> {
    if (!this.decoder || !this.isInitialized) {
      console.warn("FLAC decoder not initialized");
      return null;
    }

    if (data.length === 0) return null;

    return new Promise((resolve) => {
      this.flacChunk = data;
      this.currentDecodedSamples = []; // Reset for this chunk

      // Initialize channel buffers if needed (though writeCallback handles it)
      // We rely on writeCallback to populate currentDecodedSamples

      // Loop until all data is processed
      while (this.flacChunk && this.flacChunk.length > 0) {
        // @ts-ignore
        const status = (Flac as any).FLAC__stream_decoder_process_single(
          this.decoder
        );
        if (!status) {
          console.warn("FLAC process_single failed");
          break;
        }
      }

      if (this.currentDecodedSamples.length === 0) {
        resolve(null);
        return;
      }

      resolve({
        samples: this.currentDecodedSamples,
        sampleRate: this.sampleRate,
        timestamp,
      });
    });
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
    if (this.decoder) {
      try {
        // @ts-ignore
        (Flac as any).FLAC__stream_decoder_finish(this.decoder);
        // @ts-ignore
        (Flac as any).FLAC__stream_decoder_delete(this.decoder);
      } catch (error) {
        console.error("Error closing FLAC decoder:", error);
      }
      this.decoder = null;
      this.isInitialized = false;
    }
  }
}
