import { beforeEach, describe, expect, it } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthStore } from "@/stores/auth";

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("auth store", () => {
  it("starts with authentication disabled and full access", () => {
    const auth = useAuthStore();
    const clients = [{ id: "client-a" }, { id: "client-b" }];

    auth.updatePermissions({
      ...auth.permissions,
      canAdjustVolumes: false,
      allowedClients: ["client-a"],
    });

    expect(auth.isAuthEnabled).toBe(false);
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.requiresSetup).toBe(false);
    expect(auth.hasFeaturePermission("canAdjustVolumes")).toBe(true);
    expect(auth.isEntityAllowed("client", "client-b")).toBe(true);
    expect(auth.filterAllowedEntities("client", clients)).toEqual(clients);
  });

  it("requires setup after enabling authentication without a passcode", () => {
    const auth = useAuthStore();

    auth.enableAuthentication();

    expect(auth.isAuthEnabled).toBe(true);
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.requiresSetup).toBe(true);
  });

  it("hashes passcode with PBKDF2 and verifies", async () => {
    const auth = useAuthStore();
    await auth.setPasscode("hunter2");
    expect(auth.isAuthEnabled).toBe(true);
    expect(auth.requiresSetup).toBe(false);
    expect(auth.passcodeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(await auth.verifyPasscode("hunter2")).toBe(true);
    expect(await auth.verifyPasscode("wrong")).toBe(false);
  });

  it("uses a salt (different inputs produce different hashes)", async () => {
    const auth = useAuthStore();
    await auth.setPasscode("a");
    const first = auth.passcodeHash;
    auth.resetAuth();
    await auth.setPasscode("b");
    const second = auth.passcodeHash;
    expect(first).not.toBe(second);
  });

  it("requires authentication to pass", async () => {
    const auth = useAuthStore();
    expect(await auth.verifyPasscode("anything")).toBe(false);
  });

  it("resetAuth clears passcode and restores default permissions", async () => {
    const auth = useAuthStore();
    await auth.setPasscode("secret");
    auth.updatePermissions({
      ...auth.permissions,
      canAdjustVolumes: false,
      allowedGroups: ["g1"],
    });
    expect(auth.isAuthenticated).toBe(true);
    auth.resetAuth();
    expect(auth.isAuthEnabled).toBe(false);
    expect(auth.passcodeHash).toBeNull();
    expect(auth.permissions.canAdjustVolumes).toBe(true);
    expect(auth.permissions.allowedGroups).toEqual([]);
  });

  it("disabling authentication clears passcode, unlocks, and restores access", async () => {
    const auth = useAuthStore();
    await auth.setPasscode("secret");
    auth.updatePermissions({
      ...auth.permissions,
      canAdjustVolumes: false,
      allowedClients: ["client-a"],
    });

    auth.lock();
    expect(auth.isLocked).toBe(true);

    auth.disableAuthentication();

    expect(auth.isAuthEnabled).toBe(false);
    expect(auth.passcodeHash).toBeNull();
    expect(auth.isLocked).toBe(false);
    expect(auth.hasFeaturePermission("canAdjustVolumes")).toBe(true);
    expect(auth.isEntityAllowed("client", "client-b")).toBe(true);
  });
});
