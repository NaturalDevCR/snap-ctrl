/**
 * Helper for resolving a Snapcast stream's status by id.
 */

interface StreamStatusLike {
  id: string;
  status?: string;
}

export function getStreamStatus(
  streams: StreamStatusLike[],
  streamId: string
): string {
  const stream = streams.find((s) => s.id === streamId);
  return stream?.status || "unknown";
}

export type PlayState = "playing" | "idle" | "unavailable";

/** Reads a Snapcast status, in either its plain or `k`-prefixed spelling. */
export function parsePlayState(status: string): PlayState {
  const normalized = status.toLowerCase();
  if (normalized === "playing" || normalized === "kplaying") return "playing";
  if (normalized === "idle" || normalized === "kidle") return "idle";
  return "unavailable";
}
