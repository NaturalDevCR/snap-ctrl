/**
 * FLAC audio decoder using libflacjs.
 * The WASM dependency is lazy-loaded inside `init()` so the main
 * bundle stays small until a FLAC stream is actually played.
 */

import { type Timestamp, type SampleFormat } from "../message-protocol";
import { type AudioDecoder, type DecodedAudio } from "./types";

type FlacModule = {
  create_libflac_decoder: (isOgg: boolean) => any;
  init_decoder_stream: (
    decoder: any,
    read: any,
    write: any,
    error: any,
    meta: any,
    isOgg: boolean
  ) => number;
  setOptions: (decoder: any, opts: any) => void;
  FLAC__stream_decoder_process_until_end_of_metadata: (decoder: any) => void;
  FLAC__stream_decoder_process_single: (decoder: any) => boolean;
  FLAC__stream_decoder_finish: (decoder: any) => void;
  FLAC__stream_decoder_delete: (decoder: any) => void;
};

let flacModulePromise: Promise<FlacModule> | null = null;
function loadFlacModule(): Promise<FlacModule> {
  if (!flacModulePromise) {
    flacModulePromise = import("libflacjs/dist/libflac.js").then(
      (m) => (m as any).default ?? (m as any)
    ) as Promise<FlacModule>;
  }
  return flacModulePromise;
}

export class FlacDecoder implements AudioDecoder {
  private Flac: FlacModule | null = null;
  private decoder: any = null;
  private sampleRate = 48000;
  private channels = 2;
  private bitsPerSample = 16;
  private isInitialized = false;

  private header: Uint8Array | null = null;
  private flacChunk: Uint8Array | null = null;
  private currentDecodedSamples: Float32Array[] = [];

  private async ensureDecoder(): Promise<FlacModule | null> {
    if (this.Flac) return this.Flac;
    try {
      this.Flac = await loadFlacModule();
    } catch (e) {
      console.error("Failed to load FLAC module:", e);
      return null;
    }
    return this.Flac;
  }

  async init(header: Uint8Array): Promise<void> {
    if (!this.Flac) {
      this.Flac = await this.ensureDecoder();
    }
    if (!this.Flac) return;

    if (!this.decoder) {
      this.decoder = this.Flac.create_libflac_decoder(true);
      if (this.decoder) {
        const init_status = this.Flac.init_decoder_stream(
          this.decoder,
          this.readCallback.bind(this),
          this.writeCallback.bind(this),
          this.errorCallback.bind(this),
          this.metadataCallback.bind(this),
          false
        );
        console.log("Flac init status:", init_status);
        this.Flac.setOptions(this.decoder, {
          analyseSubframes: true,
          analyseResiduals: true,
        });
        this.isInitialized = init_status === 0;
      }
    }

    if (this.decoder && header && header.length > 0) {
      this.header = header;
      const magic = String.fromCharCode(...header.slice(0, 4));
      const bytes = Array.from(header.slice(0, 4))
        .map((b) => b.toString(16))
        .join(" ");
      console.log(`FLAC Header magic: ${magic} (${bytes})`);
      this.Flac.FLAC__stream_decoder_process_until_end_of_metadata(
        this.decoder
      );
    }
  }

  private readCallback(bufferSize: number): any {
    if (this.header) {
      const data = this.header;
      this.header = null;
      return { buffer: data, readDataLength: data.length, error: false };
    } else if (this.flacChunk && this.flacChunk.length > 0) {
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

    for (let ch = 0; ch < channels; ch++) {
      if (!this.currentDecodedSamples[ch]) {
        this.currentDecodedSamples[ch] = new Float32Array(0);
      }
    }

    for (let ch = 0; ch < channels; ch++) {
      const channelData = new Float32Array(samplesPerChannel);
      const byteBuffer = buffer[ch];

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

      const oldBuffer = this.currentDecodedSamples[ch] || new Float32Array(0);
      const newBuffer = new Float32Array(oldBuffer.length + channelData.length);
      newBuffer.set(oldBuffer);
      newBuffer.set(channelData, oldBuffer.length);
      this.currentDecodedSamples[ch] = newBuffer;
    }
  }

  private metadataCallback(decoder: any, metadata: any): void {
    if (metadata.type === 0) {
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
    if (!this.decoder || !this.isInitialized || !this.Flac) {
      console.warn("FLAC decoder not initialized");
      return null;
    }

    if (data.length === 0) return null;

    return new Promise((resolve) => {
      this.flacChunk = data;
      this.currentDecodedSamples = [];

      while (this.flacChunk && this.flacChunk.length > 0) {
        const status = this.Flac!.FLAC__stream_decoder_process_single(
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
    if (this.decoder && this.Flac) {
      try {
        this.Flac.FLAC__stream_decoder_finish(this.decoder);
        this.Flac.FLAC__stream_decoder_delete(this.decoder);
      } catch (error) {
        console.error("Error closing FLAC decoder:", error);
      }
      this.decoder = null;
      this.isInitialized = false;
    }
  }
}
