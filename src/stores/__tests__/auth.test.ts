import { beforeEach, describe, expect, it } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthStore } from "@/stores/auth";

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("auth store", () => {
  it("hashes passcode with PBKDF2 and verifies", async () => {
    const auth = useAuthStore();
    await auth.setPasscode("hunter2");
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
    expect(auth.passcodeHash).toBeNull();
    expect(auth.permissions.canAdjustVolumes).toBe(true);
    expect(auth.permissions.allowedGroups).toEqual([]);
  });
});
