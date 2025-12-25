import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface AuthPermissions {
  // Feature permissions
  canAdjustVolumes: boolean;
  canRenameGroups: boolean;
  canRenameClients: boolean;

  // UI Visibility permissions
  showGroupSettings: boolean;
  showClientSettings: boolean;
  showGroupFilter: boolean;
  showCreateGroup: boolean;
  showBrowserPlayer: boolean;

  // Entity permissions (empty arrays = all allowed)
  allowedGroups: string[];
  allowedSources: string[];
  allowedClients: string[];
}

export const useAuthStore = defineStore(
  "auth",
  () => {
    const passcodeHash = ref<string | null>(null);
    const isLocked = ref(false);
    const permissions = ref<AuthPermissions>({
      canAdjustVolumes: true,
      canRenameGroups: true,
      canRenameClients: true,
      showGroupSettings: true,
      showClientSettings: true,
      showGroupFilter: true,
      showCreateGroup: true,
      showBrowserPlayer: true,
      allowedGroups: [],
      allowedSources: [],
      allowedClients: [],
    });

    // Computed properties
    const isAuthenticated = computed(() => passcodeHash.value !== null);
    const requiresSetup = computed(() => passcodeHash.value === null);

    // Hash passcode using SHA-256
    // Hash passcode using SHA-256 (or fallback for insecure contexts)
    async function hashPasscode(passcode: string): Promise<string> {
      if (window.crypto && window.crypto.subtle) {
        try {
          const encoder = new TextEncoder();
          const data = encoder.encode(passcode);
          const hashBuffer = await crypto.subtle.digest("SHA-256", data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        } catch (e) {
          console.warn("Crypto API failed, using fallback:", e);
        }
      }

      // Fallback hash for insecure contexts (HTTP)
      let hash = 5381;
      for (let i = 0; i < passcode.length; i++) {
        hash = (hash * 33) ^ passcode.charCodeAt(i);
      }
      return (hash >>> 0).toString(16);
    }

    // Set new passcode (for initial setup or change)
    async function setPasscode(passcode: string): Promise<void> {
      const hash = await hashPasscode(passcode);
      passcodeHash.value = hash;
      isLocked.value = false;
    }

    // Verify passcode
    async function verifyPasscode(passcode: string): Promise<boolean> {
      if (!passcodeHash.value) return false;
      const hash = await hashPasscode(passcode);
      return hash === passcodeHash.value;
    }

    // Update permissions
    function updatePermissions(newPermissions: AuthPermissions): void {
      permissions.value = { ...newPermissions };
    }

    // Check if a specific permission is granted
    function hasFeaturePermission(
      feature: keyof Pick<
        AuthPermissions,
        "canAdjustVolumes" | "canRenameGroups" | "canRenameClients"
      >
    ): boolean {
      return permissions.value[feature];
    }

    // Check if an entity (group/source/client) is allowed
    function isEntityAllowed(
      type: "group" | "source" | "client",
      id: string
    ): boolean {
      const allowedKey =
        type === "group"
          ? "allowedGroups"
          : type === "source"
          ? "allowedSources"
          : "allowedClients";

      const allowed = permissions.value[allowedKey];
      // Empty array means all are allowed
      return allowed.length === 0 || allowed.includes(id);
    }

    // Filter entities based on permissions
    function filterAllowedEntities<T extends { id: string }>(
      type: "group" | "source" | "client",
      entities: T[]
    ): T[] {
      const allowedKey =
        type === "group"
          ? "allowedGroups"
          : type === "source"
          ? "allowedSources"
          : "allowedClients";

      const allowed = permissions.value[allowedKey];
      // Empty array means all are allowed
      if (allowed.length === 0) return entities;
      return entities.filter((entity) => allowed.includes(entity.id));
    }

    // Lock the app (require passcode to unlock)
    function lock(): void {
      isLocked.value = true;
    }

    // Unlock the app
    function unlock(): void {
      isLocked.value = false;
    }

    // Reset all auth data (clear passcode and permissions)
    function resetAuth(): void {
      passcodeHash.value = null;
      isLocked.value = false;
      permissions.value = {
        canAdjustVolumes: true,
        canRenameGroups: true,
        canRenameClients: true,
        showGroupSettings: true,
        showClientSettings: true,
        showGroupFilter: true,
        showCreateGroup: true,
        showBrowserPlayer: true,
        allowedGroups: [],
        allowedSources: [],
        allowedClients: [],
      };
    }

    return {
      // State
      passcodeHash,
      isLocked,
      permissions,

      // Computed
      isAuthenticated,
      requiresSetup,

      // Methods
      setPasscode,
      verifyPasscode,
      updatePermissions,
      hasFeaturePermission,
      isEntityAllowed,
      filterAllowedEntities,
      lock,
      unlock,
      resetAuth,
    };
  },
  {
    persist: {
      key: "snapcast-auth",
      pick: ["passcodeHash", "isLocked", "permissions"],
    },
  }
);
