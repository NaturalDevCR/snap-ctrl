<template>
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-indigo-700"
  >
    <div
      class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-8"
    >
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 mb-4"
        >
          <span class="mdi mdi-lock-outline text-4xl"></span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Setup Passcode
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          Create a passcode to secure your Snapcast control
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Passcode
          </label>
          <input
            v-model="passcode"
            type="password"
            :class="[
              'w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border rounded-lg outline-none transition-colors text-gray-900 dark:text-white',
              error
                ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                : 'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400',
            ]"
            placeholder="Enter passcode"
            required
            minlength="4"
          />
        </div>

        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Confirm Passcode
          </label>
          <input
            v-model="confirmPasscode"
            type="password"
            :class="[
              'w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border rounded-lg outline-none transition-colors text-gray-900 dark:text-white',
              error
                ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                : 'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400',
            ]"
            placeholder="Confirm passcode"
            required
            minlength="4"
          />
        </div>

        <div
          v-if="error"
          class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 text-sm flex items-start gap-2"
        >
          <span class="mdi mdi-alert-circle shrink-0"></span>
          <span>{{ error }}</span>
        </div>

        <div
          class="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 text-blue-700 dark:text-blue-400 text-sm flex items-start gap-2"
        >
          <span class="mdi mdi-information-outline shrink-0"></span>
          <span
            >Minimum 4 characters. This passcode will be required to access
            settings and change permissions.</span
          >
        </div>

        <button
          type="submit"
          class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900"
        >
          Continue to Permissions
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
  complete: [passcode: string];
}>();

const passcode = ref("");
const confirmPasscode = ref("");
const error = ref("");

function handleSubmit() {
  error.value = "";

  if (passcode.value.length < 4) {
    error.value = "Passcode must be at least 4 characters";
    return;
  }

  if (passcode.value !== confirmPasscode.value) {
    error.value = "Passcodes do not match";
    return;
  }

  emit("complete", passcode.value);
}
</script>
