import type { Group } from "@/types/snapcast-rpc";

export function applyZoneFilter(
  groups: Group[],
  zoneFilter: string[] | undefined
): Group[] {
  if (!zoneFilter || zoneFilter.length === 0) return groups;

  const wanted = zoneFilter.map((name) => name.trim().toLowerCase());

  const result: Group[] = [];
  for (const group of groups) {
    const groupMatches = wanted.includes(group.name.trim().toLowerCase());
    if (groupMatches) {
      result.push(group);
      continue;
    }
    const matchingClients = group.clients.filter((client) =>
      wanted.includes(client.name.trim().toLowerCase())
    );
    if (matchingClients.length > 0) {
      result.push({ ...group, clients: matchingClients });
    }
  }
  return result;
}
