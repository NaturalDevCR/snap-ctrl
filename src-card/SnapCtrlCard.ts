import { createApp, type App } from "vue";
import CardRoot, { type CardConfig } from "./components/CardRoot.vue";

// Set by vite.config.card.ts's inline-css plugin: the concatenated scoped
// CSS from every src-card/components/*.vue SFC, as a single string. May be
// absent (e.g. in a test environment, or a build with no component styles).
declare global {
  interface Window {
    __SNAP_CTRL_CARD_CSS__?: string;
  }
}

export class SnapCtrlCard extends HTMLElement {
  private app: App | null = null;
  private mountPoint: HTMLDivElement | null = null;
  private styleTag: HTMLStyleElement | null = null;
  private rootRef: InstanceType<typeof CardRoot> | null = null;
  private pendingConfig: CardConfig | null = null;
  private pendingHass: unknown = null;

  connectedCallback() {
    if (this.app) return;
    // The host may be disconnected and reconnected without being destroyed
    // (e.g. HA's Lovelace masonry view re-laying-out columns on resize).
    // attachShadow() throws if a shadow root already exists on this host,
    // so reuse it — and the style tag and mount point inside it — instead
    // of recreating any of them on every reconnect.
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    // Standard Shadow DOM encapsulation means an outer-document <style>
    // (e.g. one appended to document.head) never reaches shadow-tree
    // content, and every component here uses <style scoped>. So the bundled
    // CSS text must be injected as a <style> child of this element's own
    // shadow root, not of document.head.
    if (!this.styleTag && window.__SNAP_CTRL_CARD_CSS__) {
      this.styleTag = document.createElement("style");
      this.styleTag.textContent = window.__SNAP_CTRL_CARD_CSS__;
      shadow.appendChild(this.styleTag);
    }
    if (!this.mountPoint) {
      this.mountPoint = document.createElement("div");
      shadow.appendChild(this.mountPoint);
    }

    this.app = createApp(CardRoot);
    const instance = this.app.mount(this.mountPoint) as unknown as InstanceType<
      typeof CardRoot
    >;
    this.rootRef = instance;

    if (this.pendingConfig) instance.setConfig(this.pendingConfig);
    if (this.pendingHass) instance.setHass(this.pendingHass);
  }

  disconnectedCallback() {
    // Tear down the live WebSocket connection before unmounting — without
    // this, the socket and its reconnect machinery keep running even
    // though the card is detached (e.g. HA's Lovelace masonry view
    // re-laying-out columns on resize triggers detach/reattach, not
    // destroy), leaking a connection on every relayout.
    this.rootRef?.teardown();
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
    // Always keep pendingConfig current, whether or not the element is
    // currently mounted — connectedCallback() re-applies it on reattach,
    // so a stale value here would resurrect an old config after a
    // detach/reattach cycle (e.g. a Lovelace masonry relayout).
    this.pendingConfig = normalized;
    if (this.rootRef) {
      this.rootRef.setConfig(normalized);
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
