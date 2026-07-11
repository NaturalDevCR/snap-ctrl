import type { Group } from "@/stores/snapcast";

/**
 * Current group volume: average of the linked clients' volumes.
 * If no clients are explicitly linked, all clients in the group are used so
 * single-client groups (and groups without custom links) display a correct
 * average. Always calculated dynamically, never restored from storage.
 */
export function averageGroupVolume(
  group: Group | undefined | null,
  linkedIds: string[] = []
): number {
  if (!group) return 100;

  const targetClients =
    linkedIds.length > 0
      ? group.clients.filter((c) => linkedIds.includes(c.id))
      : group.clients;

  if (targetClients.length === 0) return 0;

  const avg =
    targetClients.reduce((sum, c) => sum + c.config.volume.percent, 0) /
    targetClients.length;

  return Math.round(avg);
}
