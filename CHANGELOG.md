# Changelog

All notable changes to SnapCtrl are documented here. Each release on
[GitHub Releases](https://github.com/NaturalDevCR/snap-ctrl/releases) also
carries auto-generated notes with the full commit list.

> **Convention**: version bumps and changelog entries go in the same PR. When you tag, you also document.

### v0.4.0

- **Added**: Home Assistant Lovelace custom card (`<snap-ctrl-card>`) — a standalone dashboard card for volume/mute/group controls, installable independently of the HA addon (new `pnpm build:card` target, single self-contained `dist-card/snap-ctrl-card.js`). Connects directly to the Snapcast server over WebSocket, styled via Home Assistant's CSS custom properties, with a visual config editor (host/port/title/zone_filter). See the "Home Assistant Lovelace Card" section in the README for manual install steps.
- **Added**: `src/services/snapcastClient.ts` — the WebSocket connect/reconnect/JSON-RPC-request logic previously inline in the Pinia store is now a shared, framework-agnostic module used by both the app and the new card, restoring a 10-second connect timeout along the way.
- **Fixed**: `setHost()` now disconnects a live client when the host actually changes, instead of leaving it silently reconnecting to the old host while the store reports the new one.
- **Fixed**: The app's WebSocket connection now correctly times out after 10 seconds against an unreachable-but-routable host, instead of hanging until the OS-level TCP timeout.

### v0.3.5

- **Fixed**: Deleting a client or emptying a group now updates the UI immediately. Snapserver does not echo `Server.OnUpdate` back to the session that made the request, so the full server status returned by `Server.DeleteClient` / `Group.SetClients` is now applied locally (previously the response was discarded and the UI stayed stale until a manual reload).
- **Fixed**: Removing an orphaned client that was already deleted (by another session, or a pending `beforeunload` cleanup) no longer surfaces a spurious `Client not found` error toast — it is treated as already-deleted and the status is refreshed.
- **Fixed**: A `Client.OnConnect` notification for an unknown client now triggers a full status refresh so brand-new clients appear without reloading.
- **Fixed**: Deleting a group whose last offline client was just removed no longer calls `Group.SetClients` on a group the server already auto-removed.
- **Refactored**: `App.vue` decomposed from ~1,720 to ~600 lines. New standalone components: `ConnectionPanel` (host form + HA proxy info), `ZoneGrid` (zones toolbar, group cards, empty state, group filter), and `GroupSettingsModal`. New shared utils with tests: `stream-status.ts` and `group-volume.ts`. Dead code removed (unused drag handlers and helpers).
- **Refactored**: The Snapcast JSON-RPC protocol is now typed (`src/types/snapcast-rpc.ts`, discriminated union of all notifications); `handleMessage` is checked at compile time.
- **Changed**: New `logger` utility — debug/info logs are stripped from production builds; warnings and errors always pass through.
- **Changed**: JSON-RPC request timeout is configurable per call, default raised from 5s to 10s.
- **CI**: Workflows use pnpm 11 to match the new `pnpm-workspace.yaml` (`allowBuilds`); the HA addon version is kept in sync with the app version.

### v0.3.4

- **Fixed**: Robust browser player client cleanup lifecycle. An in-flight guard prevents concurrent cleanup attempts for the same client ID, cleanup retries wait for server status to load before executing, the client's existence on the server is checked before attempting deletion, and internal errors from `Server.DeleteClient` are retryable (up to 2 retries) instead of terminal.

### v0.3.3

- **Fixed**: Browser Player cleanup now survives closed tabs and interrupted control WebSockets. Pending cleanup is retried after reconnect, duplicate cleanup instances are avoided, and stale temporary browser-player groups can be cleared from the UI even when Snapcast rejects `Server.DeleteClient` with an internal error.

### v0.3.2

- **Changed**: Passcode authentication is now opt-in. Fresh installs open directly to the app, and users can enable `Require Passcode` from Application Settings when they want local access controls.
- **Improved**: The first connection screen now treats `localhost:1780` as a default guess, then asks for the Snapcast server IP address or hostname if that guess fails. The screen includes clearer guidance, host suggestions, and no longer shows the disconnected `No groups found` empty state.
- **Fixed**: Initial connection failures no longer trigger the reconnect loop. Automatic reconnect still works after a connection has succeeded at least once, but setup failures now wait for the user to correct the host.

### v0.3.1

- **Security**: `Content-Security-Policy` is now sent as a response header from the HA addon nginx (and should be configured the same way in any other reverse proxy). The CSP via `<meta>` is kept as a fallback for direct static hosting, but `frame-ancestors` has been removed from the meta tag because per the CSP spec it is silently ignored there. The bundled `addon/nginx.conf` now emits the full policy (including `frame-ancestors 'self'`), plus `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin`. The README's Security Notes section documents the deployment-time requirement.

### v0.3.0

- **Refactored**: `App.vue` decomposed from 2 521 to 1 460 lines (–42%). Five inline modals extracted into standalone components (`GroupFilterModal`, `ClientDetailsModal`, `ClientSettingsModal`, `AppSettingsModal`, `CreateGroupModal`). Drag-and-drop / custom ordering / visibility / browser-player filtering logic moved into a reusable `useZoneOrder` composable. The `formatLastSeen` helper moved to `src/utils/last-seen.ts` and is now covered by unit tests.
- **Performance**: WASM audio decoders (FLAC, Opus, Vorbis) are now loaded via dynamic `import()` so they ship as separate chunks. The initial JS bundle dropped from 787 kB to 81 kB; FLAC, Opus, and Vorbis are only fetched when a stream of that codec actually plays.
- **Addon**: `nginx.conf` now gzips `application/wasm`, `font/woff`, and `font/woff2` in addition to text/JSON/SVG.
- **CI**: Release workflow pins the lockfile (`--frozen-lockfile`) and the GitHub action versions are bumped. A new `ci.yml` runs `vue-tsc` and `vitest` on every PR.
- **Docs**: The changelog gap between v0.1.20 and v0.1.37 was reconstructed from `git log` and committed (this used to live in `build.yaml`, removed earlier).

### v0.2.0

- **Fixed**: `Server.OnUpdate` notifications are now handled. The app no longer relies on periodic polling to stay in sync with other control clients. With multiple devices connected, this eliminates the O(N²) fan-out traffic that `Server.GetStatus` triggered.
- **Fixed**: `sendRequest` could leak a `message` listener on a 5s timeout; it now cleans up correctly.
- **Fixed**: Refresh / delete / create-group responses are no longer silently dropped — they used to require `data.id === 1` which only the first request ever matched.
- **Changed**: Browser Player now uses a crypto-secure `clientId` and a sync (`sendBeacon` / sync XHR) cleanup on `beforeunload` so the temporary client is removed from Snapcast when the tab closes.
- **Changed**: Browser Player stream WebSocket now auto-reconnects with exponential backoff instead of requiring a manual play after a drop.
- **Security**: Strict CSP, `Permissions-Policy` and `Referrer-Policy` headers.
- **Security**: Passcode is now stored as a PBKDF2-SHA256 (100k iterations) hash. The insecure `djb2` fallback has been removed; the app refuses to set a passcode over an insecure origin.
- **Security**: A `Security Notes` section in the README documents that the passcode is a UX guard, not real authentication, and recommends running Snapcast behind a reverse proxy with auth for real access control.
- **Refactored**: `getStreamName` and `getGroupDisplayName` extracted to `src/utils/` (removed three duplicates).
- **Testing**: Added Vitest with 21 unit tests covering the snapcast store (no-polling, `Server.OnUpdate`, `Client.OnConnect` local patch, response id matching, listener cleanup on timeout), the auth store (PBKDF2 hashing) and the extracted utilities.
- **UX**: `prefers-reduced-motion` is respected globally; volume `+`/`-`/mute buttons are now 44×44 px touch targets; `aria-label` and `aria-pressed` on icon-only controls; mutations that fail now show a toast.
- **PWA**: Update prompt is an in-app toast (5s auto-reload) instead of a native `confirm()`.

### v0.1.21 .. v0.1.37

Backfill of the period that wasn't documented in this file (the v0.1.20 entry was the last one). Highlights reconstructed from `git log v0.1.20..v0.1.37`:

- **Added**: WebSocket heartbeat (later removed in v0.2.0 once push notifications were wired up properly).
- **Added**: Browser player stream pre-selection and mute-on-stream-sync.
- **Added**: Home Assistant addon support (`addon/`) with nginx proxy in front of the Snapcast control port to avoid WSS→WS mixed-content.
- **Added**: `repository.json` for the HA addon store to discover the build.
- **Added**: Nonlinear volume curve (with a fix to eliminate round-trip drift and honor the user-configurable `volumeStep` on `+`/`-` buttons).
- **Fixed**: HA addon builds: `__HA_SNAPCAST_HOST__` detection, build context, configurable UI port, websocket proxy, ensuring `/var/www/html` exists before copy.
- **Removed**: `build.yaml` (release workflow simplified to a single matrix-free `release.yml`).

### v0.1.20

- **Optimized**: **Connection Efficiency**. Eliminated unnecessary periodic polling. The app now relies entirely on Snapcast's real-time push notifications for state updates (volume, mute, streams, client connections). This significantly reduces server load and network traffic, especially in multi-client environments.
- **Removed**: Deprecated `refreshInterval` and `autoRefreshEnabled` settings as they are no longer needed.

### v0.1.19

- **Refactored**: **Per-Source Volume Logic**. The "Per-Source Volume" feature is now fully automatic. Volumes are auto-saved on change and strictly restored when switching streams. New streams "fork" the current volume levels. Removed the manual "Save\" button for a seamless experience.
- **Improved**: **Real-Time Synchronization**. Updates for client names, latency, mute status, and group streams are now handled with granular event listeners. This eliminates full state refreshes and prevents UI "ghosting" or lag.
- **Fixed**: **Group Sorting**. Fixed a bug where changing a group's source would reset or scramble the card order. Custom sort order is now preserved during source switches.
- **Improved**: **Mobile Experience**. Redesigned volume controls for mobile:
  - Maximize slider width for precise control.
  - Moved mute toggle to the client icon to save space.
  - Better touch targets for standard +/- buttons.
- **Improved**: **UI Polish**. Added valid tooltips to stream status indicators and other controls for better accessibility and clarity.

### v0.1.18

- **New**: Added "Last Seen" information to the Client Details modal, showing when a client was last connected to the server.
- **Improved**: Enhanced visual feedback in the Client Details view.

### v0.1.17

- **Enhanced Zone Control Modal**: Moved detailed group controls (volume, clients, source) into a dedicated modal to prevent accidental volume adjustments while scrolling or navigating using touch devices.
- **Improved Volume Controls**:
  - Larger, more accessible touch targets for volume sliders and buttons.
  - Added dedicated +/- buttons for fine-grained control.
  - Visual indicators for interactive elements (hover states, cursor pointers).
- **Redesigned Source Selector**: New custom dropdown UI for better visibility and ease of use, eliminating native select limitations.
- **Better Navigability**: Simplified the main grid layout by reducing clutter on group cards, making it easier to scan and manage multiple zones.
- **Client Management**: Restored quick access to Client Settings and Client Details directly from the control modal.

### v0.1.15

- **New**: **Per-Source Volume Memory**. Added optional "Per-Source Volume" setting for groups. When enabled, client volumes are remembered and restored for each specific stream.
- **New**: **Stream Status Indicators**. Added visual indicators and tooltips to show if a stream is Playing, Idle, or in Error state.
- **Improved**: **Performance**. Optimized stream switching logic to execute parallel requests, significantly reducing delay when changing sources.
- **Improved**: **Network Efficiency**. Logic added to prevent sending redundant volume update requests.

### v0.1.14

- **New**: **Granular Permissions System**. Added a robust permissions system allowing administrators to:
  - Lock specific features (Volume, Renaming).
  - Hide UI elements (Settings, Filters, Browser Player).
  - Restrict access to specific Groups, Clients, or Sources.
- **New**: **UI Improvements**. Refined visual elements and layout for a more polished user experience.
- **Improved**: **Browser Player Visibility**. Added the ability to toggle the Browser Player visibility via permissions.
- **Maintenance**: General code cleanup and performance optimizations for permission handling.

### v0.1.13

- **Fixed**: Resolved issue where the "Browser Player" (web client) would appear as a phantom card in the main Audio Groups list.
- **Fixed**: Fixed double deletion error when cleaning up the temporary browser player group.
- **Improved**: Web client group is now properly filtered and only appears in the dedicated player section.

