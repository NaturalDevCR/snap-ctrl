import { getStreamName } from "./stream-name";

export interface GroupLike {
  id: string;
  name?: string | null;
  stream_id?: string;
  clients?: Array<{ config?: { name?: string | null }; host?: { name?: string } }>;
}

export interface StreamLike {
  id: string;
  uri?: unknown;
}

/**
 * Determine a group display name. Prefer the group's own name; otherwise
 * use the assigned stream's name; otherwise fall back to a description
 * based on its clients.
 */
export function getGroupDisplayName(
  group: GroupLike,
  streams: StreamLike[] = []
): string {
  if (group.name && group.name.trim().length > 0) return group.name;

  const stream = streams.find((s) => s.id === group.stream_id);
  if (stream) {
    const streamName = getStreamName(stream);
    if (streamName) return streamName;
  }

  if (group.clients && group.clients.length > 0) {
    const first = group.clients[0];
    if (first?.config?.name) return `${first.config.name} Group`;
    return `${group.clients.length} Clients`;
  }

  return `Group ${group.id.substring(0, 8)}`;
}
