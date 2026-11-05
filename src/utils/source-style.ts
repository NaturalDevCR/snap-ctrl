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
