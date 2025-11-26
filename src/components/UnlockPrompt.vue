<template>
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    @click.self="handleCancel"
  >
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800 transform transition-all"
      @click.stop
    >
      <div
        class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between"
      >
        <h3
          class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"
        >
          <span class="mdi mdi-lock-outline"></span>
          Enter Passcode
        </h3>
        <button
          v-if="canCancel"
          @click="handleCancel"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <span class="mdi mdi-close text-xl"></span>
        </button>
      </div>

      <div class="p-6 space-y-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Enter your passcode to continue
        </p>

        <div>
          <input
            ref="passcodeInput"
            v-model="passcode"
            type="password"
            :class="[
              'w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border rounded-lg outline-none transition-colors text-gray-900 dark:text-white',
              error
                ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                : 'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400',
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
        class="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3"
      >
        <button
          v-if="canCancel"
          class="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          @click="handleCancel"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
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
</script>
