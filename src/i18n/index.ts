import { getActivePinia } from "pinia";
import { useSettingsStore } from "@/stores/settings";
import es from "./es";

export type Locale = "en" | "es";
export type TranslationParams = Record<string, string | number | undefined>;

/** English messages are stable keys. Substitutions never translate user names. */
export function t(message: string, params: TranslationParams = {}): string {
  const locale = getActivePinia() ? useSettingsStore().locale : "en";
  const translated =
    locale === "es"
      ? ((es as Record<string, string>)[message] ?? message)
      : message;
  return translated.replace(/\{(\w+)\}/g, (token, key: string) =>
    String(params[key] ?? token),
  );
}

export function countLabel(
  count: number,
  singular: string,
  plural: string,
): string {
  return t(count === 1 ? `{count} ${singular}` : `{count} ${plural}`, {
    count,
  });
}
