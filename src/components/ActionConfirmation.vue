<script setup lang="ts">
import { onUnmounted, watch, shallowRef } from "vue";
import AppDialog from "@/components/AppDialog.vue";
import { useConfirmationStore } from "@/stores/confirmation";
import { useAuthStore } from "@/stores/auth";
import { t } from "@/i18n";
const confirmation = useConfirmationStore();
const auth = useAuthStore();
// Retain the last request throughout the closing animation.
const displayed = shallowRef(confirmation.pending);
watch(
  () => confirmation.pending,
  (request) => {
    if (request) displayed.value = request;
  },
  { flush: "sync" },
);

watch(
  () => auth.isLocked || !auth.isAuthenticated,
  (blocked) => {
    if (blocked) confirmation.settle(false);
  },
);
onUnmounted(() => confirmation.settle(false));
</script>

<template>
  <AppDialog
    :open="!!confirmation.pending"
    :title="t(displayed?.kind === 'source' ? 'Change source' : 'Mute audio')"
    :layer="300"
    size="sm"
    @close="confirmation.settle(false)"
  >
    <div class="mute-confirmation-body">
      <div class="mute-confirmation-symbol" aria-hidden="true">
        <span
          class="mdi"
          :class="
            displayed?.kind === 'source'
              ? 'mdi-swap-horizontal'
              : 'mdi-volume-off'
          "
        ></span>
      </div>
      <p class="mute-confirmation-question">
        {{ displayed ? t(displayed.message, displayed.params) : "" }}
      </p>
      <p class="mute-confirmation-description">
        {{
          t(
            displayed?.kind === "source"
              ? "This replaces what is currently playing in this zone."
              : "You can turn the sound back on at any time. Your source will keep playing.",
          )
        }}
      </p>
    </div>
    <template #footer>
      <div class="mute-confirmation-actions">
        <button
          type="button"
          class="mute-confirmation-cancel"
          @click="confirmation.settle(false)"
        >
          {{ t("Cancel") }}
        </button>
        <button
          type="button"
          class="mute-confirmation-accept"
          @click="confirmation.settle(true)"
        >
          <span
            class="mdi"
            :class="
              displayed?.kind === 'source'
                ? 'mdi-swap-horizontal'
                : 'mdi-volume-off'
            "
            aria-hidden="true"
          ></span
          >{{ t(displayed?.kind === "source" ? "Change source" : "Mute") }}
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<style scoped>
.mute-confirmation-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 4px 0 8px;
}
.mute-confirmation-symbol {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  margin: 8px 0 24px;
  border-radius: 24px;
  background: color-mix(in srgb, var(--brand) 12%, var(--surface-1));
  color: var(--brand);
  border: 1px solid color-mix(in srgb, var(--brand) 20%, transparent);
  box-shadow: 0 0 0 8px color-mix(in srgb, var(--brand) 4%, transparent);
  font-size: 32px;
}
.mute-confirmation-question {
  font-size: 19px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}
.mute-confirmation-description {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-tertiary);
}
.mute-confirmation-actions {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.mute-confirmation-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  transition:
    background 0.2s,
    transform 0.2s;
}
.mute-confirmation-actions button:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 3px;
}
.mute-confirmation-cancel {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}
.mute-confirmation-cancel:hover {
  background: var(--surface-3);
}
.mute-confirmation-accept {
  background: var(--text-primary);
  color: var(--surface-1);
  border: 1px solid transparent;
}
.mute-confirmation-accept:hover {
  opacity: 0.9;
}
.mute-confirmation-actions button:active {
  transform: scale(0.97);
}
</style>
