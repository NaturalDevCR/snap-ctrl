# Simple UI redesign — design spec

## Context

SnapCtrl currently ships two UIs, selectable via `settings.viewMode`:

- **Classic** — `ZoneGrid.vue`, `VolumeControl.vue`, `ZoneControlModal.vue`.
- **Simple** — `src/components/simple/*`.

A feature-parity audit (this session) confirmed Simple is already a strict
superset of Classic: every Classic capability (group mute, create group,
filter/show-empty/refresh, stream switching with status, master + per-client
volume, mute, client link/details/settings, group settings) exists in Simple,
plus extras Classic lacks (mute-all, searchable/keyboard-navigable source
picker, enter/exit animations). No functionality needs to be built to make
Simple a safe replacement — this project is a visual redesign plus dead-code
removal, not feature work.

Simple becomes the app's **only** UI. Everything the app shows — zone cards,
every modal Simple opens, and the app chrome (header, footer, connection/setup
screens) — gets one consistent, polished visual language.

## Goals

1. Professional, polished, cohesive look across every screen, light and dark,
   desktop and mobile — no half-restyled corners.
2. Visual language: Sonos-inspired. Richer/denser than bare-bones minimal,
   but calmer and more controlled than the current gradient/glow-heavy
   styling — "a well-designed mix," not a maximal redo.
3. Color is reserved for **state** (playing / muted / idle / error), not for
   decorating each source/zone with its own gradient tile.
4. Remove Classic UI and the view-mode toggle entirely once Simple covers
   everything (confirmed: it already does).
5. Fix concrete rough edges found during review (see "Known issues to fix").

## Non-goals

- No new features beyond what Classic already had (audit found zero gaps to
  fill).
- No change to the underlying Pinia stores' data shape or the Snapcast
  JSON-RPC client.
- Drag-reordering and latency calibration UI: absent in both Classic and
  Simple today, out of scope (not a parity requirement, not requested).

## Design tokens

New CSS custom properties added to `src/assets/main.css`, defined once for
light and once for dark (`:root` / `.dark`), replacing today's scattered
inline `slate-900/50`-style literals:

- **Surfaces**: `--surface-0` (page background), `--surface-1` (card),
  `--surface-2` (raised element inside a card — icon tiles, inputs, nested
  rows), `--surface-overlay` (modal backdrop blur layer).
- **Text**: `--text-primary`, `--text-secondary`, `--text-tertiary`.
- **Border**: `--border` (one consistent color, used everywhere instead of
  each component picking its own gray).
- **Radius scale**: `--radius-sm` (controls/chips), `--radius-md` (buttons,
  inputs), `--radius-lg` (cards, modals).
- **Status colors** (the only places color appears besides brand/interactive
  blue): `--status-playing` (green), `--status-muted` (red),
  `--status-idle` (amber/neutral), `--status-error` (red, distinct shade from
  muted where both can appear together).

Components consume these via Tailwind arbitrary-value utilities
(`bg-[var(--surface-1)]`) or small scoped CSS — not new hardcoded colors.

## Component changes

### Zone cards (`SimpleZoneCard.vue`, `SimpleZoneView.vue`)

- Icon tile becomes neutral (`--surface-2` background + mdi icon in
  `--text-secondary`/primary), no per-source gradient background.
- Color shows up only as the small playing/muted status dot and the
  mute-button's red state — matching the rest of the app's state-color use.
- Keep the per-source *icon* (TV, music note, airplay, radio, etc.) — that's
  functional identification, not decoration, and stays.
- Spacing/typography pass: consistent heading scale, consistent gap rhythm
  using a small spacing scale instead of ad hoc `gap-2`/`gap-2.5`/`gap-3`
  mixed arbitrarily.

### Toolbar (`SimpleZoneView.vue` header)

Today: 5 same-size circular icon buttons in a row (mute-all, create, show
empty, filter, refresh) — cramped on mobile, no labels, flat hierarchy.

New: primary actions stay as visible, labeled controls (Mute all, Add zone).
Secondary actions (filter groups, show empty groups, refresh) collapse into
one "⋯" overflow menu on narrow viewports; on desktop they can stay inline
but restyled with consistent sizing/spacing and the new tokens.

### Source button (`SimpleSourceButton.vue`)

Fix: currently renders the raw stream URI (e.g.
`stream://LivingRoomTV?codec=pcm`) when a friendlier label is available.
Resolve to the stream's `id` (its display name) consistently, same as the
source picker already does internally.

### `SimpleSourcePicker.vue`, `SimpleVolumeSlider.vue`, `SimpleZoneModal.vue`

Visual-only pass to the new tokens, spacing, and typography scale. No
behavior changes — existing search, keyboard nav, link/mute/volume controls,
client details/settings entry points all stay exactly as they work today.

### Shared modals opened from Simple

`GroupSettingsModal.vue`, `ClientDetailsModal.vue`, `ClientSettingsModal.vue`,
`CreateGroupModal.vue`, `GroupFilterModal.vue`, `AppSettingsModal.vue`,
`ServerInfo.vue`:

- Consistent header/body/footer structure and button styling using the new
  tokens.
- Consistent presentation pattern: centered dialog on desktop, full-height
  slide-up sheet on mobile (replacing whatever each modal currently does ad
  hoc).
- `AppSettingsModal.vue`: remove the Classic/Simple view-mode toggle section
  entirely (see "Removal").

### App chrome

`App.vue` header (logo, connection status pill, info/settings buttons,
browser player slot) and footer, plus `ConnectionPanel.vue`,
`SetupPasscode.vue`, `UnlockPrompt.vue`, `PermissionsConfig.vue`,
`Toast.vue`, `LoadingSpinner.vue`, `Tooltip.vue`: restyled to the same token
set so the whole app — including pre-connection and locked states — reads as
one product.

## Removal

Once the redesign is in place:

- Delete `src/components/ZoneGrid.vue`, `src/components/VolumeControl.vue`,
  `src/components/ZoneControlModal.vue`.
- Remove `settings.viewMode` (state, getter/setter, persistence key) from
  `src/stores/settings.ts`.
- Remove the view-mode toggle UI from `AppSettingsModal.vue`.
- Remove the `v-else` Classic branch and `zoneControlGroup`/`ZoneControlModal`
  wiring from `App.vue`; `SimpleZoneView` becomes the unconditional main view.
- Grep for any other `viewMode`/`'classic'`/`ZoneGrid`/`VolumeControl`/
  `ZoneControlModal` references (tests, types) and clean those up too.

## Mobile

- Minimum 44×44px touch targets on every interactive control.
- Zone cards: single column (already the case via `grid-cols-1` at the base
  breakpoint — keep, refine spacing).
- Modals: full-height bottom sheet with safe-area-aware padding
  (`env(safe-area-inset-bottom)`), not a centered dialog that can clip on
  small screens.
- Toolbar: overflow menu for secondary actions (see above) instead of 5
  cramped circles.
- Verify both color schemes and at least 375px and 428px widths during
  implementation (iPhone SE / iPhone Pro Max class sizes) plus a ~768px
  tablet check.

## Verification plan

- `pnpm run dev`, drive the app in the built-in browser against a mock
  Snapcast JSON-RPC server (already set up this session, covers: multiple
  zones, playing/idle/muted/offline-client/empty-zone/long-name/multi-speaker
  cases) to visually check every screen in both themes and at mobile +
  desktop widths.
- Confirm no Classic/`viewMode` references remain (`grep -rn` across `src`).
- `pnpm run build` to confirm no TypeScript/build breakage after removal.
