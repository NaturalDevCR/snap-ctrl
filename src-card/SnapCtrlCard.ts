import { createApp, type App } from "vue";
import CardRoot, { type CardConfig } from "./components/CardRoot.vue";

export class SnapCtrlCard extends HTMLElement {
  private app: App | null = null;
  private mountPoint: HTMLDivElement | null = null;
  private rootRef: InstanceType<typeof CardRoot> | null = null;
  private pendingConfig: CardConfig | null = null;
  private pendingHass: unknown = null;

  connectedCallback() {
    if (this.app) return;
    const shadow = this.attachShadow({ mode: "open" });
    this.mountPoint = document.createElement("div");
    shadow.appendChild(this.mountPoint);

    this.app = createApp(CardRoot);
    const instance = this.app.mount(this.mountPoint) as unknown as InstanceType<
      typeof CardRoot
    >;
    this.rootRef = instance;

    if (this.pendingConfig) instance.setConfig(this.pendingConfig);
    if (this.pendingHass) instance.setHass(this.pendingHass);
  }

  disconnectedCallback() {
    this.app?.unmount();
    this.app = null;
    this.rootRef = null;
  }

  setConfig(config: Partial<CardConfig>) {
    if (!config.host) {
      throw new Error("snap-ctrl-card: 'host' is required in the card config");
    }
    const normalized: CardConfig = {
      host: config.host,
      port: config.port ?? 1780,
      title: config.title,
      zone_filter:
        config.zone_filter && config.zone_filter.length > 0
          ? config.zone_filter
          : undefined,
    };
    if (this.rootRef) {
      this.rootRef.setConfig(normalized);
    } else {
      this.pendingConfig = normalized;
    }
  }

  set hass(hass: unknown) {
    if (this.rootRef) {
      this.rootRef.setHass(hass);
    } else {
      this.pendingHass = hass;
    }
  }

  getCardSize() {
    return 3;
  }

  static getStubConfig() {
    return { host: "localhost", port: 1780 };
  }

  static getConfigElement() {
    return document.createElement("snap-ctrl-card-editor");
  }
}
