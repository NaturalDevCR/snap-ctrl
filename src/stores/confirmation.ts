import { defineStore } from "pinia";
import { ref } from "vue";
import type { TranslationParams } from "@/i18n";

interface ConfirmationRequest {
  kind: "mute" | "source";
  message: string;
  params: TranslationParams;
}

/** One app-wide prompt: switching layouts never destroys a pending decision. */
export const useConfirmationStore = defineStore("confirmation", () => {
  const pending = ref<ConfirmationRequest | null>(null);
  let resolvePending: ((accepted: boolean) => void) | null = null;

  function ask(
    kind: "mute" | "source",
    message: string,
    params: TranslationParams = {},
  ): Promise<boolean> {
    // Ignore duplicate taps rather than replacing a decision already on screen.
    if (pending.value) return Promise.resolve(false);
    return new Promise((resolve) => {
      resolvePending = resolve;
      pending.value = { kind, message, params: { ...params } };
    });
  }
  function settle(accepted: boolean) {
    const resolve = resolvePending;
    resolvePending = null;
    pending.value = null;
    resolve?.(accepted);
  }
  return { pending, ask, settle };
});
