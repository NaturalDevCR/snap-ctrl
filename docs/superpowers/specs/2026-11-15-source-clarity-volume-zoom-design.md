# Source clarity, change confirmation, volume access, zoom lock — design spec

## Context

User feedback (screenshot of a zone card, e.g. "Aracari"): across multiple
zone cards in the Simple UI grid, it's hard to tell at a glance which source
is actually playing in which zone — the source row looks the same regardless
of play state, and rows across different cards repeat the same shape/icon
treatment. Separately: changing a zone's source has no confirmation, the
volume-summary row on the zone card gives no hint that it opens per-speaker
control, pinch/double-tap zoom breaks the app's touch navigation, and the
volume +/- buttons step by 5 instead of 1.

Four independent, low-risk fixes, scoped to `src/components/simple/*`,
`src/stores/settings.ts`, and `index.html`.

## Goals

1. A zone card's source row visually reflects that zone's own play state
   (playing / idle / unavailable), so scanning a grid of cards shows which
   zones are active and on what, without reading text.
2. Changing a zone's source requires an explicit confirm step that names the
   zone, the current source, and the new source.
3. The volume-summary row on a zone card reads as a clear navigation
   affordance to "Volume & speakers," not just an icon + progress bar.
4. Pinch-zoom and double-tap-zoom are disabled app-wide.
5. The volume −/+ nudge buttons move 1% per tap by default.

## Non-goals

- No change to `SimpleSourcePicker`'s per-item state dots (playing/idle/
  unavailable per stream) — those reflect the underlying stream, not the
  zone, and are out of scope here.
- No new settings UI for volume step (still store-only, just a different
  default).
- No change to `SimpleZoneModal`'s own "Zone volume" section, which is
  already labeled.

## Design

### A. Source row reflects zone state

`SimpleSourceButton.vue` currently renders its icon tile with static
`border`/`surface-1` colors regardless of play state. It gets the same
accent treatment the zone-card header tile already uses
(`zone.playAccent` / `zone.tileStyle` from `useZoneControls`): tinted
background + icon color while playing, neutral while idle, attention
(red) while unavailable. No new state is introduced — this is purely
wiring an existing computed value into a second place it already belongs.

### B. Confirm before switching source

`SimpleSourceButton.vue` currently passes `@select="zone.selectSource"`
straight through from `SimpleSourcePicker`. It changes to:

1. Picker emits `select(id)` as before.
2. `SimpleSourceButton` stores `pendingSourceId`, closes the picker, and
   opens a new confirm dialog (built on `AppDialog.vue`, consistent with
   the rest of the app rather than `window.confirm`).
3. Dialog text: "Change `{zoneName}`'s source to `{newSourceName}`? This
   replaces what's currently playing in this zone." Footer: `Cancel` /
   `Change source`.
4. Confirm calls `zone.selectSource(pendingSourceId)` and closes. Cancel
   just discards `pendingSourceId` — the picker is not reopened.

No dialog appears if the picker is closed without picking a different
source (existing guard: `selectSource` is a no-op for the current id, and
the picker only lists choosing a different source as a selectable action).

### C. Volume row gets a label

`SimpleZoneCard.vue`'s volume-summary button (the one that opens
`SimpleZoneModal`) currently shows: mute icon, [tune icon + progress bar +
percent], chevron — no text. It gains a short visible label ("Volume &
speakers") in the same slot where `SimpleSourceButton` shows "Change",
ahead of the percentage, so the row matches that same
icon+label+chevron = "tap to go deeper" pattern the source row already
establishes.

### D. Disable zoom

- `index.html`: viewport meta gets `maximum-scale=1, user-scalable=no`
  appended.
- `src/assets/main.css`: `touch-action: manipulation` on `html, body`,
  since some mobile browsers still allow double-tap zoom with
  `user-scalable=no` set.

Trade-off accepted per explicit request: this removes pinch-zoom for
everyone, including anyone who relies on it for low vision. Acceptable
here because the app is a touch-first zone control surface where
accidental zoom currently breaks navigation.

### E. Volume step defaults to 1

`src/stores/settings.ts`: `volumeStep` ref's initial value changes from
`5` to `1`. The existing clamp (`Math.max(1, Math.min(20, step))`) and
persistence/migration path are untouched — this only changes what a fresh
install (or a store with no persisted `volumeStep`) starts at.

## Testing

- `SimpleSourceButton`: new/updated test asserting (1) selecting a
  different source opens the confirm dialog instead of calling
  `selectSource` immediately, (2) confirming calls `selectSource` with the
  picked id, (3) canceling calls it zero times and leaves the picker
  closed.
- `SimpleZoneCard` / `SimpleZoneView` snapshot-ish tests: adjust any
  assertions tied to the old icon-only volume row markup to expect the new
  label text.
- `settings.ts` existing tests: confirm nothing hardcodes the old default
  of `5` in a way that would now fail; `upgrade-path.test.ts` already sets
  volumeStep explicitly so it's unaffected.
- Manual: verify in the dev server that pinch-zoom and double-tap-zoom are
  gone on a touch-emulated viewport, and that the +/- buttons move 1% per
  tap on both the zone and per-speaker sliders.
