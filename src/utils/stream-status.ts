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
