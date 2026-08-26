<script setup lang="ts">
import { ref, computed } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { useSettingsStore } from "@/stores/settings";

defineProps<{
  showingPermissionsSetup: boolean;
}>();

const snapcast = useSnapcastStore();
const settings = useSettingsStore();

const DEFAULT_PORT = "1780";

/** True if `value` already has an explicit :port — a bare hostname/IPv4
 * ("192.168.1.42"), a "host:port" pair, or a bracketed IPv6 with port
 * ("[::1]:1780"). Bare (unbracketed) IPv6 addresses have colons of their
 * own and can't be told apart from "host:port" reliably, so those are left
 * untouched rather than guessed at. */
function hasExplicitPort(value: string): boolean {
  if (/^\[[^\]]+\]:\d+$/.test(value)) return true;
  if (/^[^:[\]]+:\d+$/.test(value)) return true;
  return false;
}

function looksLikeBareIPv6(value: string): boolean {
  return !value.startsWith("[") && (value.match(/:/g) || []).length >= 2;
}

/** Most people type "192.168.1.42" and never notice the help text calling
 * out the port — they just get a generic "did not answer" error with no
 * clue why. Fill in the documented default instead of making them guess. */
function withDefaultPort(value: string): string {
  if (hasExplicitPort(value) || looksLikeBareIPv6(value)) return value;
  return `${value}:${DEFAULT_PORT}`;
}

const hostInput = ref(snapcast.host);
const haSnapcastInfo = (window as any).__HA_SNAPCAST_INFO__ as
  | string
  | undefined;
const connectHostError = ref("");

function isLoopbackHost(value: string): boolean {
  const host = value.trim().toLowerCase();
  return (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host === "[::1]" ||
    host.startsWith("[::1]:")
  );
}

const isLoopbackTarget = computed(() => isLoopbackHost(snapcast.host));

const connectionPanelTitle = computed(() => {
  if (!snapcast.connectionError) return "Connect to Snapcast";
  if (haSnapcastInfo) return "Check the Home Assistant proxy";
  return "Tell SnapCtrl where your server is";
});

const connectionPanelDescription = computed(() => {
  if (haSnapcastInfo) {
    return "SnapCtrl is using the Home Assistant add-on proxy. If this fails, check the add-on configuration and Snapcast service.";
  }

  if (snapcast.connectionError && isLoopbackTarget.value) {
    return "We tried localhost first. If Snapcast runs on another device, enter that device's IP address or hostname below.";
  }

  if (snapcast.connectionError) {
    return "We could not reach the saved server address. Check the host, port, and network access, then try again.";
  }

  return "SnapCtrl will try the local server first. If Snapcast is on another device, use its LAN IP address or hostname.";
});

const connectionFormTone = computed<"warning" | "error">(() => {
  if (connectHostError.value) return "error";
  return "warning";
});

const connectionFormMessage = computed(() => {
  if (connectHostError.value) return connectHostError.value;
  if (!snapcast.connectionError) return "";
  if (haSnapcastInfo) {
    return "The add-on proxy could not reach Snapcast. Confirm the add-on host and port settings.";
  }
  if (isLoopbackTarget.value) {
    return "Snapcast did not answer on localhost:1780. Enter the IP or hostname of the machine running Snapcast.";
  }
  return `Snapcast did not answer on ${snapcast.host}. Try another address or confirm port 1780 is open.`;
});

const hostSuggestions = computed(() => {
  // Recent servers actually used from this browser are more useful than
  // generic guesses, so they're offered first.
  const suggestions = new Set<string>(settings.recentHosts);
  const pageHostname = window.location.hostname;

  if (pageHostname && !isLoopbackHost(pageHostname)) {
    suggestions.add(`${pageHostname}:1780`);
  }

  suggestions.add("localhost:1780");
  suggestions.add("snapcast.local:1780");

  return Array.from(suggestions);
});

function updateHost() {
  const rawHost = hostInput.value.trim();

  if (!haSnapcastInfo && !rawHost) {
    connectHostError.value = "Enter an IP address or hostname to continue.";
    return;
  }

  const nextHost = withDefaultPort(rawHost);
  hostInput.value = nextHost;

  connectHostError.value = "";
  settings.addRecentHost(nextHost);
  snapcast.setHost(nextHost);
  snapcast.disconnect();
  snapcast.connect();
}

function useHostSuggestion(host: string) {
  hostInput.value = host;
  connectHostError.value = "";
}
</script>

