import { defineStore } from "pinia";
import { ref, watch } from "vue";

export const useSettingsStore = defineStore(
  "settings",
  () => {
    const theme = ref<"light" | "dark">("dark");
    const autoConnect = ref(true);
    const showDisconnectedClients = ref(false);
    const showEmptyGroups = ref(true);
    const volumeStep = ref(5);
    const refreshInterval = ref(5000); // milliseconds
    // Persisted client ordering per group id -> client id array
    // Removed manual client ordering feature per request

    function setTheme(newTheme: "light" | "dark") {
      theme.value = newTheme;
    }

    function toggleTheme() {
      theme.value = theme.value === "light" ? "dark" : "light";
    }

    function setAutoConnect(value: boolean) {
      autoConnect.value = value;
    }

    function setShowDisconnectedClients(value: boolean) {
      showDisconnectedClients.value = value;
    }

    function setShowEmptyGroups(value: boolean) {
      showEmptyGroups.value = value;
    }

    function setVolumeStep(step: number) {
      volumeStep.value = Math.max(1, Math.min(20, step));
    }

    function setRefreshInterval(interval: number) {
      refreshInterval.value = Math.max(1000, Math.min(30000, interval));
    }

    // Watch for theme changes to apply to document
    watch(
      theme,
      (newTheme) => {
        if (newTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },
      { immediate: true }
    );

    return {
      theme,
      autoConnect,
      showDisconnectedClients,
      showEmptyGroups,
      volumeStep,
      refreshInterval,
      hiddenGroups,
      setTheme,
      toggleTheme,
      setAutoConnect,
      setShowDisconnectedClients,
      setShowEmptyGroups,
      setVolumeStep,
      setRefreshInterval,
      setHiddenGroups,
    };
  },
  {
    persist: {
      key: "snapcast-settings",
      pick: [
        "theme",
        "autoConnect",
        "showDisconnectedClients",
        "showEmptyGroups",
        "volumeStep",
        "refreshInterval",
        "hiddenGroups",
      ],
    },
  }
);
