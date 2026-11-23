/**
 * Derive a human-friendly stream name from a Snapcast stream URI.
 * Handles both string URIs and parsed URI objects returned by Server.GetStatus.
 */
import { t } from "@/i18n";

export function getStreamName(
  stream: { uri?: unknown; id?: string } | null | undefined,
): string {
  if (!stream) return t("Unknown Source");
  const uri = stream.uri;
  if (!uri) return stream.id ?? t("Unknown Source");

  if (typeof uri === "string") {
    const q = uri.split("?")[1] || "";
    const params = new URLSearchParams(q);
    return params.get("name") || uri;
  }

  if (typeof uri === "object") {
    const u = uri as { query?: unknown; path?: string };
    const query = u.query;
    if (typeof query === "string") {
      const params = new URLSearchParams(query);
      return params.get("name") || (u.path ?? stream.id ?? t("Unknown Source"));
    }
    if (query && typeof query === "object") {
      const name = (query as { name?: string }).name;
      return name || (u.path ?? stream.id ?? t("Unknown Source"));
    }
    return u.path ?? stream.id ?? t("Unknown Source");
  }
  return stream.id ?? t("Unknown Source");
}
