# SnapCtrl

A modern, responsive, and feature-rich web interface for [Snapcast](https://github.com/badaix/snapcast), built with Vue 3 and Tailwind CSS.

<img width="3598" height="1000" alt="image" src="https://github.com/user-attachments/assets/7e61aa70-4937-4e1e-b9c3-7ef8db096934" />
<img width="3588" height="1000" alt="image" src="https://github.com/user-attachments/assets/cf8799a9-bd98-40e6-a932-7c15ed2fe6ba" />

## Features

- **Modern & Responsive UI**: A fully responsive interface featuring a sleek dark mode, designed for seamless use on desktop and mobile devices.
- **Real-time Control**: Experience instant updates for volume adjustments, mute toggles, and stream assignments via WebSockets.
- **Comprehensive Group Management**:
  - Easily create, rename, and delete client groups.
  - **Smart Cleanup**: Automatically remove offline or orphaned clients to maintain a tidy setup.
  - **Prevent Orphans**: Enhanced logic ensures deleted groups don't leave behind orphaned clients.
- **Advanced Client Controls**:
  - Visual status indicators (online/offline).
  - Adjust latency calibration and volume levels.
  - Rename clients for better organization.
- **Granular Permissions & Security**:
  - **Lock Mode**: Secure the interface with a passcode to prevent unauthorized changes.
  - **Feature Control**: Enable or disable specific features like volume adjustment, renaming, or group creation.
  - **UI Visibility**: Toggle the visibility of UI elements such as settings, filters, and the browser player.
  - **Access Restrictions**: Restrict access to specific groups, sources, or clients.
- **Smart Volume Memory**:
  - **Per-Source Volume**: Optionally remember volume levels for each source **per group**. Enable this in Group Settings to have clients in that group restore their volume when switching sources.
  - **Multi-Device Sync**: Volume memory is synchronized across all devices. If you change the volume for a source on your phone, your laptop will learn and remember that volume too.
- **Integrated Browser Player**: Listen to your Snapcast streams directly within the browser, utilizing WASM-based decoders (FLAC, Vorbis, PCM) for high-quality playback.
- **Stream Management**: Intuitive interface for assigning streams to groups.
- **PWA Support**: Install as a Progressive Web App (PWA) on your device for a native-like experience.
- **Development Ready**: Includes optional HTTPS support for local development environments.

## Changelog

> **Convention**: version bumps and changelog entries go in the same PR. When you tag, you also document.

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

## Getting Started

### Prerequisites

- A running [Snapcast server](https://github.com/badaix/snapcast).
- Node.js (v20+) and pnpm (recommended for development).

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/NaturalDevCR/snap-ctrl.git
    cd snap-ctrl
    ```

2.  Install dependencies:

    ```bash
    pnpm install
    ```

3.  Run the development server:

    ```bash
    # HTTP (Default)
    pnpm run dev

    # HTTPS (Optional, for PWA testing)
    pnpm run dev:https
    ```

### Building for Production

To create a static production build compatible with any web server (including Snapcast's built-in server):

```bash
pnpm run build
```

The output will be generated in the `dist` folder. Copy the contents of this folder to your web server's root or Snapcast's `doc_root`.

## Usage with Snapcast

Snapcast server can serve this web interface directly.

1.  Build the project: `pnpm run build`
2.  Locate your Snapcast server's `doc_root` (typically `/usr/share/snapserver/snapweb` or defined in `/etc/snapserver.conf`).
3.  Backup the existing `index.html` and assets.
4.  Copy the contents of the `dist` folder to the `doc_root`.
5.  Access the interface via `http://<snapserver-ip>:1780`.

## GitHub Release Workflow

This project includes a GitHub Actions workflow that automatically builds and releases the application.

To create a new release:

1.  Push your changes to the `main` branch.
2.  Create and push a tag starting with `v` (e.g., `v1.0.0`):
    ```bash
    git tag v1.0.0
    git push origin v1.0.0
    ```
3.  GitHub Actions will automatically build the project and create a release with a `dist.zip` file attached.

## Security Notes

The optional passcode is a **client-side UX guard**, not a real authentication layer:

- It is stored as a salted PBKDF2-SHA256 hash in `localStorage`. Anyone with access to the browser can clear `localStorage` and bypass it.
- The granular permissions (`canAdjustVolumes`, `canRenameGroups`, etc.) are enforced only inside the UI. A user that reaches the Snapcast JSON-RPC endpoint directly (default `ws://<host>:1780/jsonrpc`) can issue any `Client.SetVolume` / `Group.SetStream` etc. without going through the SnapCtrl checks.

For real access control, place Snapcast behind a reverse proxy that enforces authentication (e.g. nginx with `auth_basic` or Caddy with `basicauth`), or run snap-ctrl in a network you trust. SnapCtrl will use the same credentials transparently.

`window.crypto.subtle` is required (HTTPS or `localhost`). The app will refuse to set a passcode over an insecure origin.

### Content Security Policy

A `Content-Security-Policy` is set via a `<meta>` tag in `index.html` as a defense-in-depth fallback. **One directive cannot be set this way: `frame-ancestors`**. Per the CSP spec, `frame-ancestors` is silently ignored when delivered via `<meta>` and must come from a response header. If you serve SnapCtrl behind your own web server or reverse proxy, make sure the response includes:

```
Content-Security-Policy: ...; frame-ancestors 'self'
```

The bundled HA addon (`addon/nginx.conf`) already does this. For the standalone static build (`dist/`), configure your reverse proxy accordingly — see the `addon/nginx.conf` block for the exact policy.

## Support This Project

If you find this project useful and want to support its development, consider buying me a coffee! ☕

[![Donate via PayPal](https://www.paypal.com/en_US/i/btn/btn_donateCC_LG.gif)](https://paypal.me/NaturalCloud)

Your donations help keep this project maintained and improved. Thank you for your support! ❤️

## Acknowledgments

This project was inspired by and uses concepts from [Snapweb](https://github.com/badaix/snapweb), the official web interface for Snapcast. SnapCtrl is a complete rewrite with a custom design and implementation. We are grateful to the Snapcast team for their excellent work on the reference implementation and for maintaining the amazing Snapcast ecosystem.

## Notice

This project was developed with the assistance of advanced AI coding agents (Gemini 1.5 Pro and Sonnet 3.5), blending automated code generation with human oversight and customization.

## License

MIT