<template>
  <div
    class="grid min-h-[60vh] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
  >
    <section
      class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="border-b border-gray-100 p-6 dark:border-slate-800 sm:p-8">
        <div class="mb-6 flex items-center gap-3">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300"
          >
            <span class="mdi mdi-cast-audio text-2xl"></span>
          </div>
          <div>
            <p class="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
              Snapcast server
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Default target: localhost:1780
            </p>
          </div>
        </div>

        <h2
          class="max-w-2xl text-3xl font-bold leading-tight text-gray-950 dark:text-white sm:text-4xl"
        >
          {{ connectionPanelTitle }}
        </h2>
        <p class="mt-3 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
          {{ connectionPanelDescription }}
        </p>
      </div>

      <div class="p-6 sm:p-8">
        <!-- Initial Setup Info -->
        <div
          v-if="showingPermissionsSetup"
          class="mb-6 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-800 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-200"
        >
          <div class="flex items-start gap-3">
            <span
              class="mdi mdi-information-outline shrink-0 text-xl"
            ></span>
            <div>
              <p class="text-sm font-semibold">Initial setup</p>
              <p class="mt-1 text-sm leading-6">
                Connect to your server to load groups, sources, and
                clients. You'll configure permissions after connecting.
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="connectionFormMessage"
          class="mb-6 rounded-xl border p-4 text-sm"
          :class="
            connectionFormTone === 'error'
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200'
              : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
          "
          aria-live="polite"
        >
          <div class="flex items-start gap-3">
            <span
              class="mdi shrink-0 text-lg"
              :class="
                connectionFormTone === 'error'
                  ? 'mdi-alert-circle-outline'
                  : 'mdi-map-marker-question-outline'
              "
            ></span>
            <span>{{ connectionFormMessage }}</span>
          </div>
        </div>

        <form class="space-y-5" @submit.prevent="updateHost">
          <!-- HA addon mode: show read-only Snapcast info, no manual host entry -->
          <div v-if="haSnapcastInfo">
            <label
              class="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200"
            >
              Home Assistant proxy
            </label>
            <div
              class="flex min-h-12 items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
            >
              <span class="mdi mdi-home-assistant text-lg text-cyan-600 dark:text-cyan-300"></span>
              <span>
                Snapcast:
                <span class="font-mono text-gray-900 dark:text-white">
                  {{ haSnapcastInfo }}
                </span>
                <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  via addon proxy
                </span>
              </span>
            </div>
          </div>

          <div v-else>
            <label
              for="snapcast-host"
              class="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200"
            >
              IP address or hostname
            </label>
            <div class="relative">
              <span
                class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <span class="mdi mdi-server-network"></span>
              </span>
              <input
                id="snapcast-host"
                v-model="hostInput"
                name="snapcast-host"
                type="text"
                inputmode="url"
                autocomplete="off"
                enterkeyhint="go"
                aria-describedby="snapcast-host-help snapcast-host-error"
                placeholder="192.168.1.42:1780 or snapcast.local:1780"
                class="min-h-12 w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-base text-gray-950 outline-none transition-all placeholder:text-gray-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-cyan-400"
                @input="connectHostError = ''"
              />
            </div>
            <p
              id="snapcast-host-help"
              class="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400"
            >
              Include the Snapcast JSON-RPC port. The default is
              <span class="font-mono text-gray-700 dark:text-gray-200">
                1780
              </span>.
            </p>
            <p
              v-if="connectHostError"
              id="snapcast-host-error"
              class="mt-2 text-sm font-medium text-red-700 dark:text-red-300"
            >
              {{ connectHostError }}
            </p>
          </div>

          <div
            v-if="hostSuggestions.length > 0 && !haSnapcastInfo"
            class="flex flex-wrap gap-2"
          >
            <span
              v-for="suggestion in hostSuggestions"
              :key="suggestion"
              class="group inline-flex items-stretch overflow-hidden rounded-lg border transition-all"
              :class="
                hostInput === suggestion
                  ? 'border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'
              "
            >
              <button
                type="button"
                class="px-3 py-2 text-sm font-medium active:scale-[0.98]"
                @click="useHostSuggestion(suggestion)"
              >
                {{ suggestion }}
              </button>
              <button
                v-if="settings.recentHosts.includes(suggestion)"
                type="button"
                class="px-2 text-gray-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100 focus:opacity-100 dark:hover:text-red-400"
                :aria-label="`Forget ${suggestion}`"
                @click="settings.removeRecentHost(suggestion)"
              >
                <span class="mdi mdi-close text-sm"></span>
              </button>
            </span>
          </div>

          <button
            type="submit"
            class="min-h-12 w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white shadow-sm shadow-cyan-950/10 transition-all hover:bg-cyan-500 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-cyan-500/25 dark:bg-cyan-500 dark:hover:bg-cyan-400"
          >
            Connect to Snapcast
          </button>
        </form>
      </div>
    </section>

    <aside
      class="rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-slate-800 dark:bg-slate-900/60"
    >
      <h3 class="text-base font-semibold text-gray-950 dark:text-white">
        Where is Snapcast running?
      </h3>
      <div class="mt-5 space-y-4">
        <div class="flex gap-3">
          <span
            class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-semibold text-cyan-700 dark:bg-slate-800 dark:text-cyan-300"
          >
            1
          </span>
          <p class="text-sm leading-6 text-gray-600 dark:text-gray-300">
            If this UI is installed on the same machine as Snapcast, keep
            <span class="font-mono text-gray-800 dark:text-gray-100">
              localhost:1780
            </span>.
          </p>
        </div>
        <div class="flex gap-3">
          <span
            class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-semibold text-cyan-700 dark:bg-slate-800 dark:text-cyan-300"
          >
            2
          </span>
          <p class="text-sm leading-6 text-gray-600 dark:text-gray-300">
            If Snapcast is on another device, use that device's LAN IP or
            hostname.
          </p>
        </div>
        <div class="flex gap-3">
          <span
            class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-semibold text-cyan-700 dark:bg-slate-800 dark:text-cyan-300"
          >
            3
          </span>
          <p class="text-sm leading-6 text-gray-600 dark:text-gray-300">
            Make sure port
            <span class="font-mono text-gray-800 dark:text-gray-100">1780</span>
            is reachable from this browser.
          </p>
        </div>
      </div>
    </aside>
  </div>
</template>
