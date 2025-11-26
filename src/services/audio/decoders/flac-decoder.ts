/**
 * FLAC audio decoder using libflacjs
 */

import Flac from "libflacjs";
import { type Timestamp } from "../message-protocol";
import { type AudioDecoder, type DecodedAudio } from "./types";

export class FlacDecoder implements AudioDecoder {
  private decoder: any = null;
  private sampleRate = 48000;
  private channels = 2;
  private bitsPerSample = 16;
  private isInitialized = false;

  async init(header: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Initialize FLAC decoder
        // @ts-expect-error - libflacjs types are not complete
        this.decoder = Flac.create_libflac_decoder(false);

        if (!this.decoder) {
          reject(new Error("Failed to create FLAC decoder"));
          return;
        }

        let metadataReceived = false;

        // Set up metadata callback
        this.decoder.onmetadata = (metadata: any) => {
          if (metadata.type === 0) {
            // STREAMINFO block
            this.sampleRate = metadata.data.sample_rate;
            this.channels = metadata.data.channels;
            this.bitsPerSample = metadata.data.bits_per_sample;

            console.log(
              `FLAC initialized: ${this.sampleRate}Hz, ${this.channels}ch, ${this.bitsPerSample}bit`
            );

            metadataReceived = true;
          }
        };

        // Set up error callback
        this.decoder.onerror = (error: any) => {
          console.error("FLAC decoder error:", error);
        };

        // Initialize decoder with header
        // @ts-expect-error - libflacjs types are not complete
        const init_status = Flac.init_decoder_stream(this.decoder);

        if (init_status !== 0) {
          reject(new Error(`FLAC init failed with status ${init_status}`));
          return;
        }

        // Process header
        if (header && header.length > 0) {
          // @ts-expect-error - libflacjs types are not complete
          Flac.FLAC__stream_decoder_process_metadata(this.decoder);

          // Feed header data
          // Feed header data
          const headerArray = Array.from(header);
          const processed =
            // @ts-expect-error - libflacjs types are not complete
            Flac.FLAC__stream_decoder_process_until_end_of_metadata(
              this.decoder,
              headerArray,
              headerArray.length
            );

          if (!processed) {
            console.warn("FLAC: Could not process header metadata");
          }
        }

        this.isInitialized = true;

        // Allow some time for metadata to be processed
        setTimeout(() => {
          if (!metadataReceived) {
            console.warn("FLAC: No metadata received, using defaults");
          }
          resolve();
        }, 100);
      } catch (error) {
        reject(error);
      }
    });
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
      const decodedSamples: Float32Array[] = [];

      // Set up decode callback
      this.decoder.ondecode = (decodeData: any) => {
        const samplesPerChannel = decodeData.buffer[0].length;

        // Convert to Float32Array
        for (let ch = 0; ch < this.channels; ch++) {
          const channelData = new Float32Array(samplesPerChannel);
          const sourceData = decodeData.buffer[ch];

          // Normalize based on bits per sample
          const divisor = Math.pow(2, this.bitsPerSample - 1);

          for (let i = 0; i < samplesPerChannel; i++) {
            channelData[i] = sourceData[i] / divisor;
          }

          decodedSamples.push(channelData);
        }
      };

      // Decode the data
      const dataArray = Array.from(data);
      // @ts-expect-error - libflacjs types are not complete
      const success = Flac.FLAC__stream_decoder_process_single(
        this.decoder,
        dataArray,
        dataArray.length
      );

      if (!success || decodedSamples.length === 0) {
        resolve(null);
        return;
      }

      resolve({
        samples: decodedSamples,
        sampleRate: this.sampleRate,
        timestamp,
      });
    });
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
        // @ts-expect-error - libflacjs types are not complete
        Flac.FLAC__stream_decoder_finish(this.decoder);
        // @ts-expect-error - libflacjs types are not complete
        Flac.FLAC__stream_decoder_delete(this.decoder);
      } catch (error) {
        console.error("Error closing FLAC decoder:", error);
      }
      this.decoder = null;
      this.isInitialized = false;
    }
  }
}
