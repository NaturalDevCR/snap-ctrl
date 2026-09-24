import type { Client, Group } from "@/stores/snapcast";

/**
 * Clients a zone-level ("master") volume control moves: the group's
 * volume-linked clients that are still in the group and that this device
 * may control. Empty means the zone has no master volume — same rule as
 * the classic Zone Control dialog, which only shows its master slider
 * when at least one client is linked.
 */
export function linkedZoneClients(
  group: Group,
  linkedClientIds: string[] = [],
  isAllowed: (clientId: string) => boolean = () => true
): Client[] {
  return group.clients.filter(
    (c) => linkedClientIds.includes(c.id) && isAllowed(c.id)
  );
}

/** Rounded average volume of the given clients (0 when there are none). */
export function averageClientVolume(clients: Client[]): number {
  if (clients.length === 0) return 0;
  const sum = clients.reduce((acc, c) => acc + c.config.volume.percent, 0);
  return Math.round(sum / clients.length);
}
