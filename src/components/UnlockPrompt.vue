<template>
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--scrim)] backdrop-blur-sm"
    @click.self="handleCancel"
  >
    <div
      class="bg-[var(--surface-1)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[var(--border)] transform transition-all"
      @click.stop
    >
      <div
        class="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between"
      >
        <h3
          class="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2"
        >
          <span class="mdi mdi-lock-outline"></span>
          Enter Passcode
        </h3>
        <button
          v-if="canCancel"
          @click="handleCancel"
          aria-label="Cancel"
          class="w-11 h-11 -mr-2 -my-2 inline-flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <span class="mdi mdi-close text-xl"></span>
        </button>
      </div>

      <div class="p-6 space-y-4">
        <p class="text-sm text-[var(--text-tertiary)]">
          Enter your passcode to continue
        </p>

        <div>
          <input
            ref="passcodeInput"
            v-model="passcode"
            type="password"
            :class="[
              'w-full px-4 py-3 bg-[var(--surface-2)] min-h-[44px] border rounded-lg outline-none transition-colors text-[var(--text-primary)]',
              error
                ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                : 'border-[var(--border)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400',
            ]"
            placeholder="Enter passcode"
            @keyup.enter="handleUnlock"
            @input="error = ''"
          />
        </div>

        <div
          v-if="error"
          class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 text-sm flex items-start gap-2"
        >
          <span class="mdi mdi-alert-circle shrink-0"></span>
          <span>{{ error }}</span>
        </div>
      </div>

      <div
        class="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3"
      >
        <button
          v-if="canCancel"
          class="px-4 py-2 min-h-11 text-[var(--text-secondary)] font-medium hover:bg-[var(--surface-2)] rounded-lg transition-colors"
          @click="handleCancel"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 min-h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          @click="handleUnlock"
        >
          Unlock
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useEscapeToClose } from "@/composables/useEscapeToClose";

const props = withDefaults(
  defineProps<{
    canCancel?: boolean;
  }>(),
  {
    canCancel: true,
  }
);

const emit = defineEmits<{
  unlock: [];
  cancel: [];
}>();

const auth = useAuthStore();

const passcode = ref("");
const error = ref("");
const passcodeInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  // Auto-focus the input
  setTimeout(() => {
    passcodeInput.value?.focus();
  }, 100);
});

async function handleUnlock() {
  error.value = "";

  if (!passcode.value) {
    error.value = "Please enter your passcode";
    return;
  }

  const isValid = await auth.verifyPasscode(passcode.value);

  if (isValid) {
    emit("unlock");
    passcode.value = "";
  } else {
    error.value = "Incorrect passcode";
    passcode.value = "";
    passcodeInput.value?.focus();
  }
}

function handleCancel() {
  if (props.canCancel) {
    passcode.value = "";
    error.value = "";
    emit("cancel");
  }
}

// handleCancel already no-ops when !canCancel, so Escape is always safe to
// wire up here — it just won't do anything when cancelling isn't allowed.
useEscapeToClose(() => true, handleCancel);
</script>
