/**
 * Presentation helpers for Snapcast stream status
 * (icon, color, and tooltip used by zone cards and modals).
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

function isPlaying(status: string): boolean {
  const s = status.toLowerCase();
  return s === "playing" || s === "kplaying";
}

function isIdle(status: string): boolean {
  const s = status.toLowerCase();
  return s === "idle" || s === "kidle";
}

export function getStreamStatusIcon(
  streams: StreamStatusLike[],
  streamId: string
): string {
  const status = getStreamStatus(streams, streamId);
  if (isPlaying(status)) return "mdi-play-circle";
  if (isIdle(status)) return "mdi-pause-circle";
  return "mdi-alert-circle";
}

export function getStreamStatusColor(
  streams: StreamStatusLike[],
  streamId: string
): string {
  const status = getStreamStatus(streams, streamId);
  if (isPlaying(status)) return "text-green-500";
  if (isIdle(status)) return "text-orange-500";
  return "text-red-500";
}

export function getStreamStatusTooltip(
  streams: StreamStatusLike[],
  streamId: string
): string {
  const status = getStreamStatus(streams, streamId);
  if (isPlaying(status)) return "Playing: Source is active";
  if (isIdle(status)) return "Idle: Source is silent or paused";
  return "Error: Source has an issue";
}
