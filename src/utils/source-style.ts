import { getStreamName } from "./stream-name";

interface StreamLike {
  id: string;
  uri?: unknown;
}

/** Snapcast stream scheme ("pipe", "librespot", "airplay", ...), lowercased. */
export function getStreamScheme(stream: StreamLike | null | undefined): string {
  const uri = stream?.uri;
  if (!uri) return "";
  if (typeof uri === "string") {
    const match = /^([a-z][a-z0-9+.-]*):/i.exec(uri);
    return match?.[1]?.toLowerCase() ?? "";
  }
  if (typeof uri === "object") {
    const scheme = (uri as { scheme?: unknown }).scheme;
    return typeof scheme === "string" ? scheme.toLowerCase() : "";
  }
  return "";
}

/**
 * A recognizable MDI icon for a source, from its name first (people name
 * streams "Spotify", "Radio", "TV"...) and its Snapcast scheme second.
 */
export function getSourceIcon(stream: StreamLike | null | undefined): string {
  if (!stream) return "mdi-music-note";
  const name = getStreamName(stream).toLowerCase();
  const scheme = getStreamScheme(stream);
  const has = (...words: string[]) => words.some((w) => name.includes(w));

  if (scheme === "librespot" || scheme === "spotify" || has("spotify")) return "mdi-spotify";
  if (scheme === "airplay" || has("airplay", "apple")) return "mdi-cast-audio";
  if (has("bluetooth", "bt ")) return "mdi-bluetooth-audio";
  if (has("radio", "fm")) return "mdi-radio";
  if (has("podcast")) return "mdi-podcast";
  if (has("tv", "television")) return "mdi-television";
  if (has("mic", "announce", "voice")) return "mdi-microphone";
  if (scheme === "tcp") return "mdi-lan";
  if (scheme === "file") return "mdi-file-music";
  if (scheme === "alsa") return "mdi-audio-input-rca";
  return "mdi-music-note";
}

/**
 * Stable hue (0-359) for a source so its chip, zone tile and slider share
 * one accent color across the app and across reloads. Hashes the display
 * name (falling back to the id) so renaming a stream re-colors it but
 * restarting the server doesn't.
 */
export function getSourceHue(stream: StreamLike | null | undefined): number {
  if (!stream) return 220;
  const key = getStreamName(stream) || stream.id;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

export interface SourceAccent {
  /** Main accent (selected chip, tile, slider fill). */
  main: string;
  /** Deeper companion for gradients. */
  deep: string;
  /** Translucent tint for glows and badges. */
  soft: string;
}

/**
 * Accent colors for a hue. Yellows/greens are inherently light at equal
 * HSL lightness, so they're darkened to keep white text on the selected
 * chip readable.
 */
export function getSourceAccent(hue: number): SourceAccent {
  const light = hue >= 40 && hue <= 170 ? 40 : 50;
  return {
    main: `hsl(${hue} 78% ${light}%)`,
    deep: `hsl(${(hue + 40) % 360} 72% ${light - 8}%)`,
    soft: `hsl(${hue} 90% 60% / 0.16)`,
  };
}
