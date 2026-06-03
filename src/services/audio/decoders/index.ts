/**
 * Audio decoder factory
 * Returns a decoder instance asynchronously. Each non-PCM decoder
 * is loaded via a dynamic import so the heavy WASM dependencies
 * (libflac, opus-decoder, ogg-vorbis) end up in their own bundles
 * and are only fetched when the user actually plays a stream with
 * that codec.
 */

import { type AudioDecoder } from "./types";
import { PcmDecoder } from "./pcm-decoder";

export * from "./types";

export async function createDecoder(codec: string): Promise<AudioDecoder> {
  const codecLower = codec.toLowerCase();

  if (codecLower === "flac") {
    const { FlacDecoder } = await import("./flac-decoder");
    return new FlacDecoder();
  }
  if (codecLower === "opus") {
    const { OpusDecoder } = await import("./opus-decoder");
    return new OpusDecoder();
  }
  if (codecLower === "vorbis") {
    const { VorbisDecoder } = await import("./vorbis-decoder");
    return new VorbisDecoder();
  }
  if (codecLower === "pcm") {
    return new PcmDecoder();
  }
  console.warn(`Unknown codec: ${codec}, falling back to PCM`);
  return new PcmDecoder();
}
