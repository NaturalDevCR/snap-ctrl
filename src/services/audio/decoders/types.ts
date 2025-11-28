/**
 * Common interface for audio decoders
 */

import { type Timestamp, type SampleFormat } from "../message-protocol";

export interface DecodedAudio {
  samples: Float32Array[]; // Array of channels
  sampleRate: number;
  timestamp?: Timestamp;
}

export interface AudioDecoder {
  init(header: Uint8Array): Promise<void>;
  decode(data: Uint8Array, timestamp?: Timestamp): Promise<DecodedAudio | null>;
  getSampleRate(): number;
  getSampleFormat(): SampleFormat;
  getChannels(): number;
  close(): void;
}
