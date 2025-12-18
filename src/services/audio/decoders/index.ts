/**
 * Audio decoder factory
 * Creates the appropriate decoder based on codec type
 */

import { type AudioDecoder } from "./types";
import { PcmDecoder } from "./pcm-decoder";
import { FlacDecoder } from "./flac-decoder";
import { OpusDecoder } from "./opus-decoder";
import { VorbisDecoder } from "./vorbis-decoder";

export * from "./types";

export function createDecoder(codec: string): AudioDecoder {
  const codecLower = codec.toLowerCase();

  if (codecLower === "flac") {
    return new FlacDecoder();
  } else if (codecLower === "opus") {
    return new OpusDecoder();
  } else if (codecLower === "vorbis") {
    return new VorbisDecoder();
  } else if (codecLower === "pcm") {
    return new PcmDecoder();
  } else {
    console.warn(`Unknown codec: ${codec}, falling back to PCM`);
    return new PcmDecoder();
  }
}
