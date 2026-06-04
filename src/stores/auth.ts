import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface AuthPermissions {
  // Feature permissions
  canAdjustVolumes: boolean;
  canRenameGroups: boolean;
  canRenameClients: boolean;
  canSelectStream: boolean;
  canConfigurePSV: boolean;
  canAssignClients: boolean;
  canLinkClients: boolean;

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
    const authEnabled = ref(false);
    const passcodeHash = ref<string | null>(null);
    const isLocked = ref(false);
    const permissions = ref<AuthPermissions>({
      canAdjustVolumes: true,
      canRenameGroups: true,
      canRenameClients: true,
      canSelectStream: true,
      canConfigurePSV: true,
      canAssignClients: true,
      canLinkClients: true,
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
    const isAuthEnabled = computed(
      () => authEnabled.value || passcodeHash.value !== null
    );
    const isAuthenticated = computed(
      () => !isAuthEnabled.value || passcodeHash.value !== null
    );
    const requiresSetup = computed(
      () => authEnabled.value && passcodeHash.value === null
    );

    async function hashPasscode(passcode: string): Promise<string> {
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error(
          "Web Crypto API unavailable. The passcode feature requires a secure context (HTTPS or localhost)."
        );
      }
      const encoder = new TextEncoder();
      const data = encoder.encode(passcode);
      const salt = encoder.encode("snapctrl.passcode.v1");
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        data,
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      );
      const bits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt,
          iterations: 100000,
          hash: "SHA-256",
        },
        keyMaterial,
        256
      );
      const hashArray = Array.from(new Uint8Array(bits));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    // Set new passcode (for initial setup or change)
    async function setPasscode(passcode: string): Promise<void> {
      const hash = await hashPasscode(passcode);
      authEnabled.value = true;
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
        | "canAdjustVolumes"
        | "canRenameGroups"
        | "canRenameClients"
        | "canSelectStream"
        | "canConfigurePSV"
        | "canAssignClients"
        | "canLinkClients"
      >
    ): boolean {
      if (!isAuthEnabled.value) return true;
      return permissions.value[feature];
    }

    // Check if an entity (group/source/client) is allowed
    function isEntityAllowed(
      type: "group" | "source" | "client",
      id: string
    ): boolean {
      if (!isAuthEnabled.value) return true;

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
      if (!isAuthEnabled.value) return entities;

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
      if (!isAuthEnabled.value || !passcodeHash.value) return;
      isLocked.value = true;
    }

    // Unlock the app
    function unlock(): void {
      isLocked.value = false;
    }

    function resetPermissions(): void {
      permissions.value = {
        canAdjustVolumes: true,
        canRenameGroups: true,
        canRenameClients: true,
        canSelectStream: true,
        canConfigurePSV: true,
        canAssignClients: true,
        canLinkClients: true,
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

    function enableAuthentication(): void {
      authEnabled.value = true;
      isLocked.value = false;
    }

    function disableAuthentication(): void {
      authEnabled.value = false;
      passcodeHash.value = null;
      isLocked.value = false;
      resetPermissions();
    }

    // Reset all auth data (clear passcode and permissions)
    function resetAuth(): void {
      disableAuthentication();
    }

    return {
      // State
      authEnabled,
      passcodeHash,
      isLocked,
      permissions,

      // Computed
      isAuthEnabled,
      isAuthenticated,
      requiresSetup,

      // Methods
      enableAuthentication,
      disableAuthentication,
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
      pick: ["authEnabled", "passcodeHash", "isLocked", "permissions"],
    },
  }
);
