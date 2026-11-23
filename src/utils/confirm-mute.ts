import type { TranslationParams } from "@/i18n";
import { useConfirmationStore } from "@/stores/confirmation";

/** Resolve only after a deliberate decision in the app's shared dialog. */
export function confirmMute(
  message: string,
  params: TranslationParams = {},
): Promise<boolean> {
  return useConfirmationStore().ask("mute", message, params);
}
