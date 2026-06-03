export function formatLastSeen(sec: number): string {
  if (!sec) return "Never";
  return new Date(sec * 1000).toLocaleString();
}
