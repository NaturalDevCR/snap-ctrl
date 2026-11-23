import { getActivePinia } from "pinia";
import { t } from "@/i18n";
import { useSettingsStore } from "@/stores/settings";

export function formatLastSeen(sec: number): string {
  if (!sec) return t("Never");
  return new Date(sec * 1000).toLocaleString(
    getActivePinia() && useSettingsStore().locale === "es" ? "es-CR" : undefined,
  );
}
