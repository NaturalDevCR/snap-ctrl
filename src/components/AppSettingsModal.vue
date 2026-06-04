<script setup lang="ts">
import { ref, watch } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "changePermissions"): void;
  (e: "enableAuthentication"): void;
  (e: "disableAuthentication"): void;
}>();

const snapcast = useSnapcastStore();
const settings = useSettingsStore();
const auth = useAuthStore();

const hostInput = ref("");

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      hostInput.value = snapcast.host;
    }
  }
);

function apply() {
  snapcast.setHost(hostInput.value);
  emit("close");
}

function handleAuthenticationToggle(event: Event) {
  const enabled = (event.target as HTMLInputElement).checked;

  if (enabled) {
    emit("enableAuthentication");
  } else {
    emit("disableAuthentication");
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="props.open"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div
        class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800 transform transition-all"
        @click.stop
      >
        <div
          class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between"
        >
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">
            Application Settings
          </h3>
          <button
            @click="emit('close')"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <span class="mdi mdi-close text-xl"></span>
          </button>
        </div>

        <div class="p-6 space-y-6">
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >Server Host</label
            >
            <input
              class="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-gray-900 dark:text-white"
              v-model="hostInput"
              placeholder="localhost:1780"
            />
          </div>

          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >Theme</label
            >
            <div
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div class="flex items-center gap-2">
                <span
                  class="mdi mdi-white-balance-sunny text-yellow-500"
                  v-if="settings.theme === 'light'"
                ></span>
                <span
                  class="mdi mdi-weather-night text-blue-400"
                  v-else
                ></span>
                <span
                  class="font-medium text-gray-900 dark:text-white capitalize"
                  >{{ settings.theme }} Mode</span
                >
              </div>
              <label
                class="relative inline-flex items-center cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="settings.theme === 'dark'"
                  @change="
                    settings.setTheme(
                      ($event.target as HTMLInputElement).checked
                        ? 'dark'
                        : 'light'
                    )
                  "
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </label>
            </div>
          </div>

          <div class="space-y-3">
            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
            >
              <span class="font-medium text-gray-900 dark:text-white"
                >Auto Connect</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="settings.autoConnect"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>

            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
            >
              <span class="font-medium text-gray-900 dark:text-white"
                >Show Empty Groups</span
              >
              <div class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="settings.showEmptyGroups"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>

          </div>

          <div class="pt-4 border-t border-gray-100 dark:border-gray-800">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Volume Control</h4>

            <div class="space-y-3">
               <label class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                  <div>
                    <span class="block font-medium text-gray-900 dark:text-white">Control Mode</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">Global default for volume sliders</span>
                  </div>
                  <div class="relative inline-flex items-center cursor-pointer">
                    <select
                        v-model="settings.globalVolumeControlMode"
                        class="bg-transparent border-none text-right focus:ring-0 text-sm font-medium text-blue-600 dark:text-blue-400 cursor-pointer outline-none"
                    >
                        <option value="linear">Linear</option>
                        <option value="nonlinear">Non-Linear</option>
                    </select>
                  </div>
               </label>

               <div v-if="settings.globalVolumeControlMode === 'nonlinear'" class="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-medium text-gray-900 dark:text-white text-sm">Control Curve (Exponent)</span>
                    <span class="text-xs font-mono bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                      {{ settings.globalVolumeExponent }}
                    </span>
                  </div>
                  <input
                    type="range"
                    v-model.number="settings.globalVolumeExponent"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    class="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                   <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                     Higher values provide more precision at low volumes.
                   </p>
               </div>
            </div>
          </div>

          <div class="pt-4 border-t border-gray-100 dark:border-gray-800">
            <a
              href="https://paypal.me/NaturalCloud"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-sm transition-all font-medium"
            >
              <span class="mdi mdi-heart"></span>
              <span>Support Development</span>
            </a>
            <p
              class="mt-2 text-xs text-center text-gray-500 dark:text-gray-400"
            >
              Help keep this project alive with a donation
            </p>
          </div>

          <div class="pt-4 border-t border-gray-100 dark:border-gray-800">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Authentication
            </h4>

            <label
              class="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
            >
              <div class="flex items-start gap-2">
                <span
                  class="mdi mdi-shield-lock-outline text-lg text-gray-500 dark:text-gray-400"
                ></span>
                <div>
                  <span class="block font-medium text-gray-900 dark:text-white">
                    Require Passcode
                  </span>
                  <span class="block text-xs text-gray-500 dark:text-gray-400">
                    Off by default. Enable it to protect settings and
                    permissions.
                  </span>
                </div>
              </div>
              <div class="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  :checked="auth.isAuthEnabled"
                  class="sr-only peer"
                  @change="handleAuthenticationToggle"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>

            <button
              v-if="auth.isAuthEnabled"
              @click="emit('changePermissions')"
              class="mt-3 w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div class="flex items-center gap-2">
                <span class="mdi mdi-tune-variant text-lg"></span>
                <span class="font-medium text-gray-900 dark:text-white"
                  >Change Permissions</span
                >
              </div>
              <span class="mdi mdi-chevron-right text-gray-400"></span>
            </button>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {{
                auth.isAuthEnabled
                  ? "Configure access controls and feature permissions"
                  : "When authentication is off, all controls are available."
              }}
            </p>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3"
        >
          <button
            class="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
            @click="apply"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
