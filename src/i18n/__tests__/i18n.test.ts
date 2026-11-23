import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createApp, h, nextTick, type App } from "vue";
import { useSettingsStore } from "@/stores/settings";
import { t } from "@/i18n";
import es from "@/i18n/es";
import AppSettingsModal from "@/components/AppSettingsModal.vue";
import { afterEach } from "vitest";
let app: App | undefined;
beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});
afterEach(() => {
  app?.unmount();
  app = undefined;
  document.body.innerHTML = "";
});
describe("language selection", () => {
  it("changes messages immediately without translating user supplied names", () => {
    expect(t("Source")).toBe("Source");
    useSettingsStore().locale = "es";
    expect(t("Source")).toBe("Origen");
    expect(t("Source for {p0}", { p0: "Living Room" })).toBe(
      "Origen de Living Room",
    );
    expect(t('Mute zone "{name}"?', { name: "Kitchen" })).toBe(
      "¿Silenciar la zona «Kitchen»?",
    );
    expect(t("unrecognized-server-message")).toBe(
      "unrecognized-server-message",
    );
    useSettingsStore().locale = "en";
    expect(t("Source")).toBe("Source");
  });
  it("keeps interpolation tokens identical in English and Spanish", () => {
    for (const [english, spanish] of Object.entries(es)) {
      expect(spanish.match(/\{\w+\}/g)?.sort() ?? [], english).toEqual(
        english.match(/\{\w+\}/g)?.sort() ?? [],
      );
    }
  });
  it("updates open settings and its accessible title when the language changes", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const host = document.createElement("div");
    document.body.appendChild(host);
    app = createApp({ render: () => h(AppSettingsModal, { open: true }) });
    app.use(pinia);
    app.mount(host);
    const option = document.querySelector<HTMLInputElement>(
      '[name="app-language"][value="es"]',
    )!;
    option.checked = true;
    option.dispatchEvent(new Event("change", { bubbles: true }));
    await nextTick();
    expect(
      document.querySelector('[role="dialog"]')?.getAttribute("aria-label"),
    ).toBe("Configuración de la aplicación");
    expect(document.body.textContent).toContain("Idioma");
    expect(document.body.textContent).toContain("Configuración");
    expect(document.body.textContent).toContain("Modo oscuro");
    expect(
      document
        .querySelector('[name="interface"][value="classic"]')
        ?.closest("label")?.textContent,
    ).toContain("Clásica");
  });
});
