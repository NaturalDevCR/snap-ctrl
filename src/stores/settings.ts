import { defineStore } from "pinia";
import { ref, watch } from "vue";

// Force HMR reload

export interface GroupVolumeLink {
  linkedClientIds: string[];
  // Reference volumes (100% baseline) for each linked client
  // Key: clientId, Value: reference volume percentage
  referenceVolumes: Record<string, number>;
}

export type ClientSourceVolumes = Record<string, Record<string, number>>;

export const useSettingsStore = defineStore(
  "settings",
  () => {
    const theme = ref<"light" | "dark">("dark");
    const autoConnect = ref(true);
    const showDisconnectedClients = ref(false);
    const showEmptyGroups = ref(true);
    const volumeStep = ref(5);
    const hiddenGroups = ref<string[]>([]);
    // Group volume control links: which clients are linked to group volume
    const groupVolumeLinks = ref<Record<string, GroupVolumeLink>>({});

    // Per-source volume memory
    // List of group IDs that have per-source volume enabled
    const enabledPerSourceVolumeGroups = ref<string[]>([]);
    // client_id -> stream_id -> volume_percent
    const clientSourceVolumes = ref<ClientSourceVolumes>({});

    function isPerSourceVolumeEnabled(groupId: string): boolean {
      return enabledPerSourceVolumeGroups.value.includes(groupId);
    }

    function setPerSourceVolumeEnabled(groupId: string, enabled: boolean) {
      if (enabled) {
        if (!enabledPerSourceVolumeGroups.value.includes(groupId)) {
          enabledPerSourceVolumeGroups.value.push(groupId);
        }
      } else {
        enabledPerSourceVolumeGroups.value = enabledPerSourceVolumeGroups.value.filter(
          (id) => id !== groupId
        );
      }
    }

    // Non-linear volume control settings
    const globalVolumeControlMode = ref<"linear" | "nonlinear">("linear");
    const globalVolumeExponent = ref(2.0);
    // Group-specific overrides: undefined/null means use global setting
    const groupVolumeControlConfig = ref<
      Record<string, { mode: "global" | "linear" | "nonlinear"; exponent?: number }>
    >({});

    /**
     * Get the effective volume control mode for a group.
     * If no group provided or group set to 'global', returns global mode.
     */
    function getVolumeControlMode(groupId?: string): "linear" | "nonlinear" {
      if (groupId && groupVolumeControlConfig.value[groupId]) {
        const config = groupVolumeControlConfig.value[groupId];
        if (config.mode !== "global") {
          return config.mode;
        }
      }
      return globalVolumeControlMode.value;
    }

    /**
     * Get the effective volume exponent for a group.
     * If linear mode, returns 1.
     * If non-linear:
     *   - If group has specific exponent, use it.
     *   - Otherwise use global exponent.
     */
    function getVolumeExponent(groupId?: string): number {
      const mode = getVolumeControlMode(groupId);
      if (mode === "linear") return 1;

      if (groupId && groupVolumeControlConfig.value[groupId]) {
        const config = groupVolumeControlConfig.value[groupId];
        if (config.exponent !== undefined && config.exponent !== null) {
          return config.exponent;
        }
      }
      return globalVolumeExponent.value;
    }

    function setGroupVolumeControlConfig(
      groupId: string,
      mode: "global" | "linear" | "nonlinear",
      exponent?: number
    ) {
      if (!groupVolumeControlConfig.value[groupId]) {
        groupVolumeControlConfig.value[groupId] = { mode: "global" };
      }
      groupVolumeControlConfig.value[groupId].mode = mode;
      if (exponent !== undefined) {
        groupVolumeControlConfig.value[groupId].exponent = exponent;
      }
    }

    function saveClientVolume(
      clientId: string,
      streamId: string,
      volume: number
    ) {
      console.log(`[Settings] saveClientVolume: Client=${clientId}, Stream=${streamId}, Vol=${volume}`);
      if (!clientSourceVolumes.value[clientId]) {
        clientSourceVolumes.value[clientId] = {};
      }
      clientSourceVolumes.value[clientId][streamId] = volume;
    }

    function getClientVolume(
      clientId: string,
      streamId: string
    ): number | undefined {
      return clientSourceVolumes.value[clientId]?.[streamId];
    }

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

    // Custom group ordering
    const customGroupOrder = ref<string[]>([]);

    function setCustomGroupOrder(order: string[]) {
      customGroupOrder.value = order;
    }

    function moveGroupUp(groupId: string) {
      const index = customGroupOrder.value.indexOf(groupId);
      if (index > 0) {
        const newOrder = [...customGroupOrder.value];
        const prev = newOrder[index - 1];
        const curr = newOrder[index];
        if (prev !== undefined && curr !== undefined) {
          newOrder[index - 1] = curr;
          newOrder[index] = prev;
          customGroupOrder.value = newOrder;
        }
      }
    }

    function moveGroupDown(groupId: string) {
      const index = customGroupOrder.value.indexOf(groupId);
      if (index !== -1 && index < customGroupOrder.value.length - 1) {
        const newOrder = [...customGroupOrder.value];
        const curr = newOrder[index];
        const next = newOrder[index + 1];
        if (curr !== undefined && next !== undefined) {
          newOrder[index] = next;
          newOrder[index + 1] = curr;
          customGroupOrder.value = newOrder;
        }
      }
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
      hiddenGroups,
      groupVolumeLinks,
      setTheme,
      toggleTheme,
      setAutoConnect,
      setShowDisconnectedClients,
      setShowEmptyGroups,
      setVolumeStep,
      setHiddenGroups,
      setGroupVolumeLinks,
      customGroupOrder,
      setCustomGroupOrder,
      moveGroupUp,
      moveGroupDown,
      clientSourceVolumes,
      enabledPerSourceVolumeGroups,
      isPerSourceVolumeEnabled,
      setPerSourceVolumeEnabled,
      saveClientVolume,
      getClientVolume,
      globalVolumeControlMode,
      globalVolumeExponent,
      groupVolumeControlConfig,
      getVolumeControlMode,
      getVolumeExponent,
      setGroupVolumeControlConfig,
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
        "hiddenGroups",
        "groupVolumeLinks",
        "customGroupOrder",
        "enabledPerSourceVolumeGroups",
        "clientSourceVolumes",
        "globalVolumeControlMode",
        "globalVolumeExponent",
        "groupVolumeControlConfig",
      ],
    },
  }
);
