# Snap Ctrl — Home Assistant Lovelace Custom Card

**Date:** 2026-08-21
**Status:** Approved for planning

## Problem

`snap-ctrl` today ships only as a standalone Vue app (run directly, or packaged as an HA addon that shows a full-page/iframe UI). Users who want quick volume control for Snapcast zones inside their existing HA dashboard have to leave it or embed the whole app in an iframe card, which doesn't match the dashboard's layout or theme.

## Goal

Ship a native HA Lovelace custom card (`<snap-ctrl-card>`) that shows Snapcast zones/groups with volume sliders, mute toggles, and group join/unjoin — styled to match the active HA theme, embeddable like any other card, distributed independently of the addon.

## Non-goals (MVP)

- Client settings (latency, naming), passcode/unlock flow, app-wide settings modal — these stay app-only.
- Reusing HA's `hass` object for authentication or entity state — the card talks directly to the Snapcast server via WebSocket JSON-RPC, same protocol the app already uses. `hass` is read only for theme CSS variables.
- HACS listing/submission — documented as a fast-follow, not blocking. MVP ships as a manually-added Lovelace resource (built JS file placed in HA's `www/` and registered as a dashboard resource).
- Multi-server aggregation in one card instance (one card = one Snapcast server, matching one `setConfig`).

## Architecture

New, independent frontend package built from this repo, output as a single standalone ES module (`dist-card/snap-ctrl-card.js`) via a new `vite.config.card.ts` (library mode), following the existing precedent of `vite.config.ha.ts` as a separate build target from the main app. Vue runtime is bundled into the output (HA does not provide Vue globally).

The module's only side effect on load is `customElements.define("snap-ctrl-card", SnapCtrlCard)`. It implements the standard Lovelace custom card contract:

- `setConfig(config)` — validates and stores `{ host, port, passcode?, title?, zone_filter?: string[] }`.
- `set hass(hass)` — stored only to read `hass.themes`/CSS custom properties already applied to `document.documentElement`; no entity/auth usage.
- `getCardSize()` — returns an estimate based on zone count for grid layout purposes.
- `static getConfigElement()` — returns the visual editor element (see Config Editor).
- `static getStubConfig()` — returns a minimal default config for "add card" flow.

Each `<snap-ctrl-card>` instance is fully self-contained: its own Snapcast connection, own reactive state, own Vue app instance mounted into a shadow root. Multiple instances (e.g. one per floor, filtered by `zone_filter`) can coexist on the same dashboard without sharing state.

## Targeted improvement: extract shared WebSocket client

The existing connection/reconnect/JSON-RPC-request logic lives inline inside the Pinia store at [src/stores/snapcast.ts](../../../src/stores/snapcast.ts) (`connect()`, `scheduleReconnect()`, request/response id matching, `DEFAULT_REQUEST_TIMEOUT_MS`). Duplicating this for the card would mean two implementations of reconnect backoff and timeout handling to maintain.

This is extracted into a new framework-agnostic module, **`src/services/snapcastClient.ts`**:

```ts
export interface SnapcastClientOptions {
  url: string;
  requestTimeoutMs?: number;
  maxReconnectAttempts?: number;
}

export function createSnapcastClient(options: SnapcastClientOptions): {
  connect(): void;
  disconnect(): void;
  request<T>(method: string, params?: unknown): Promise<T>;
  onEvent(handler: (msg: SnapcastInboundMessage) => void): () => void; // returns unsubscribe
  onStatusChange(handler: (status: "connecting" | "connected" | "disconnected" | "error") => void): () => void;
};
```

Plain TypeScript, no Vue/Pinia dependency, so it works identically inside the app's store and inside the card's Vue setup(). `src/stores/snapcast.ts` is refactored to call this instead of managing `WebSocket` directly — its public store interface (state/actions used by `App.vue` and children) does not change, so existing components and tests are unaffected aside from the store's internal implementation. Existing store tests plus a new unit test suite for `snapcastClient.ts` (connect/reconnect/timeout/message-matching) cover regression risk.

## Components

```
src-card/
  main.ts                 — imports CardRoot, defines the custom element, side-effect registration
  SnapCtrlCard.ts          — HTMLElement subclass: shadow root, mounts/unmounts the Vue app, forwards setConfig/hass
  CardEditor.ts            — HTMLElement subclass for the visual config editor (getConfigElement)
  components/
    CardRoot.vue           — root: owns snapcastClient instance, connection status, provides state via provide/inject
    CardZoneGrid.vue        — renders groups, each with its client rows
    CardVolumeRow.vue       — one client: name, volume slider, mute toggle
    CardGroupControls.vue   — join/unjoin a client to/from a group (simple <select> per client, MVP-level UI)
    CardConnectionError.vue — inline error/retry state when disconnected
```

Reused from the existing app: `src/types/snapcast-rpc.ts` (message types) and the new `src/services/snapcastClient.ts`. All Vue components under `src-card/components/` are new — not copies of `ZoneGrid.vue`/`VolumeControl.vue`, which stay app-only (they're tied to Tailwind, Pinia, and app-only features out of scope here).

## Config editor

`CardEditor.ts` renders a small form using HA's built-in form elements (`ha-textfield`, `ha-switch`, `ha-formfield` — already loaded globally by the HA frontend, referenced by tag name, no import needed) for: `host` (required), `port` (required, default `1780`), `passcode` (optional, plain `ha-textfield` — not treated as a special secret; consistent with how other HA cards handle API keys in their config), `title` (optional card header text), `zone_filter` (optional, comma-separated group/client name allowlist). Changes dispatch a `config-changed` custom event with the updated config object, per the standard Lovelace editor contract.

## Data flow / lifecycle

- `connectedCallback()` (custom element attached to DOM) → mount Vue app → `CardRoot.vue`'s `setup()` calls `createSnapcastClient({ url })` and `.connect()`.
- On connect: request `Server.GetStatus`, populate groups/clients; subscribe via `onEvent()` to `Group.OnMute`, `Client.OnVolumeChanged`, `Client.OnConnect`/`OnDisconnect`, `Server.OnUpdate` and patch local state incrementally (same event set the app already handles in `snapcast.ts`).
- Volume slider drag: local optimistic update immediately (responsive UI), debounced (~80ms) `Client.SetVolume` request; server's `OnVolumeChanged` echo reconciles state (no-op if it matches the optimistic value).
- Mute toggle: immediate request, no debounce.
- `disconnectedCallback()` (card removed from DOM, e.g. dashboard edit/navigation) → `client.disconnect()`, unmount Vue app to free listeners.
- Connection lost mid-session → existing reconnect-with-backoff behavior from `snapcastClient`, `CardConnectionError.vue` shown in place of the grid while `status !== "connected"`, with a manual "Retry now" button that calls `connect()` immediately (bypassing backoff wait).

## Theming

The card's root element renders inside HA's own `<ha-card>` custom element (globally available in the HA frontend, used by every stock card) to inherit standard card chrome — background, border-radius, box-shadow, optional header/title — for free. Internal styles use HA's CSS custom properties: `--primary-text-color`, `--secondary-text-color`, `--primary-color` (slider active track/thumb), `--divider-color` (row separators), `--disabled-text-color` (muted state). No Tailwind in this bundle — plain scoped `<style>` blocks per component, since the theme surface here is small (a handful of colors) and pulling Tailwind would bloat the standalone bundle for no real benefit.

## Error handling

- Initial connect failure (bad host/port, unreachable) → `CardConnectionError.vue` with the last error message and a retry button, never an unhandled exception/blank card.
- `SetVolume`/mute request timeout or rejection → row-level inline warning icon with tooltip (no toast system available outside `hass` context), optimistic value reverted to last known-good server value.
- Invalid `setConfig` (missing host) → card renders a minimal HA-style config-error block (`hui-error-card`-like plain message), same convention other custom cards use for bad config.

## Build & distribution

New `vite.config.card.ts`, library mode, single entry `src-card/main.ts`, output `dist-card/snap-ctrl-card.js` (ESM, self-contained, Vue bundled in). New `package.json` script: `"build:card": "vue-tsc --build && vite build --config vite.config.card.ts"`.

MVP distribution: documented manual install (download the built file into HA's `config/www/`, add as a Lovelace resource via `ha_config_set_dashboard_resource`-equivalent UI flow, add `type: custom:snap-ctrl-card` to a dashboard). HACS packaging (`hacs.json` frontend category, GitHub release asset) is a documented follow-up, not part of this spec — the existing repo's `repository.json`/`addon/` structure is add-on-category HACS metadata, and mixing card-category HACS metadata into the same repo needs its own decision (possibly a release-asset-only approach rather than a second repo) that's out of scope here.

## Testing

- Unit tests (Vitest, matching existing `src/**/__tests__` convention): `snapcastClient.ts` (connect/reconnect backoff/timeout/message id matching/event dispatch — the highest-risk extracted logic), volume debounce behavior, config validation in `CardEditor`.
- Refactored `src/stores/snapcast.ts` keeps its existing test coverage under `src/stores/__tests__` passing unchanged (public interface unchanged) as the regression check for the extraction.
- No automated end-to-end HA dashboard test for MVP; manual verification by adding the built resource to a real HA dev instance dashboard.

## Open follow-ups (explicitly out of scope now)

- HACS frontend-category packaging/submission.
- Client settings (latency/rename) and passcode/unlock inside the card.
- Reordering zones within the card (app has `useZoneOrder.ts`; card MVP uses server-provided order only).
