import { defineStore } from "pinia";
import { ref, watch } from "vue";

export interface GroupVolumeLink {
  linkedClientIds: string[];
  // Reference volumes (100% baseline) for each linked client
  // Key: clientId, Value: reference volume percentage
  referenceVolumes: Record<string, number>;
}

export const useSettingsStore = defineStore(
  "settings",
  () => {
    const theme = ref<"light" | "dark">("dark");
    const autoConnect = ref(true);
    const showDisconnectedClients = ref(false);
    const showEmptyGroups = ref(true);
    const volumeStep = ref(5);
    const refreshInterval = ref(5000); // milliseconds
    const hiddenGroups = ref<string[]>([]);
    // Group volume control links: which clients are linked to group volume
    const groupVolumeLinks = ref<Record<string, GroupVolumeLink>>({});

    function setHiddenGroups(groups: string[]) {
      hiddenGroups.value = groups;
    }

    function setGroupVolumeLinks(
      groupId: string,
      linkedClientIds: string[],
      referenceVolumes: Record<string, number>
    ) {
      groupVolumeLinks.value[groupId] = { linkedClientIds, referenceVolumes };
    }

    // Persisted client ordering per group id -> client id array
    // Removed manual client ordering feature per request

    function setTheme(newTheme: "light" | "dark") {
      theme.value = newTheme;
      // Apply theme immediately
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }

    function toggleTheme() {
      const newTheme = theme.value === "light" ? "dark" : "light";
      setTheme(newTheme);
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

    // Watch for theme changes to apply to document (for persistence rehydration)
    watch(theme, (newTheme) => {
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    });

    // Apply initial theme on mount
    if (theme.value === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    return {
      theme,
      autoConnect,
      showDisconnectedClients,
      showEmptyGroups,
      volumeStep,
      refreshInterval,
      hiddenGroups,
      groupVolumeLinks,
      setTheme,
      toggleTheme,
      setAutoConnect,
      setShowDisconnectedClients,
      setShowEmptyGroups,
      setVolumeStep,
      setRefreshInterval,
      setHiddenGroups,
      setGroupVolumeLinks,
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
        "groupVolumeLinks",
      ],
    },
  }
);
