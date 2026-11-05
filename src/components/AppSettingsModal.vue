<script setup lang="ts">
import { ref, watch } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import AppDialog from "@/components/AppDialog.vue";

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

function lockNow() {
  auth.lock();
  emit("close");
}
</script>

<template>
  <AppDialog :open="props.open" title="Application Settings" @close="emit('close')">
    <div class="space-y-6">
      <div>
        <label
          class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
          >Server Host</label
        >
        <input
          class="w-full px-4 py-2.5 min-h-11 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 outline-none transition-colors text-[var(--text-primary)]"
          v-model="hostInput"
          placeholder="localhost:1780"
        />
      </div>

      <div>
        <label
          class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
          >Theme</label
        >
        <label
          class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer"
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
              class="font-medium text-[var(--text-primary)] capitalize"
              >{{ settings.theme }} Mode</span
            >
          </div>
          <div class="relative inline-flex items-center cursor-pointer">
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
              class="app-toggle"
            ></div>
          </div>
        </label>
      </div>

      <div class="space-y-3">
        <label
          class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer"
        >
          <span class="font-medium text-[var(--text-primary)]"
            >Auto Connect</span
          >
          <div class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="settings.autoConnect"
              class="sr-only peer"
            />
            <div
              class="app-toggle"
            ></div>
          </div>
        </label>

        <label
          class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer"
        >
          <span class="font-medium text-[var(--text-primary)]"
            >Show Empty Groups</span
          >
          <div class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="settings.showEmptyGroups"
              class="sr-only peer"
            />
            <div
              class="app-toggle"
            ></div>
          </div>
        </label>

      </div>

      <div class="pt-4 border-t border-[var(--border)]">
        <h4 class="text-sm font-medium text-[var(--text-primary)] mb-3">Volume Control</h4>

        <div class="space-y-3">
           <label class="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer">
              <div>
                <span class="block font-medium text-[var(--text-primary)]">Control Mode</span>
                <span class="text-xs text-[var(--text-tertiary)]">Global default for volume sliders</span>
              </div>
              <div class="relative inline-flex items-center cursor-pointer">
                <select
                    v-model="settings.globalVolumeControlMode"
                    class="min-h-11 pl-3 bg-transparent border-none text-right focus:ring-0 text-sm font-medium text-blue-600 dark:text-blue-400 cursor-pointer outline-none"
                >
                    <option value="linear">Linear</option>
                    <option value="nonlinear">Non-Linear</option>
                </select>
              </div>
           </label>

           <div v-if="settings.globalVolumeControlMode === 'nonlinear'" class="p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-[var(--text-primary)] text-sm">Control Curve (Exponent)</span>
                <span class="text-xs font-mono bg-[var(--surface-1)] px-2 py-0.5 rounded text-[var(--text-secondary)]">
                  {{ settings.globalVolumeExponent }}
                </span>
              </div>
              <input
                type="range"
                v-model.number="settings.globalVolumeExponent"
                min="1.0"
                max="5.0"
                step="0.1"
                class="app-range"
              />
               <p class="mt-1 text-xs text-[var(--text-tertiary)]">
                 Higher values provide more precision at low volumes.
               </p>
           </div>
        </div>
      </div>

      <div class="pt-4 border-t border-[var(--border)]">
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
          class="mt-2 text-xs text-center text-[var(--text-tertiary)]"
        >
          Help keep this project alive with a donation
        </p>
      </div>

      <div class="pt-4 border-t border-[var(--border)]">
        <h4 class="text-sm font-medium text-[var(--text-primary)] mb-3">
          Authentication
        </h4>

        <label
          class="flex items-center justify-between gap-4 p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] cursor-pointer"
        >
          <div class="flex items-start gap-2">
            <span
              class="mdi mdi-shield-lock-outline text-lg text-[var(--text-tertiary)]"
            ></span>
            <div>
              <span class="block font-medium text-[var(--text-primary)]">
                Require Passcode
              </span>
              <span class="block text-xs text-[var(--text-tertiary)]">
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
              class="app-toggle"
            ></div>
          </div>
        </label>

        <button
          v-if="auth.isAuthEnabled"
          @click="emit('changePermissions')"
          class="mt-3 w-full min-h-11 flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="mdi mdi-tune-variant text-lg"></span>
            <span class="font-medium text-[var(--text-primary)]"
              >Change Permissions</span
            >
          </div>
          <span class="mdi mdi-chevron-right text-[var(--text-tertiary)]"></span>
        </button>

        <!-- The passcode never re-locks itself (no idle timeout, no
             lock-on-background) — this is the only way to actually
             engage Lock Mode again after unlocking. Without it, once
             someone enters the passcode the app stays unlocked
             indefinitely, which defeats a shared/kiosk device's whole
             point. -->
        <button
          v-if="auth.isAuthEnabled"
          @click="lockNow"
          class="mt-3 w-full min-h-11 flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="mdi mdi-lock-outline text-lg"></span>
            <span class="font-medium text-[var(--text-primary)]"
              >Lock Now</span
            >
          </div>
        </button>
        <p class="mt-2 text-xs text-[var(--text-tertiary)]">
          {{
            auth.isAuthEnabled
              ? "Configure access controls and feature permissions"
              : "When authentication is off, all controls are available."
          }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="w-full flex justify-end gap-3">
        <button
          class="px-4 py-2 min-h-11 text-[var(--text-secondary)] font-medium hover:bg-[var(--surface-2)] rounded-lg transition-colors"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 min-h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          @click="apply"
        >
          Apply
        </button>
      </div>
    </template>
  </AppDialog>
</template>
