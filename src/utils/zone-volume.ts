import type { Client, Group } from "@/stores/snapcast";

export interface ZoneVolumeTargets {
  /** Clients the zone-level volume slider moves. */
  clients: Client[];
  /** True when those clients come from the group's explicit volume links. */
  usesLinks: boolean;
}

/**
 * Which clients a single "zone volume" control should move.
 *
 * Linked clients (Group Settings → "Linked") win when any of them are
 * still in the group. Without links, every client in the group moves
 * together — a zone with one slider that silently did nothing (the
 * classic view simply hides its master slider in that case) would be
 * confusing for the Simple view's audience.
 *
 * `isAllowed` narrows the result to clients this device may control, so
 * the displayed average isn't skewed by speakers it can't change.
 */
export function resolveZoneVolumeTargets(
  group: Group,
  linkedClientIds: string[] = [],
  isAllowed: (clientId: string) => boolean = () => true
): ZoneVolumeTargets {
  const allowed = group.clients.filter((c) => isAllowed(c.id));
  const linked = allowed.filter((c) => linkedClientIds.includes(c.id));
  if (linked.length > 0) return { clients: linked, usesLinks: true };
  return { clients: allowed, usesLinks: false };
}

/** Rounded average volume of the given clients (0 when there are none). */
export function averageClientVolume(clients: Client[]): number {
  if (clients.length === 0) return 0;
  const sum = clients.reduce((acc, c) => acc + c.config.volume.percent, 0);
  return Math.round(sum / clients.length);
}

/** Snapshot of each client's current volume, keyed by client id. */
export function snapshotVolumes(clients: Client[]): Record<string, number> {
  const refs: Record<string, number> = {};
  for (const c of clients) refs[c.id] = c.config.volume.percent;
  return refs;
}
