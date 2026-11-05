# Simple UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign SnapCtrl's Simple UI (and every modal/chrome screen it uses) to a polished, Sonos-inspired visual language with color reserved for state, then delete the Classic UI entirely.

**Architecture:** Introduce a small set of CSS custom-property design tokens in `src/assets/main.css`; recolor the zone-accent mechanism in `useZoneControls.ts` from per-source hue to per-state color; extract one shared `AppDialog.vue` wrapper (desktop centered dialog / mobile bottom sheet) and migrate every "classic-style" modal onto it; apply a fixed token substitution across every remaining screen; then delete `ZoneGrid.vue`, `VolumeControl.vue`, `ZoneControlModal.vue`, the `viewMode` setting, and the `canChangeView` permission.

**Tech Stack:** Vue 3 `<script setup>`, Pinia (setup stores), Tailwind CSS v4 (arbitrary-value `var()` utilities), Vitest.

## Global Constraints

- No behavior change anywhere in this plan except: the Classic UI / `viewMode` / `canChangeView` removal (Tasks 10, 18, 19, 20, 21), the mobile overflow menu (Task 14), and the Classic parity fixes (Task 22). Every other task is visual-only. Props, emits, store actions, and RPC calls stay exactly as they are.
- Execution order: Tasks 1-15, then Task 22, then Tasks 16-21.
- Color is reserved for state: playing (green), muted/unavailable (red). Idle is neutral. Action labels never use a status color: they use brand blue (`text-blue-600 dark:text-blue-400`) so they stay readable on white.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Spec requirement "consistent radius scale" is satisfied via a **documented Tailwind-class convention**, not new CSS variables: cards/modals/sheets use `rounded-3xl` (mobile sheet top corners) / `rounded-t-3xl sm:rounded-3xl`, buttons/chips/inputs use `rounded-xl` or `rounded-full` (already the app's dominant pattern) — Tailwind's own scale already gives this consistency; adding a parallel `--radius-*` token system on top of it would be redundant. This is the one deliberate simplification versus the literal token list in the spec's "Design tokens" section; everything else in that section is implemented as specified.
- Spec requirement "minimum 44×44px touch targets on every interactive control": every icon-only circular button this plan writes out in full (AppDialog's close button, every footer icon button, the zone-card and toolbar icon buttons) is sized `w-11 h-11` (44px). When a task says "apply the substitution table" to markup this plan does *not* reproduce in full, also bump any `w-9 h-9` or `w-10 h-10` icon-only button, and any `h-9` pill button, to 44px (`w-11 h-11` / `h-11`) while in that file. Padded text buttons (e.g. `px-4 py-2` Cancel/Create/Apply buttons) are left at their existing padding — they're an established app-wide pattern, not a new regression, and Task 21's QA pass is the place to flag any that read as cramped on a real device rather than this plan re-deriving exact padding-to-pixel math for each one.
- Fixed class → token substitution table (every migration task in this plan applies this table verbatim; it is given once here, not repeated per task):
  | Old Tailwind classes | New |
  |---|---|
  | `bg-white dark:bg-slate-900` | `bg-[var(--surface-1)]` |
  | `bg-gray-50 dark:bg-slate-800` (standalone, e.g. input backgrounds) | `bg-[var(--surface-2)]` |
  | `bg-gray-50 dark:bg-slate-800/50` (footer bars) | `bg-[var(--surface-2)]` |
  | `bg-gray-100 dark:bg-slate-700` | `bg-[var(--surface-2)]` |
  | `bg-gray-50 dark:bg-slate-950` / `bg-gray-50 dark:bg-slate-950` (page root) | `bg-[var(--surface-0)]` |
  | `border-gray-200 dark:border-gray-800` / `border-gray-200 dark:border-gray-700` / `border-gray-100 dark:border-gray-800` / `border-gray-100 dark:border-gray-700` | `border-[var(--border)]` |
  | `text-gray-900 dark:text-white` | `text-[var(--text-primary)]` |
  | `text-gray-700 dark:text-gray-300` | `text-[var(--text-secondary)]` |
  | `text-gray-500 dark:text-gray-400` | `text-[var(--text-tertiary)]` |
  | `bg-black/50 backdrop-blur-sm` / `bg-black/60 backdrop-blur-sm` (modal backdrops) | `bg-[var(--scrim)] backdrop-blur-sm` |

  Brand blue (`blue-600`/`blue-700`/`blue-50`/`blue-900` for buttons, links, selected states) and the green/amber/red/gray **status** dots and badges (already state-driven, e.g. `bg-green-500` for "playing", `bg-red-500` for "muted"/"unavailable") are **left as literal Tailwind utilities** — they already read correctly as semantic color and don't need indirection through a CSS variable. Only the *structural* grays/whites/slates above move to tokens.
- Run `pnpm test` (Vitest) and `pnpm run build` (type-check + Vite build) after every task; both must pass before moving to the next task.

---

## Task 1: Design tokens

**Files:**
- Modify: `src/assets/main.css`

**Interfaces:**
- Produces: CSS custom properties `--surface-0`, `--surface-1`, `--surface-2`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--border`, `--scrim` (light in `:root`, dark in `.dark`), and theme-invariant `--status-playing`/`-deep`/`-soft`, `--status-idle`/`-deep`/`-soft`, `--status-attention`/`-deep`/`-soft`. Every later task's `bg-[var(--x)]`/`text-[var(--x)]` classes consume these names exactly.

- [ ] **Step 1: Add the tokens**

Edit `src/assets/main.css` — insert right after the `@custom-variant dark` line (currently line 3):

```css
:root {
  --surface-0: #f8fafc;
  --surface-1: #ffffff;
  --surface-2: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #334155;
  --text-tertiary: #64748b;
  --border: #e2e8f0;
  --scrim: rgba(2, 6, 23, 0.6);
}

.dark {
  --surface-0: #020617;
  --surface-1: #0f172a;
  --surface-2: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-tertiary: #94a3b8;
  --border: #1e293b;
  --scrim: rgba(2, 6, 23, 0.6);
}

:root,
.dark {
  --status-playing: #16a34a;
  --status-playing-deep: #15803d;
  --status-playing-soft: rgba(22, 163, 74, 0.16);
  --status-idle: #64748b;
  --status-idle-deep: #475569;
  --status-idle-soft: rgba(100, 116, 139, 0.14);
  --status-attention: #ef4444;
  --status-attention-deep: #dc2626;
  --status-attention-soft: rgba(239, 68, 68, 0.16);
}
```

- [ ] **Step 2: Verify the build still passes**

Run: `pnpm run build`
Expected: succeeds (no components consume the new tokens yet — this step only proves the CSS is syntactically valid and Tailwind's build doesn't choke on the new `:root`/`.dark` blocks).

- [ ] **Step 3: Commit**

```bash
git add src/assets/main.css
git commit -m "feat: add design tokens for Simple UI redesign"
```

---

## Task 2: Zone accent — state-driven color

**Files:**
- Modify: `src/composables/useZoneControls.ts`
- Modify: `src/utils/source-style.ts`
- Modify: `src/utils/__tests__/source-style.test.ts`
- Test: `src/composables/__tests__/use-zone-controls.test.ts` (new)

**Interfaces:**
- Consumes: `--status-playing`/`-deep`/`-soft`, `--status-idle`/`-deep`/`-soft`, `--status-attention`/`-deep`/`-soft` from Task 1.
- Produces: `useZoneControls(group).accent` (string, one of `"var(--status-playing)"` / `"var(--status-idle)"` / `"var(--status-attention)"`) and `.accentStyle` (`{ "--accent": string; "--accent-2": string; "--accent-soft": string }`) — same shape as before, new values. `sources` list items no longer carry an `accent` field. `getSourceAccent`/`getSourceHue`/`SourceAccent` are removed from `source-style.ts` (consumed by no one else — confirmed by this session's repo-wide grep).

- [ ] **Step 1: Write the failing test**

Create `src/composables/__tests__/use-zone-controls.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useZoneControls } from "@/composables/useZoneControls";
import { useSnapcastStore } from "@/stores/snapcast";
import type { Group, Stream } from "@/stores/snapcast";

function makeStream(id: string, status: string): Stream {
  return { id, uri: `pipe:///tmp/${id}?name=${id}`, status };
}

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "g1",
    name: "Living Room",
    stream_id: "s1",
    muted: false,
    clients: [],
    ...overrides,
  };
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("useZoneControls accent", () => {
  it("uses the playing status color while a stream plays", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams.push(makeStream("s1", "playing"));
    const zone = useZoneControls(() => makeGroup());

    expect(zone.accent.value).toBe("var(--status-playing)");
    expect(zone.accentStyle.value).toEqual({
      "--accent": "var(--status-playing)",
      "--accent-2": "var(--status-playing-deep)",
      "--accent-soft": "var(--status-playing-soft)",
    });
  });

  it("uses the idle status color while a stream is idle", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams.push(makeStream("s1", "idle"));
    const zone = useZoneControls(() => makeGroup());

    expect(zone.accent.value).toBe("var(--status-idle)");
  });

  it("uses the attention status color when the group is muted, even while playing", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams.push(makeStream("s1", "playing"));
    const zone = useZoneControls(() => makeGroup({ muted: true }));

    expect(zone.accent.value).toBe("var(--status-attention)");
  });

  it("uses the attention status color when the stream is unavailable", () => {
    const zone = useZoneControls(() => makeGroup({ stream_id: "missing" }));

    expect(zone.accent.value).toBe("var(--status-attention)");
  });

  it("no longer attaches a per-source accent to picker sources", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams.push(makeStream("s1", "playing"));
    const zone = useZoneControls(() => makeGroup());

    expect(zone.sources.value[0]).not.toHaveProperty("accent");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- use-zone-controls`
Expected: FAIL — `zone.accent.value` is currently a hue-derived `hsl(...)` string, not `"var(--status-playing)"`, and `sources[0]` currently has an `accent` property.

- [ ] **Step 3: Implement the state-driven accent**

Edit `src/composables/useZoneControls.ts`. Replace the import line:

```ts
import { getSourceAccent, getSourceHue, getSourceIcon } from "@/utils/source-style";
```

with:

```ts
import { getSourceIcon } from "@/utils/source-style";
```

Replace this block (currently lines 54-72):

```ts
  // Each source has a stable accent color; the zone takes on the color of
  // what it's playing (red while muted).
  const palette = computed(() => getSourceAccent(getSourceHue(currentStream.value)));
  const accent = computed(() => (group().muted ? "#ef4444" : palette.value.main));
  const accentStyle = computed(() => ({
    "--accent": palette.value.main,
    "--accent-2": palette.value.deep,
    "--accent-soft": palette.value.soft,
  }));

  const sources = computed(() =>
    snapcast.filteredStreams.map((s) => ({
      id: s.id,
      name: getStreamName(s),
      icon: getSourceIcon(s),
      accent: getSourceAccent(getSourceHue(s)),
      state: playStateOf(s.id),
    }))
  );
```

with:

```ts
  // The zone's accent reflects its own state, not its source's identity:
  // red while muted or unavailable, green while playing, neutral while idle.
  const STATUS_ACCENT = {
    playing: {
      main: "var(--status-playing)",
      deep: "var(--status-playing-deep)",
      soft: "var(--status-playing-soft)",
    },
    idle: {
      main: "var(--status-idle)",
      deep: "var(--status-idle-deep)",
      soft: "var(--status-idle-soft)",
    },
    attention: {
      main: "var(--status-attention)",
      deep: "var(--status-attention-deep)",
      soft: "var(--status-attention-soft)",
    },
  } as const;

  const statusAccent = computed(() => {
    if (group().muted) return STATUS_ACCENT.attention;
    if (playState.value === "playing") return STATUS_ACCENT.playing;
    if (playState.value === "idle") return STATUS_ACCENT.idle;
    return STATUS_ACCENT.attention; // unavailable
  });
  const accent = computed(() => statusAccent.value.main);
  const accentStyle = computed(() => ({
    "--accent": statusAccent.value.main,
    "--accent-2": statusAccent.value.deep,
    "--accent-soft": statusAccent.value.soft,
  }));

  const sources = computed(() =>
    snapcast.filteredStreams.map((s) => ({
      id: s.id,
      name: getStreamName(s),
      icon: getSourceIcon(s),
      state: playStateOf(s.id),
    }))
  );
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- use-zone-controls`
Expected: PASS (all 5 cases).

- [ ] **Step 5: Delete the now-unused hue/accent functions and their tests**

Edit `src/utils/source-style.ts` — delete the `getSourceHue` function, the `SourceAccent` interface, and the `getSourceAccent` function (everything from the `getSourceHue` doc comment through the end of `getSourceAccent`), leaving only `getStreamScheme` and `getSourceIcon`.

Edit `src/utils/__tests__/source-style.test.ts` — delete the `import` names `getSourceAccent` and `getSourceHue` (keep `getSourceIcon`, `getStreamScheme`), and delete the `describe("getSourceHue", ...)` and `describe("getSourceAccent", ...)` blocks in full.

- [ ] **Step 6: Run the full test suite**

Run: `pnpm test`
Expected: PASS, no failures, no references to the deleted functions anywhere.

- [ ] **Step 7: Commit**

```bash
git add src/composables/useZoneControls.ts src/utils/source-style.ts src/utils/__tests__/source-style.test.ts src/composables/__tests__/use-zone-controls.test.ts
git commit -m "feat: zone accent reflects play state instead of source identity"
```

---

## Task 3: Source picker — neutral tiles, no per-source chip color

**Files:**
- Modify: `src/components/simple/SimpleSourcePicker.vue`

**Interfaces:**
- Consumes: `PickerSource` from `useZoneControls().sources` (Task 2 already dropped its `accent` field).
- Produces: no change to emits/props — visual only.

- [ ] **Step 1: Drop the `accent` field and its import from `PickerSource`**

In `src/components/simple/SimpleSourcePicker.vue`, replace:

```ts
import type { SourceAccent } from "@/utils/source-style";

export interface PickerSource {
  id: string;
  name: string;
  icon: string;
  accent: SourceAccent;
  state: "playing" | "idle" | "unavailable";
}
```

with:

```ts
export interface PickerSource {
  id: string;
  name: string;
  icon: string;
  state: "playing" | "idle" | "unavailable";
}
```

- [ ] **Step 2: Replace the chip-colored tile with a neutral tile + brand-blue selected state**

Replace the source row button's `:style` binding and the tile `<span>`:

```vue
              :style="{
                '--chip': source.accent.main,
                '--chip-2': source.accent.deep,
                '--i': i,
              }"
              @click="choose(source.id)"
            >
              <span
                class="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all"
                :class="source.id === currentId ? 'tile-on text-white' : 'tile-off'"
                aria-hidden="true"
              >
```

with:

```vue
              :style="{ '--i': i }"
              @click="choose(source.id)"
            >
              <span
                class="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all"
                :class="
                  source.id === currentId
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'
                "
                aria-hidden="true"
              >
```

- [ ] **Step 3: Drop the now-unused chip-based scoped CSS and recolor the check mark**

Replace the `<style scoped>` block:

```vue
<style scoped>
.tile-on {
  background-image: linear-gradient(135deg, var(--chip), var(--chip-2));
  box-shadow: 0 8px 18px -8px var(--chip);
}
.tile-off {
  color: var(--chip);
  background: color-mix(in srgb, var(--chip) 14%, transparent);
}
.check {
  color: var(--chip);
}

</style>
```

with: (delete the file's `<style scoped>` block entirely — nothing in this template needs scoped CSS anymore)

And change the check-mark span from:

```vue
            <span
              v-if="source.id === currentId"
              class="mdi mdi-check-circle text-2xl shrink-0 check"
              aria-hidden="true"
            ></span>
```

to:

```vue
            <span
              v-if="source.id === currentId"
              class="mdi mdi-check-circle text-2xl shrink-0 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            ></span>
```

- [ ] **Step 4: Verify in the browser**

Run: `pnpm run dev`, open the app (via the mock server set up this session, or a real Snapcast server), open a zone's source picker. Confirm: every source tile is neutral gray with its icon; the currently-selected source's tile is solid blue; the per-source green/amber/red state dot underneath each name is unchanged.

- [ ] **Step 5: Run build and commit**

Run: `pnpm run build` — expect success.

```bash
git add src/components/simple/SimpleSourcePicker.vue
git commit -m "feat: neutral source picker tiles, selection shown in brand blue"
```

---

## Task 4: Shared `AppDialog` component

**Files:**
- Create: `src/components/AppDialog.vue`
- Modify: `src/components/simple/simple-view.css` (move sheet/cascade CSS out)
- Modify: `src/assets/main.css` (move sheet/cascade CSS in)

**Interfaces:**
- Produces: `AppDialog` component —
  - Props: `open: boolean` (required), `title: string` (required), `titleIcon?: string` (mdi class, optional), `size?: "sm" | "md" | "lg"` (optional, default `"md"`, maps to `sm:max-w-sm` / `sm:max-w-md` / `sm:max-w-lg`).
  - Emits: `close: []`.
  - Slots: default (body, scrollable, padded), `footer` (optional — footer bar only renders when this slot has content; consumer supplies its own inner `justify-end`/`justify-between` wrapper div).
  - Owns Escape-to-close (`useEscapeToClose`) and body-scroll-lock (`useBodyScrollLock`) itself — **every task that migrates a modal onto `AppDialog` removes that modal's own `useEscapeToClose` call and import**, since `AppDialog` now provides it (both push the same close callback onto `useEscapeToClose`'s shared stack; keeping both would double-register).
  - Desktop: centered dialog, fade+scale transition. Mobile (`<640px`): bottom sheet, slide-up transition, drag-handle affordance, `env(safe-area-inset-bottom)` padding. Backdrop click and the header's close button both emit `close`.
- Consumes: `--surface-1`, `--surface-2`, `--border`, `--text-primary`, `--text-tertiary`, `--scrim` from Task 1; the `.sv-sheet-*`/`.sv-cascade` transition CSS this task relocates into `main.css`.

- [ ] **Step 1: Move the sheet/cascade CSS from `simple-view.css` to `main.css`**

These classes (`.sv-sheet-backdrop`/`.sv-sheet-panel`/`.sv-sheet-enter-*`/`.sv-sheet-leave-*` transition rules and `.sv-cascade`/`@keyframes sv-cascade`) are no longer Simple-view-specific once `AppDialog` (used app-wide) needs them too. Cut this whole block from `src/components/simple/simple-view.css` (currently the "Bottom sheet / dialog" and "Rows cascade in..." sections, lines 103-144):

```css
/* ---- Bottom sheet / dialog --------------------------------------------- */
.sv-sheet-enter-active .sv-sheet-backdrop,
.sv-sheet-leave-active .sv-sheet-backdrop {
  transition: opacity 240ms ease;
}
.sv-sheet-enter-from .sv-sheet-backdrop,
.sv-sheet-leave-to .sv-sheet-backdrop {
  opacity: 0;
}
.sv-sheet-enter-active .sv-sheet-panel {
  transition:
    transform 380ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 240ms ease;
}
.sv-sheet-leave-active .sv-sheet-panel {
  transition:
    transform 240ms ease-in,
    opacity 200ms ease-in;
}
.sv-sheet-enter-from .sv-sheet-panel,
.sv-sheet-leave-to .sv-sheet-panel {
  transform: translateY(100%);
}
@media (min-width: 640px) {
  .sv-sheet-enter-from .sv-sheet-panel,
  .sv-sheet-leave-to .sv-sheet-panel {
    transform: translateY(12px) scale(0.96);
    opacity: 0;
  }
}

/* Rows cascade in as a sheet opens (set --i per row). */
.sv-cascade {
  animation: sv-cascade 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(min(var(--i, 0), 10) * 30ms + 60ms);
}
@keyframes sv-cascade {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
```

and paste it, unchanged, at the end of `src/assets/main.css`. Update the doc comment at the top of `simple-view.css` (currently lines 1-11) to drop the reference to the moved classes:

```css
/*
 * Shared styles for the Simple view's zone tiles and ambient effects (zone
 * card, Volume & Speakers sheet, source picker). Global rather than scoped
 * so the card and its sheets — which live in different components, some
 * teleported to <body> — share one definition. Everything is prefixed
 * `sv-` to stay out of the way of the rest of the app.
 *
 * Accent-driven rules read --accent / --accent-2 / --accent-soft, set per
 * zone from its current state (useZoneControls().accentStyle).
 *
 * The generic bottom-sheet/dialog transition (.sv-sheet-*, .sv-cascade)
 * lives in assets/main.css instead — AppDialog.vue uses it too, and it has
 * nothing to do with sources or zones.
 */
```

- [ ] **Step 2: Create `AppDialog.vue`**

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useEscapeToClose } from "@/composables/useEscapeToClose";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    titleIcon?: string;
    size?: "sm" | "md" | "lg";
  }>(),
  { size: "md" }
);

const emit = defineEmits<{ (e: "close"): void }>();

useEscapeToClose(
  () => props.open,
  () => emit("close")
);
useBodyScrollLock(() => props.open);

const maxWidthClass = computed(
  () =>
    ({ sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-lg" })[props.size]
);
</script>

<template>
  <Teleport to="body">
    <Transition name="sv-sheet" :duration="{ enter: 380, leave: 240 }">
      <div
        v-if="open"
        class="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4"
      >
        <div
          class="sv-sheet-backdrop absolute inset-0 bg-[var(--scrim)] backdrop-blur-sm"
          aria-hidden="true"
          @click="emit('close')"
        ></div>

        <div
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          class="sv-sheet-panel relative w-full max-h-[85vh] sm:max-h-[80vh] flex flex-col bg-[var(--surface-1)] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden"
          :class="maxWidthClass"
          style="padding-bottom: env(safe-area-inset-bottom)"
        >
          <div class="sm:hidden pt-2.5 flex justify-center shrink-0" aria-hidden="true">
            <div class="w-10 h-1.5 rounded-full bg-[var(--surface-2)]"></div>
          </div>

          <div class="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
            <h3 class="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span v-if="titleIcon" class="mdi" :class="titleIcon" aria-hidden="true"></span>
              {{ title }}
            </h3>
            <button
              type="button"
              aria-label="Close"
              class="w-11 h-11 -mr-2.5 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
              @click="emit('close')"
            >
              <span class="mdi mdi-close text-xl"></span>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto custom-scrollbar p-6">
            <slot />
          </div>

          <div
            v-if="$slots.footer"
            class="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-2)] flex items-center shrink-0"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
```

- [ ] **Step 3: Verify build**

Run: `pnpm run build`
Expected: succeeds. `AppDialog` isn't used by anything yet, so this only proves it compiles.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppDialog.vue src/components/simple/simple-view.css src/assets/main.css
git commit -m "feat: add shared AppDialog (desktop dialog / mobile sheet) component"
```

---

## Task 5: Migrate `GroupSettingsModal.vue` to `AppDialog`

**Files:**
- Modify: `src/components/GroupSettingsModal.vue`

**Interfaces:**
- Consumes: `AppDialog` (Task 4) — `size="lg"`, `title="Group Settings"`.
- Produces: no prop/emit change (`open`, `group` props; `close` emit) — purely internal restructure.

- [ ] **Step 1: Replace the outer chrome with `AppDialog`**

Remove the `useEscapeToClose` import and call (now owned by `AppDialog`):

```ts
import { useEscapeToClose } from "@/composables/useEscapeToClose";
```

```ts
useEscapeToClose(
  () => props.open,
  () => emit("close")
);
```

Add the import:

```ts
import AppDialog from "@/components/AppDialog.vue";
```

Replace the entire `<template>` wrapper. The old template is:

```vue
<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="props.open"
      class="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div
        class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800 transform transition-all"
        @click.stop
      >
        <div
          class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between"
        >
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">
            Group Settings
          </h3>
          <button
            @click="emit('close')"
            aria-label="Close"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            <span class="mdi mdi-close text-xl"></span>
          </button>
        </div>

        <div class="p-6 space-y-6">
          <!-- ...body (Group Name through the linked-clients info message)... -->
        </div>

        <div
          class="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between"
        >
          <!-- ...footer (delete / cancel / save)... -->
        </div>
      </div>
    </div>
  </Transition>
</template>
```

Replace it with:

```vue
<template>
  <AppDialog :open="props.open" title="Group Settings" size="lg" @close="emit('close')">
    <div class="space-y-6">
      <!-- ...body (Group Name through the linked-clients info message) — UNCHANGED from the current file, just re-indented one level in, and apply the token substitution table (Global Constraints) to every bg-gray-50/bg-slate-800/border-gray-*/text-gray-900/text-gray-700/text-gray-500 class inside it... -->
    </div>

    <template #footer>
      <div class="w-full flex items-center justify-between">
        <Tooltip text="Delete group">
          <button
            class="w-11 h-11 flex items-center justify-center rounded-full text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            @click="deleteGroup"
          >
            <span class="mdi mdi-delete text-xl"></span>
          </button>
        </Tooltip>
        <div class="flex gap-2">
          <Tooltip text="Cancel">
            <button
              class="w-11 h-11 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
              @click="emit('close')"
            >
              <span class="mdi mdi-close text-xl"></span>
            </button>
          </Tooltip>
          <Tooltip text="Save Changes">
            <button
              class="w-11 h-11 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              @click="apply"
            >
              <span class="mdi mdi-check text-xl"></span>
            </button>
          </Tooltip>
        </div>
      </div>
    </template>
  </AppDialog>
</template>
```

Apply the Global Constraints substitution table to the body content that moved inside `<AppDialog>`'s default slot: every `bg-gray-50 dark:bg-slate-800` (the Group Name input, the Stream `<select>`, the Per-Source Volume label row, the Volume Control Mode row, the exponent row) becomes `bg-[var(--surface-2)]`; every `border-gray-200 dark:border-gray-700` becomes `border-[var(--border)]`; every `text-gray-900 dark:text-white` becomes `text-[var(--text-primary)]`; every `text-gray-700 dark:text-gray-300` becomes `text-[var(--text-secondary)]`; every `text-gray-500 dark:text-gray-400` becomes `text-[var(--text-tertiary)]`. Table-header row (`border-gray-200 dark:border-gray-700` underline) and the per-client list rows (`border-gray-100 dark:border-gray-800`, `hover:bg-gray-50 dark:hover:bg-slate-800/50`) follow the same table (hover state becomes `hover:bg-[var(--surface-2)]`). Leave the green/red connected-status dot, the orange "Clean Offline" button, and the blue "linked clients" info box exactly as they are (semantic color, not structural gray).

- [ ] **Step 2: Verify in the browser**

`pnpm run dev`, open a zone's group settings from the Simple UI (gear icon on a zone card). Confirm: dialog still opens/closes, Escape still closes it, all fields (name, stream select, per-source toggle, volume mode, exponent slider, client list, linked checkboxes, clean-offline, delete) behave exactly as before; on a narrow viewport it now appears as a bottom sheet with a drag handle instead of a centered box clipped at the edges.

- [ ] **Step 3: Verify build and commit**

Run: `pnpm run build` — expect success.

```bash
git add src/components/GroupSettingsModal.vue
git commit -m "refactor: migrate GroupSettingsModal to AppDialog and design tokens"
```

---

## Task 6: Migrate `ClientSettingsModal.vue` to `AppDialog`

**Files:**
- Modify: `src/components/ClientSettingsModal.vue`

**Interfaces:**
- Consumes: `AppDialog` (Task 4) — `size="md"`, `title="Client Settings"`.
- Produces: no prop/emit change (`open`, `client` props; `close`/`deleted`/`saved` emits).

- [ ] **Step 1: Replace the outer chrome with `AppDialog`**, same mechanical change as Task 5 Step 1: remove `useEscapeToClose` import/call, add `import AppDialog from "@/components/AppDialog.vue";`, wrap the Name/Latency fields (currently the `<div class="p-6 space-y-6">...</div>` block) in `<AppDialog :open="props.open" title="Client Settings" @close="emit('close')">...</AppDialog>`'s default slot, apply the substitution table to its `bg-gray-50 dark:bg-slate-800`/`border-gray-200 dark:border-gray-700`/`text-gray-700 dark:text-gray-300`/`text-gray-900 dark:text-white` classes.

- [ ] **Step 2: Move the "Delete Offline Client" warning block and the Cancel/Save buttons into the `footer` slot**

The current file has two trailing chrome blocks: the conditional red "Delete Offline Client" bar and the Cancel/Save footer. Both move into `<template #footer>`, stacked:

```vue
    <template #footer>
      <div class="w-full space-y-3">
        <div v-if="clientId && !isClientConnected(clientId)">
          <button
            @click="deleteClient"
            class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span class="mdi mdi-delete"></span>
            Delete Offline Client
          </button>
          <p class="mt-2 text-xs text-red-600 dark:text-red-400 text-center">
            This action cannot be undone
          </p>
        </div>
        <div class="flex justify-end gap-2">
          <Tooltip text="Cancel">
            <button
              class="w-11 h-11 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
              @click="emit('close')"
            >
              <span class="mdi mdi-close text-xl"></span>
            </button>
          </Tooltip>
          <Tooltip text="Save Changes">
            <button
              class="w-11 h-11 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              @click="save"
            >
              <span class="mdi mdi-check text-xl"></span>
            </button>
          </Tooltip>
        </div>
      </div>
    </template>
```

(The delete bar's own red styling is semantic — a destructive warning — and is left as literal Tailwind classes, not tokenized.)

- [ ] **Step 3: Verify in the browser**

Open a client's settings from a zone's Volume & Speakers sheet. Confirm name/latency editing, save, and (for an offline client) delete all still work, Escape still closes it, mobile shows a bottom sheet.

- [ ] **Step 4: Verify build and commit**

Run: `pnpm run build` — expect success.

```bash
git add src/components/ClientSettingsModal.vue
git commit -m "refactor: migrate ClientSettingsModal to AppDialog and design tokens"
```

---

## Task 7: Migrate `ClientDetailsModal.vue` to `AppDialog`

**Files:**
- Modify: `src/components/ClientDetailsModal.vue`

**Interfaces:**
- Consumes: `AppDialog` (Task 4) — `size="md"`, `title="Client Details"`, `title-icon="mdi-information-outline"`.
- Produces: no prop/emit change (`open`, `client` props; `close` emit).

- [ ] **Step 1: Replace the outer chrome with `AppDialog`**

Remove the `useEscapeToClose` import and call. Add `import AppDialog from "@/components/AppDialog.vue";`. Wrap the identity row + 2-column info grid (current `<div class="p-6"><div class="space-y-4">...</div></div>`) as the default slot, Close as the footer slot:

```vue
<template>
  <AppDialog
    :open="props.open && !!props.client"
    title="Client Details"
    title-icon="mdi-information-outline"
    @close="emit('close')"
  >
    <div v-if="props.client" class="space-y-4">
      <!-- ...identity row + 2-column info grid, unchanged except the token substitution below... -->
    </div>

    <template #footer>
      <div class="w-full flex justify-end">
        <button
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          @click="emit('close')"
        >
          Close
        </button>
      </div>
    </template>
  </AppDialog>
</template>
```

Apply the substitution table throughout: the identity row's `text-gray-900 dark:text-white` / `text-gray-500 dark:text-gray-400` / `border-gray-100 dark:border-gray-800`, and every one of the eight info-grid `<label>`s' `text-gray-500 dark:text-gray-400` (→ `text-[var(--text-tertiary)]`) and their value `<p>`s' `text-gray-900 dark:text-white` (→ `text-[var(--text-primary)]`). Leave the blue avatar circle (`bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400`) and the green/red connected-status dot as literal semantic color.

- [ ] **Step 2: Verify in the browser**

Open client details from a zone's Volume & Speakers sheet. Confirm all eight fields (status, last seen, IP, MAC, host name, OS/arch, version, latency, instance) still render, Close still works, Escape still works, mobile shows a bottom sheet.

- [ ] **Step 3: Verify build and commit**

Run: `pnpm run build` — expect success.

```bash
git add src/components/ClientDetailsModal.vue
git commit -m "refactor: migrate ClientDetailsModal to AppDialog and design tokens"
```

---

## Task 8: Migrate `CreateGroupModal.vue` to `AppDialog`

**Files:**
- Modify: `src/components/CreateGroupModal.vue`

**Interfaces:**
- Consumes: `AppDialog` (Task 4) — `size="lg"`, `title="Create New Group"`.
- Produces: no prop/emit change (`open` prop; `close`/`created` emits).

- [ ] **Step 1: Replace the outer chrome with `AppDialog`**

Remove the `useEscapeToClose` import and call. Add `import AppDialog from "@/components/AppDialog.vue";`. Wrap the Stream `<select>` + client checklist (current `<div class="p-6 space-y-6">...</div>`) as `AppDialog`'s default slot, and Cancel/Create as its footer slot:

```vue
<template>
  <AppDialog :open="props.open" title="Create New Group" size="lg" @close="emit('close')">
    <div class="space-y-6">
      <!-- ...Stream select + Select Clients checklist, unchanged except the token substitution below... -->
    </div>

    <template #footer>
      <div class="w-full flex justify-end gap-3">
        <button
          class="px-4 py-2 text-[var(--text-secondary)] font-medium hover:bg-[var(--surface-2)] rounded-lg transition-colors"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          @click="createGroup"
          :disabled="clientIds.length === 0"
        >
          Create Group
        </button>
      </div>
    </template>
  </AppDialog>
</template>
```

Apply the substitution table: the stream select's `bg-gray-50 dark:bg-slate-800`/`border-gray-200 dark:border-gray-700`/`text-gray-900 dark:text-white`, the "Select Clients" label's `text-gray-700 dark:text-gray-300`, each client row's `border-gray-200 dark:border-gray-700` and name `text-gray-700 dark:text-gray-200` (→ `text-[var(--text-secondary)]`). Leave the connected/offline status dot, the amber "From: &lt;group&gt;" badge, and the blue "no clients yet" notice as literal semantic color — these are all already state/meaning-driven, not structural gray.

- [ ] **Step 2: Verify in the browser**

Open "Create Group" from the Simple UI's toolbar. Confirm stream selection, client checkboxes (including the "From: X" badge when a client is already grouped), and Create/Cancel all still work; mobile shows a bottom sheet.

- [ ] **Step 3: Verify build and commit**

Run: `pnpm run build` — expect success.

```bash
git add src/components/CreateGroupModal.vue
git commit -m "refactor: migrate CreateGroupModal to AppDialog and design tokens"
```

---

## Task 9: Migrate `GroupFilterModal.vue` to `AppDialog`, neutral group-avatar color

**Files:**
- Modify: `src/components/GroupFilterModal.vue`

**Interfaces:**
- Consumes: `AppDialog` (Task 4) — `size="md"`, `title="Manage Groups"`.
- Produces: no prop/emit change (`open` prop; `close` emit).

- [ ] **Step 1: Replace the outer chrome with `AppDialog`**

Remove the hand-rolled backdrop/dialog div (this file doesn't currently use the `useEscapeToClose`-in-script + `<Transition>` pattern the other modals use — it already calls `useEscapeToClose` in script, so just remove that import/call same as the other tasks). Replace:

```vue
<template>
  <div
    v-if="props.open"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
    @click.self="onBackdropClick"
  >
    <div
      class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden"
    >
      <div
        class="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between"
      >
        <h3 class="font-bold text-lg text-gray-900 dark:text-white">
          Manage Groups
        </h3>
        <button
          @click="emit('close')"
          aria-label="Close"
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <span class="mdi mdi-close text-xl"></span>
        </button>
      </div>
      <div class="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
        <!-- ...group list... -->
      </div>
      <div
        class="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 flex justify-end"
      >
        <button
          @click="emit('close')"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
```

with:

```vue
<template>
  <AppDialog :open="props.open" title="Manage Groups" @close="emit('close')">
    <div class="-m-2">
      <!-- ...group list, unchanged except the token substitution below... -->
    </div>

    <template #footer>
      <div class="w-full flex justify-end">
        <button
          @click="emit('close')"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </template>
  </AppDialog>
</template>
```

(The `-m-2` on the list wrapper offsets `AppDialog`'s own `p-6` back down to this list's original tighter `p-2` padding, since the list benefits from the extra width for its drag handles and up/down buttons.)

Remove the no-longer-needed `onBackdropClick` function and the `useEscapeToClose` import/call from the script block.

Apply the substitution table to each group row (`bg-white dark:bg-slate-800` → `bg-[var(--surface-1)]`, `border-gray-200 dark:border-gray-700` → `border-[var(--border)]`, `hover:bg-gray-50 dark:hover:bg-slate-700/50` → `hover:bg-[var(--surface-2)]`, `text-gray-900 dark:text-white` → `text-[var(--text-primary)]`, the up/down chevron buttons' `text-gray-400`/`hover:text-gray-700`/`hover:bg-gray-100` → `text-[var(--text-tertiary)]`/`hover:text-[var(--text-primary)]`/`hover:bg-[var(--surface-2)]`). Leave the blue "visible" toggle circle as literal brand color.

- [ ] **Step 2: Replace the hashed rainbow avatar with a neutral one**

The per-group avatar circle currently picks a color out of 8 hues by hashing the group id (`getGroupColor`) — this is the same "hash a stable id into a decorative color" pattern the spec's "neutral, color for state" decision removed from sources; it belongs to identity, not state, so it goes neutral too. Replace:

```ts
function getGroupColor(groupId: string): string {
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index]!;
}
```

by deleting it entirely, and replace the template's use of it:

```vue
            <span
              class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              :class="getGroupColor(group.id)"
            >
              {{ getGroupName(group).charAt(0).toUpperCase() }}
            </span>
```

with:

```vue
            <span
              class="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--text-secondary)] text-sm font-bold shrink-0"
            >
              {{ getGroupName(group).charAt(0).toUpperCase() }}
            </span>
```

- [ ] **Step 3: Verify in the browser**

Open "Filter Groups" from the Simple UI toolbar. Confirm drag-to-reorder, up/down buttons, show/hide toggle, and Done all still work; every group's avatar is now a neutral circle instead of a rainbow of hash-picked colors; mobile shows a bottom sheet.

- [ ] **Step 4: Verify build and commit**

Run: `pnpm run build` — expect success.

```bash
git add src/components/GroupFilterModal.vue
git commit -m "refactor: migrate GroupFilterModal to AppDialog, neutral group avatars"
```

---

## Task 10: Migrate `AppSettingsModal.vue` to `AppDialog`, remove the view-mode toggle

**Files:**
- Modify: `src/components/AppSettingsModal.vue`

**Interfaces:**
- Consumes: `AppDialog` (Task 4) — `size="md"`, `title="Application Settings"`.
- Produces: no prop/emit change (`open` prop; `close`/`changePermissions`/`enableAuthentication`/`disableAuthentication` emits). The `ViewMode` import, `canChangeView`, `viewOptions`, and `selectView` are removed — this file no longer references `settings.viewMode` or `settings.setViewMode` at all (both are deleted from the store in Task 20).

- [ ] **Step 1: Remove the view-mode toggle from the script**

Delete the `ViewMode` type import:

```ts
import type { ViewMode } from "@/stores/settings";
```

Delete `canChangeView`, `viewOptions`, and `selectView`:

```ts
const canChangeView = computed(() => auth.hasFeaturePermission("canChangeView"));

const viewOptions: Array<{
  value: ViewMode;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: "simple",
    label: "Simple",
    description: "Big, friendly controls for everyday use",
    icon: "mdi-gesture-tap",
  },
  {
    value: "classic",
    label: "Classic",
    description: "Compact grid with every option",
    icon: "mdi-view-grid-outline",
  },
];

function selectView(mode: ViewMode) {
  if (!canChangeView.value) return;
  settings.setViewMode(mode);
}
```

- [ ] **Step 2: Delete the "Layout" section from the template**

Delete this entire block (the "Layout" `<div>` between the Theme toggle and the Auto Connect/Show Empty Groups section):

```vue
          <div>
            <div class="flex items-center justify-between mb-2">
              <span
                id="layout-label"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >Layout</span
              >
              <span
                v-if="!canChangeView"
                class="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <span class="mdi mdi-lock-outline" aria-hidden="true"></span>
                Locked by permissions
              </span>
            </div>
            <div
              role="radiogroup"
              aria-labelledby="layout-label"
              class="grid grid-cols-2 gap-3"
            >
              <button
                v-for="option in viewOptions"
                :key="option.value"
                type="button"
                role="radio"
                :aria-checked="settings.viewMode === option.value"
                :disabled="!canChangeView"
                class="relative text-left p-3 rounded-xl border-2 transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100"
                :class="[
                  settings.viewMode === option.value
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700',
                  { 'opacity-60': !canChangeView && settings.viewMode !== option.value },
                ]"
                @click="selectView(option.value)"
              >
                <!-- Mini preview of each layout -->
                <div
                  class="mb-2 h-14 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 p-1.5 flex gap-1"
                  aria-hidden="true"
                >
                  <template v-if="option.value === 'simple'">
                    <div class="flex-1 rounded-md bg-gradient-to-br from-blue-500/20 to-indigo-500/10 p-1 flex flex-col gap-1">
                      <div class="w-3 h-3 rounded bg-gradient-to-br from-blue-500 to-indigo-600"></div>
                      <div class="h-1 w-full rounded-full bg-blue-500/70"></div>
                    </div>
                    <div class="flex-1 rounded-md bg-gradient-to-br from-emerald-500/20 to-teal-500/10 p-1 flex flex-col gap-1">
                      <div class="w-3 h-3 rounded bg-gradient-to-br from-emerald-500 to-teal-600"></div>
                      <div class="h-1 w-2/3 rounded-full bg-emerald-500/70"></div>
                    </div>
                  </template>
                  <template v-else>
                    <div v-for="n in 3" :key="n" class="flex-1 flex flex-col gap-1">
                      <div class="flex-1 rounded bg-gray-100 dark:bg-slate-800"></div>
                      <div class="flex-1 rounded bg-gray-100 dark:bg-slate-800"></div>
                    </div>
                  </template>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="mdi text-base text-blue-600 dark:text-blue-400" :class="option.icon" aria-hidden="true"></span>
                  <span class="font-semibold text-sm text-gray-900 dark:text-white">{{ option.label }}</span>
                  <span
                    v-if="settings.viewMode === option.value"
                    class="ml-auto mdi mdi-check-circle text-blue-600 dark:text-blue-400"
                    aria-hidden="true"
                  ></span>
                </div>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 leading-snug">
                  {{ option.description }}
                </p>
              </button>
            </div>
          </div>
```

- [ ] **Step 3: Replace the outer chrome with `AppDialog`**

Remove the `useEscapeToClose` import and call. Add `import AppDialog from "@/components/AppDialog.vue";`. Wrap the remaining body (Server Host through Authentication) as the default slot, Cancel/Apply as the footer slot:

```vue
<template>
  <AppDialog :open="props.open" title="Application Settings" @close="emit('close')">
    <div class="space-y-6">
      <!-- ...Server Host, Theme, Auto Connect / Show Empty Groups, Volume Control, Support link, Authentication — unchanged except the token substitution below and the deleted Layout section from Step 2... -->
    </div>

    <template #footer>
      <div class="w-full flex justify-end gap-3">
        <button
          class="px-4 py-2 text-[var(--text-secondary)] font-medium hover:bg-[var(--surface-2)] rounded-lg transition-colors"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          @click="apply"
        >
          Apply
        </button>
      </div>
    </template>
  </AppDialog>
</template>
```

Apply the substitution table throughout the remaining sections (Server Host input, Theme toggle row, Auto Connect / Show Empty Groups toggles, Volume Control section, Authentication section) — every `bg-gray-50 dark:bg-slate-800` → `bg-[var(--surface-2)]`, `border-gray-200 dark:border-gray-700` → `border-[var(--border)]`, `text-gray-900 dark:text-white` → `text-[var(--text-primary)]`, `text-gray-700 dark:text-gray-300` → `text-[var(--text-secondary)]`, `text-gray-500 dark:text-gray-400` → `text-[var(--text-tertiary)]`, each `border-gray-100 dark:border-gray-800` section divider → `border-[var(--border)]`. Leave the yellow sun / blue moon theme icons, the "Support Development" gradient button, and the shield-lock icon as literal color.

- [ ] **Step 4: Verify in the browser**

Open Settings (gear icon). Confirm: no "Layout" section appears at all; Server Host, Theme, Auto Connect, Show Empty Groups, Volume Control mode/exponent, Support link, and Authentication (enable/disable, change permissions, lock now) all still work exactly as before; mobile shows a bottom sheet.

- [ ] **Step 5: Verify build and commit**

Run: `pnpm run build` — expect success. (It will still reference `settings.viewMode`/`auth.hasFeaturePermission("canChangeView")` nowhere now, but `settings.setViewMode`/`auth`'s `canChangeView` key still exist in the stores until Tasks 19-20 — that's fine, this task only had to stop *using* them from this file.)

```bash
git add src/components/AppSettingsModal.vue
git commit -m "refactor: migrate AppSettingsModal to AppDialog, remove Layout toggle"
```

---

## Task 11: Migrate `ServerInfo.vue` to `AppDialog`

**Files:**
- Modify: `src/components/ServerInfo.vue`

**Interfaces:**
- Consumes: `AppDialog` (Task 4) — `size="md"`, `title="Server Information"`, `title-icon="mdi-server"`.
- Produces: no prop/emit change (`isOpen` prop; `close` emit).

- [ ] **Step 1: Replace the outer chrome with `AppDialog`**

Remove the `useEscapeToClose` import and call. Add `import AppDialog from "@/components/AppDialog.vue";`. Note this component's own prop is named `isOpen`, not `open` — pass it through explicitly:

```vue
<template>
  <AppDialog :open="isOpen" title="Server Information" title-icon="mdi-server" @close="close">
    <div v-if="serverInfo && serverInfo.server && serverInfo.server.server" class="space-y-6">
      <!-- ...server status header + info grid + stats row, unchanged except the token substitution below... -->
    </div>
    <div v-else class="flex flex-col items-center justify-center py-8 text-[var(--text-tertiary)]">
      <span class="mdi mdi-loading mdi-spin text-3xl mb-2"></span>
      <p>Loading server info...</p>
    </div>

    <template #footer>
      <div class="w-full flex justify-end">
        <button
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          @click="close"
        >
          Close
        </button>
      </div>
    </template>
  </AppDialog>
</template>
```

Apply the substitution table: every info-grid `<label>`'s `text-gray-500 dark:text-gray-400` → `text-[var(--text-tertiary)]`, its value `<p>`'s `text-gray-900 dark:text-white` → `text-[var(--text-primary)]`, the stats row's `bg-gray-50 dark:bg-slate-800/50` → `bg-[var(--surface-2)]` and its labels' `text-gray-500 dark:text-gray-400` → `text-[var(--text-tertiary)]`, section dividers' `border-gray-100 dark:border-gray-800` → `border-[var(--border)]`. Leave the blue host-icon circle and the blue stat numbers as literal brand color.

- [ ] **Step 2: Verify in the browser**

Open Server Info (info icon in the header, shown only while connected). Confirm host name/IP, the info grid (IP, version, protocol, OS, arch, MAC), and the groups/clients/streams stat row all still render; Close/Escape still work.

- [ ] **Step 3: Verify build and commit**

Run: `pnpm run build` — expect success.

```bash
git add src/components/ServerInfo.vue
git commit -m "refactor: migrate ServerInfo to AppDialog and design tokens"
```

---

## Task 12: `UnlockPrompt.vue` — token pass (deliberately not migrated to `AppDialog`)

**Files:**
- Modify: `src/components/UnlockPrompt.vue`

**Interfaces:**
- No prop/emit change (`canCancel` prop; `unlock`/`cancel` emits). This component keeps its own hand-rolled backdrop/header/footer markup — it is **not** wrapped in `AppDialog` (see Step 1 for why) — and only gets the token substitution.

- [ ] **Step 1: Why this one stays off `AppDialog`**

`AppDialog` (Task 4) always shows a header × button and always closes on backdrop click. `UnlockPrompt` needs both to be *conditional* on `canCancel` (when a passcode is mandatory — e.g. first-time lock — the user must not be able to dismiss it). Rather than special-casing `AppDialog` with a new prop for this one caller, `UnlockPrompt.vue` keeps its existing structure (backdrop, header with conditional close button, body, footer with conditional Cancel) untouched and only gets the token substitution below. This keeps the `canCancel`-gated dismissal behavior exactly as it is today and avoids adding a one-off escape hatch to the shared component for a single caller.

Apply the substitution table to `UnlockPrompt.vue`: `bg-white dark:bg-slate-900` → `bg-[var(--surface-1)]`, `border-gray-200 dark:border-gray-800` → `border-[var(--border)]`, `border-gray-100 dark:border-gray-800` → `border-[var(--border)]`, `bg-gray-50 dark:bg-slate-800` (passcode input) → `bg-[var(--surface-2)]`, `border-gray-200 dark:border-gray-700` → `border-[var(--border)]`, `text-gray-900 dark:text-white` → `text-[var(--text-primary)]`, `text-gray-500 dark:text-gray-400` → `text-[var(--text-tertiary)]`, `text-gray-700 dark:text-gray-300` → `text-[var(--text-secondary)]`, footer `bg-gray-50 dark:bg-slate-800/50` → `bg-[var(--surface-2)]`, and the backdrop `bg-black/60 backdrop-blur-sm` → `bg-[var(--scrim)] backdrop-blur-sm`. Leave the red error box and blue Unlock button as literal semantic/brand color.

- [ ] **Step 2: Verify in the browser**

Trigger a lock (Settings → enable authentication → Lock Now). Confirm the unlock prompt still requires the correct passcode, still shows an error on a wrong one, and Cancel/Escape are still unavailable when `canCancel` is false (e.g. on first app load after enabling auth) and available when changing permissions mid-session.

- [ ] **Step 3: Verify build and commit**

Run: `pnpm run build` — expect success.

```bash
git add src/components/UnlockPrompt.vue
git commit -m "refactor: apply design tokens to UnlockPrompt"
```

---

## Task 13: `SetupPasscode.vue` — token pass

**Files:**
- Modify: `src/components/SetupPasscode.vue`

**Interfaces:** No prop/emit change (`title`/`description`/`submitLabel`/`canCancel` props; `complete`/`cancel` emits). This stays a full-screen branded page (gradient background), not an `AppDialog` — structurally different from every other modal (no backdrop-click-to-dismiss semantics, it's a mandatory flow step), so it keeps its own markup and only gets the token substitution.

- [ ] **Step 1: Apply the substitution table**

`bg-white dark:bg-slate-900` → `bg-[var(--surface-1)]`; `border-gray-200 dark:border-gray-800` → `border-[var(--border)]`; both passcode inputs' `bg-gray-50 dark:bg-slate-800` → `bg-[var(--surface-2)]` and their non-error `border-gray-200 dark:border-gray-700` → `border-[var(--border)]`; `text-gray-900 dark:text-white` → `text-[var(--text-primary)]`; `text-gray-500 dark:text-gray-400` → `text-[var(--text-tertiary)]`; `text-gray-700 dark:text-gray-300` → `text-[var(--text-secondary)]`; the Cancel button's `text-gray-600 dark:text-gray-300` → `text-[var(--text-secondary)]` and `hover:bg-gray-100 dark:hover:bg-slate-800` → `hover:bg-[var(--surface-2)]`. Leave the blue gradient page background, the blue lock-icon circle, the red error box, and the blue info box and submit button as literal semantic/brand color — none of those are structural gray.

- [ ] **Step 2: Verify in the browser**

Trigger first-time passcode setup (Settings → enable authentication). Confirm passcode/confirm fields, mismatch/too-short error states, submit, and (when cancellable) cancel all still work.

- [ ] **Step 3: Verify build and commit**

Run: `pnpm run build` — expect success.

```bash
git add src/components/SetupPasscode.vue
git commit -m "refactor: apply design tokens to SetupPasscode"
```

---

## Task 14: Zone card & toolbar visual pass

**Files:**
- Modify: `src/components/simple/SimpleZoneCard.vue`
- Modify: `src/components/simple/SimpleZoneView.vue`
- Modify: `src/components/simple/simple-view.css`

**Interfaces:** No prop/emit change on either component.

- [ ] **Step 0: Make the tile neutral unless the zone is playing or muted**

In `src/components/simple/simple-view.css`, replace the `.sv-tile`, `.sv-tile.is-idle`, `.sv-tile.is-muted`, and `.sv-link-on` rules with:

```css
.sv-tile {
  background: var(--accent);
}
.sv-tile.is-idle {
  background: var(--surface-2);
  color: var(--text-secondary);
}
.sv-tile.is-muted {
  background: var(--status-attention);
  color: #fff;
}
```

```css
.sv-link-on {
  background: #2563eb;
}
```

(`.sv-link-on` marks a selection, not a state, so it uses brand blue. The `is-muted` rule stays after `is-idle` so a muted idle zone reads red.) Keep `.sv-glow` and `.sv-eq` as they are.

- [ ] **Step 1: Token pass on `SimpleZoneCard.vue`'s non-accent structural classes**

Apply the substitution table to classes that aren't part of the accent system: the card's own `border-gray-200/80 dark:border-gray-800` (non-muted case) → `border-[var(--border)]` (keep the muted-case `border-red-200 dark:border-red-900/50` as literal semantic color), `bg-white/90 dark:bg-slate-900/90 backdrop-blur` → `bg-[var(--surface-1)]` (solid card, no blur), the zone name `text-slate-900 dark:text-white` → `text-[var(--text-primary)]`, the status-line `text-slate-500 dark:text-slate-400` → `text-[var(--text-tertiary)]`, the Volume & Speakers row's `border-slate-200 dark:border-slate-700` → `border-[var(--border)]` and `bg-slate-50/80 dark:bg-slate-800/60` → `bg-[var(--surface-2)]`, its hover `hover:bg-white dark:hover:bg-slate-800` → `hover:bg-[var(--surface-1)]`, the mute button's non-muted `bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700` → `bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)]`, the settings cog `w-10 h-10` → `w-11 h-11`, the volume percentage text's `text-slate-700 dark:text-slate-200` → `text-[var(--text-secondary)]`, the "no speakers" message's `text-slate-500 dark:text-slate-400` → `text-[var(--text-tertiary)]`. Leave `sv-accent-text`, the green/red status dots, and the mute button's red state exactly as they are (state color).

- [ ] **Step 2: Toolbar — collapse secondary actions into an overflow menu on mobile**

In `SimpleZoneView.vue`, the current toolbar is 5 same-sized circular buttons (Mute all, Create, Show-empty toggle, Filter, Refresh) in one `flex` row. Add local state and a small menu:

```ts
import { ref } from "vue";
// ...existing imports stay...

const showOverflowMenu = ref(false);
```

Replace the toolbar's `<div class="flex items-center gap-2 flex-wrap">...</div>` contents so "Mute all" and "Add zone" stay as direct, labeled, always-visible buttons, and the Show-empty/Filter/Refresh trio moves into a `sm:contents` group that's a dropdown below `sm` and inline above it:

```vue
      <div class="flex items-center gap-2 flex-wrap">
        <button
          v-if="canAdjustVolume && sortedZones.length > 1"
          type="button"
          class="h-11 px-4 inline-flex items-center gap-2 rounded-full border text-sm font-semibold shadow-sm transition-all duration-300 active:scale-95"
          :class="
            allMuted
              ? 'bg-red-500 border-red-500 text-white shadow-red-500/30 hover:bg-red-600'
              : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
          "
          :aria-pressed="allMuted"
          @click="toggleMuteAll"
        >
          <span class="mdi text-lg" :class="allMuted ? 'mdi-volume-high' : 'mdi-volume-off'" aria-hidden="true"></span>
          {{ allMuted ? "Unmute all" : "Mute all" }}
        </button>

        <button
          v-if="auth.permissions.showCreateGroup"
          type="button"
          class="h-11 px-4 inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all active:scale-95"
          @click="emit('create-group')"
        >
          <span class="mdi mdi-plus text-lg" aria-hidden="true"></span>
          Add zone
        </button>

        <!-- Desktop: inline. Mobile: collapsed into the overflow menu below. -->
        <div class="hidden sm:flex items-center gap-2">
          <Tooltip :text="settings.showEmptyGroups ? 'Hide empty groups' : 'Show empty groups'">
            <button
              type="button"
              class="w-11 h-11 flex items-center justify-center rounded-full border shadow-sm transition-all active:scale-90"
              :class="
                settings.showEmptyGroups
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                  : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
              "
              :aria-pressed="settings.showEmptyGroups"
              @click="settings.setShowEmptyGroups(!settings.showEmptyGroups)"
            >
              <span class="mdi text-xl" :class="settings.showEmptyGroups ? 'mdi-eye' : 'mdi-eye-off'"></span>
            </button>
          </Tooltip>

          <Tooltip v-if="auth.permissions.showGroupFilter" text="Filter Groups">
            <button
              type="button"
              class="w-11 h-11 flex items-center justify-center rounded-full border shadow-sm transition-all active:scale-90"
              :class="
                showGroupFilter
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                  : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
              "
              @click="showGroupFilter = !showGroupFilter"
            >
              <span class="mdi mdi-filter-variant text-xl"></span>
            </button>
          </Tooltip>

          <Tooltip text="Refresh Status">
            <button
              type="button"
              class="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] shadow-sm transition-all active:scale-90"
              :disabled="refreshing"
              @click="refreshStatus"
            >
              <span class="mdi mdi-refresh text-xl block" :class="{ 'animate-spin': refreshing }"></span>
            </button>
          </Tooltip>
        </div>

        <!-- Mobile: a single overflow trigger replaces the three buttons above. -->
        <div ref="overflowMenuRef" class="relative sm:hidden">
          <button
            type="button"
            class="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] shadow-sm transition-all active:scale-90"
            aria-haspopup="menu"
            :aria-expanded="showOverflowMenu"
            aria-label="More zone actions"
            @click="showOverflowMenu = !showOverflowMenu"
          >
            <span class="mdi mdi-dots-horizontal text-xl"></span>
          </button>
          <Transition name="sv-pop">
            <div
              v-if="showOverflowMenu"
              role="menu"
              class="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xl p-1.5 z-20"
            >
              <button
                type="button"
                role="menuitem"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                @click="settings.setShowEmptyGroups(!settings.showEmptyGroups); showOverflowMenu = false"
              >
                <span class="mdi text-lg" :class="settings.showEmptyGroups ? 'mdi-eye' : 'mdi-eye-off'" aria-hidden="true"></span>
                {{ settings.showEmptyGroups ? "Hide empty groups" : "Show empty groups" }}
              </button>
              <button
                v-if="auth.permissions.showGroupFilter"
                type="button"
                role="menuitem"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                @click="showGroupFilter = true; showOverflowMenu = false"
              >
                <span class="mdi mdi-filter-variant text-lg" aria-hidden="true"></span>
                Filter groups
              </button>
              <button
                type="button"
                role="menuitem"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                @click="refreshStatus(); showOverflowMenu = false"
              >
                <span class="mdi mdi-refresh text-lg" :class="{ 'animate-spin': refreshing }" aria-hidden="true"></span>
                Refresh status
              </button>
            </div>
          </Transition>
        </div>
      </div>
```

Add Escape and click-outside close for the new menu (this is the one piece of *new* interaction behavior in this task, everything else above is pure restyle). Change the `vue` import to `import { ref, computed, onMounted, onUnmounted } from "vue";`, then add:

```ts
import { useEscapeToClose } from "@/composables/useEscapeToClose";
// ...
const overflowMenuRef = ref<HTMLElement | null>(null);

function closeOverflowMenu() {
  showOverflowMenu.value = false;
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!overflowMenuRef.value?.contains(event.target as Node)) closeOverflowMenu();
}

onMounted(() => document.addEventListener("pointerdown", onDocumentPointerDown));
onUnmounted(() => document.removeEventListener("pointerdown", onDocumentPointerDown));
useEscapeToClose(() => showOverflowMenu.value, closeOverflowMenu);
```

Also apply the substitution table to the rest of `SimpleZoneView.vue`: the header title and summary text, and the empty-state block (`border-gray-200 dark:border-gray-800`, `bg-white/50 dark:bg-slate-900/50` → `bg-[var(--surface-1)]`, its text). Replace the empty state's gradient icon circle (`bg-gradient-to-br from-blue-500 to-indigo-600 text-white ... shadow-lg shadow-blue-600/20`) with `bg-[var(--surface-2)] text-[var(--text-secondary)]`.

- [ ] **Step 3: Verify in the browser — desktop**

`pnpm run dev`, resize to desktop width. Confirm Mute all, Add zone, Show-empty, Filter, and Refresh all show inline as before (now with token colors instead of gray/slate literals).

- [ ] **Step 4: Verify in the browser — mobile**

Resize to a 375px-wide viewport (`resize_window` preset `mobile` if using the built-in browser tool). Confirm Mute all and Add zone stay visible; Show-empty/Filter/Refresh are gone from the inline row and instead a single "⋯" button opens a dropdown menu with all three as labeled rows; each menu action works and closes the menu; Escape closes the menu.

- [ ] **Step 5: Verify build and commit**

Run: `pnpm run build` — expect success.

```bash
git add src/components/simple/SimpleZoneCard.vue src/components/simple/SimpleZoneView.vue src/components/simple/simple-view.css
git commit -m "feat: token pass on zone cards, collapse toolbar into overflow menu on mobile"
```

---

## Task 15: `SimpleSourceButton.vue`, `SimpleVolumeSlider.vue`, `SimpleZoneModal.vue` — token pass

**Files:**
- Modify: `src/components/simple/SimpleSourceButton.vue`
- Modify: `src/components/simple/SimpleVolumeSlider.vue`
- Modify: `src/components/simple/SimpleZoneModal.vue`

**Interfaces:** No prop/emit change in any of the three. These already use the `sv-sheet`/`sv-tile`/`sv-glow`/accent mechanism correctly (Task 2 already recolored it) — this task is only the remaining structural-gray → token substitution.

- [ ] **Step 1: `SimpleSourceButton.vue`**

Apply the substitution table: `border-slate-200 dark:border-slate-700` → `border-[var(--border)]`; `bg-slate-50/80 dark:bg-slate-800/60` → `bg-[var(--surface-2)]`; hover `hover:bg-white dark:hover:bg-slate-800` → `hover:bg-[var(--surface-1)]`; the stream-name text `text-slate-900 dark:text-white` → `text-[var(--text-primary)]`; the subtitle `text-slate-500 dark:text-slate-400` → `text-[var(--text-tertiary)]`; the lock icon `text-slate-400` → `text-[var(--text-tertiary)]`. On the "Change" label, replace `sv-accent-text` with `text-blue-600 dark:text-blue-400`. Make the source tile always neutral, so a card has one colored tile at most: replace its `class="sv-tile w-11 h-11 ..."` and `:class="{ 'is-muted': group.muted }"` with a static `class="sv-tile is-idle w-11 h-11 ..."` and no `:class`.

- [ ] **Step 2: `SimpleVolumeSlider.vue`**

Apply the substitution table to the −/+ buttons' `text-slate-500 dark:text-slate-400`, the track's `bg-slate-200 dark:bg-slate-700` → `bg-[var(--surface-2)]`, and the value label. In the `size === 'md'` branch of both −/+ buttons change `w-9 h-9` to `w-11 h-11` (44px touch target). Leave the fill color (the `accent` prop) untouched.

- [ ] **Step 3: `SimpleZoneModal.vue`**

Apply the substitution table to its structural classes: panel `bg-white dark:bg-slate-900` → already uses the `sv-sheet-panel` + this file's own background class, map it to `bg-[var(--surface-1)]`; header/footer borders `border-gray-200 dark:border-gray-800` type classes → `border-[var(--border)]`; zone-name text → `text-[var(--text-primary)]`; helper/meta text → `text-[var(--text-tertiary)]`; the per-speaker row backgrounds/borders → `bg-[var(--surface-2)]`/`border-[var(--border)]`; every speaker-row button to 44px (settings and mute `w-9 h-9` → `w-11 h-11`, the Link pill `h-9` → `h-11`, the header cog and close `w-10 h-10` → `w-11 h-11`). Leave `sv-tile`, `sv-glow`, `sv-accent-text`, `sv-link-on`, and the green/red/amber state dots and badges untouched (all state-driven already).

- [ ] **Step 4: Verify in the browser**

Open a zone's source button → confirm it still opens the picker and shows the current source name/count. Open Volume & Speakers → confirm master volume (when linked), per-speaker sliders, mute, link toggle, and the links to client details/settings all still work, light and dark, desktop and mobile (bottom sheet).

- [ ] **Step 5: Verify build and commit**

Run: `pnpm run build` — expect success.

```bash
git add src/components/simple/SimpleSourceButton.vue src/components/simple/SimpleVolumeSlider.vue src/components/simple/SimpleZoneModal.vue
git commit -m "refactor: apply design tokens to source button, volume slider, zone sheet"
```

---

## Task 16: `ConnectionPanel.vue` — unify to design tokens and brand blue

**Files:**
- Modify: `src/components/ConnectionPanel.vue`

**Interfaces:** No prop/emit change (`showingPermissionsSetup` prop only). This file currently uses a **different** accent (`cyan-*`) and a **different** gray family (`gray-950`/`gray-600`/`gray-300` instead of `slate-*`) than the rest of the app — the least-consistent screen in the whole app today. Unify it to the same brand blue and tokens everything else uses.

- [ ] **Step 1: Replace cyan accent with the app's brand blue**

Every `cyan-*` class (the server icon tile, title accents, input focus ring, suggestion chips, submit button, numbered-step badges in the aside) becomes the equivalent `blue-*` shade (`cyan-50`→`blue-50`, `cyan-700`→`blue-700`, `cyan-600`→`blue-600`, `cyan-500`→`blue-500`, `cyan-950`→`blue-950`, `cyan-900`→`blue-900`, `cyan-300`→`blue-300`, `cyan-200`→`blue-200`, `cyan-800`→`blue-800`, `cyan-400`→`blue-400`), matching the "Connect to Snapcast" button and every other primary action in the app.

- [ ] **Step 2: Apply the substitution table**

`bg-white`/`dark:bg-slate-900` (section) → `bg-[var(--surface-1)]`; `border-gray-200`/`dark:border-slate-800` → `border-[var(--border)]`; `bg-gray-50`/`dark:bg-slate-900/60` (aside) → `bg-[var(--surface-0)]`; `text-gray-950 dark:text-white` → `text-[var(--text-primary)]`; `text-gray-600 dark:text-gray-300` → `text-[var(--text-secondary)]`; `text-gray-500 dark:text-gray-400` → `text-[var(--text-tertiary)]`; input `border-gray-300 dark:border-slate-700` → `border-[var(--border)]`, its `bg-white dark:bg-slate-800` → `bg-[var(--surface-1)]` (note: this one input's own background intentionally stays a notch lighter than the surrounding `--surface-2` card in dark mode today — keep it as `bg-[var(--surface-1)]` to preserve that contrast, do not fold it into `--surface-2`); suggestion-chip unselected state `border-gray-200 bg-gray-50 ... dark:border-slate-700 dark:bg-slate-800` → `border-[var(--border)] bg-[var(--surface-2)]`; the numbered step badges `bg-white dark:bg-slate-800` → `bg-[var(--surface-1)]`. Leave the red/amber error-tone message box as literal semantic color (it already correctly varies by `connectionFormTone`).

- [ ] **Step 3: Verify in the browser**

Disconnect (or load the app before the mock/real server answers). Confirm the "Tell SnapCtrl where your server is" panel, host input, suggestion chips (including removing a recent host), the 3-step "Where is Snapcast running?" aside, and the Connect button all still work and now read as blue instead of cyan, with unified gray tokens.

- [ ] **Step 4: Verify build and commit**

Run: `pnpm run build` — expect success.

```bash
git add src/components/ConnectionPanel.vue
git commit -m "refactor: unify ConnectionPanel to brand blue and design tokens"
```

---

## Task 17: `Toast.vue`, `LoadingSpinner.vue`, `Tooltip.vue` — token pass

**Files:**
- Modify: `src/components/Toast.vue`
- Modify: `src/components/LoadingSpinner.vue`
- Modify: `src/components/Tooltip.vue`

**Interfaces:** No prop/emit change in any of the three.

- [ ] **Step 1: `Toast.vue`**

`bg-white dark:bg-slate-900` → `bg-[var(--surface-1)]`; each toast's base `border-gray-200 dark:border-gray-800` → `border-[var(--border)]`; message text `text-gray-700 dark:text-gray-200` → `text-[var(--text-secondary)]`; dismiss button `text-gray-400 hover:text-gray-600 dark:hover:text-gray-300` → `text-[var(--text-tertiary)] hover:text-[var(--text-primary)]`, its hover background `hover:bg-gray-100 dark:hover:bg-slate-800` → `hover:bg-[var(--surface-2)]`. Leave the colored left-border/icon/text per notification type (emerald/red/amber/blue) exactly as-is — that's the whole point of a toast's color.

- [ ] **Step 2: `LoadingSpinner.vue`**

`border-gray-200 dark:border-gray-700` (spinner track) → `border-[var(--border)]`; label `text-gray-500 dark:text-gray-400` → `text-[var(--text-tertiary)]`. Leave `border-t-blue-600` (the spinning indicator itself) as literal brand color.

- [ ] **Step 3: `Tooltip.vue`**

This bubble is intentionally theme-invariant (always a dark bubble, readable on both light and dark pages) — leave `bg-gray-900 dark:bg-gray-700` as-is; no token change needed here. (No step action beyond confirming this via a quick read — if it in fact used `--surface-*` it would go nearly invisible in dark mode, so this file is correctly excluded from the substitution table.)

- [ ] **Step 4: Verify in the browser**

Trigger a toast (e.g. an invalid host). Trigger a loading spinner (disconnect and reconnect). Hover a tooltip-wrapped icon button. Confirm all three still render and behave identically, just with unified gray tokens on Toast/LoadingSpinner.

- [ ] **Step 5: Verify build and commit**

Run: `pnpm run build` — expect success.

```bash
git add src/components/Toast.vue src/components/LoadingSpinner.vue
git commit -m "refactor: apply design tokens to Toast and LoadingSpinner"
```

---

## Task 18: App chrome — `App.vue` header/footer token pass + remove the Classic rendering path

**Files:**
- Modify: `src/App.vue`

**Interfaces:** No prop/emit change to any child component usage that survives. `SimpleZoneView` becomes the app's unconditional main view (no more `v-else-if="settings.viewMode === 'simple'"` / `v-else` `ZoneGrid` branch). `ZoneControlModal`'s props/emits and every App.vue helper function that existed only to feed it are deleted.

- [ ] **Step 1: Token pass on the header and footer**

Header: `bg-white/80 dark:bg-slate-900/80` → `bg-[var(--surface-1)]/80`; `border-gray-200 dark:border-gray-800` → `border-[var(--border)]`; the icon buttons' `hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400` → `hover:bg-[var(--surface-2)] text-[var(--text-secondary)]`; the browser-player divider `border-gray-200 dark:border-gray-800` → `border-[var(--border)]`. Footer: `text-gray-500 dark:text-gray-400` → `text-[var(--text-tertiary)]`, `border-gray-200 dark:border-gray-800` → `border-[var(--border)]`. Root `<div id="app">`'s `bg-gray-50 dark:bg-slate-950` → `bg-[var(--surface-0)]`, `text-slate-900 dark:text-slate-100` → `text-[var(--text-primary)]`. Leave the logo gradient title, the green/yellow/amber/gray connection-status pill, and the blue "Connected"-style states as literal/semantic color.

- [ ] **Step 2: Make `SimpleZoneView` the unconditional main view**

Replace:

```vue
        <SimpleZoneView
          v-else-if="settings.viewMode === 'simple'"
          @group-settings="openGroupSettings"
          @create-group="openCreateGroup"
          @client-details="openClientDetails"
          @client-settings="openClientSettings"
        />

        <ZoneGrid
          v-else
          @zone-control="openZoneControl"
          @group-settings="openGroupSettings"
          @create-group="openCreateGroup"
        />
```

with:

```vue
        <SimpleZoneView
          v-else
          @group-settings="openGroupSettings"
          @create-group="openCreateGroup"
          @client-details="openClientDetails"
          @client-settings="openClientSettings"
        />
```

(It's the final branch in the `v-if`/`v-else-if`/`v-else-if`/`v-else` chain over connection state — `v-else` is correct here, same as `ZoneGrid` was.)

- [ ] **Step 3: Delete the `ZoneControlModal` block**

Delete this entire block from the template (currently between the Footer and the Group Settings Modal):

```vue
      <!-- Zone Control Modal -->
      <ZoneControlModal
        v-if="zoneControlGroup"
        :is-open="!!zoneControlGroup"
        :group-id="zoneControlGroup!.id"
        :group-name="getGroupName(zoneControlGroup!)"
        :stream-id="zoneControlGroup!.stream_id"
        :streams="displayStreams"
        :stream-name="getStreamName(snapcast.streams.find(s => s.id === zoneControlGroup!.stream_id))"
        :stream-status-icon="getStreamStatusIcon(snapcast.streams, zoneControlGroup!.stream_id)"
        :stream-status-color="getStreamStatusColor(snapcast.streams, zoneControlGroup!.stream_id)"
        :stream-status-tooltip="getStreamStatusTooltip(snapcast.streams, zoneControlGroup!.stream_id)"
        :volume="getGroupVolume(zoneControlGroup!.id)"
        :is-muted="zoneControlGroup!.muted"
        :clients="zoneControlGroup!.clients"
        :linked-client-ids="settings.groupVolumeLinks[zoneControlGroup!.id]?.linkedClientIds || []"
        :show-settings-button="auth.permissions.showGroupSettings"
        :show-client-settings-button="auth.permissions.showClientSettings"
        :can-select-stream="auth.permissions.canSelectStream"
        @close="closeZoneControl"
        @update:volume="setGroupVolume(zoneControlGroup!.id, $event)"
        @adjust-volume="adjustGroupVolume(zoneControlGroup!.id, $event)"
        @toggle-mute="toggleGroupMute(zoneControlGroup!)"
        @update-client-volume="setVolume"
        @toggle-client-mute="toggleClientMute"
        @open-settings="handleOpenSettingsFromZoneControl"
        @open-client-settings="openClientSettings"
        @open-client-details="openClientDetails"
        @update:streamId="changeGroupStream(zoneControlGroup!, $event)"
      />

```

- [ ] **Step 4: Delete the now-dead script: imports, state, and helper functions**

Delete these two imports:

```ts
import ZoneGrid from "@/components/ZoneGrid.vue";
```
```ts
import ZoneControlModal from "@/components/ZoneControlModal.vue";
```

Delete these now-unused imports (each was used only by the deleted `ZoneControlModal` block or the functions deleted below — confirmed by grep: no other use remains in this file after Steps 2-3):

```ts
import {
  getStreamStatusColor,
  getStreamStatusIcon,
  getStreamStatusTooltip,
} from "@/utils/stream-status";
import { averageGroupVolume } from "@/utils/group-volume";
```

Delete this whole block of now-dead state and functions (Zone Control Modal State through `adjustGroupVolume`):

```ts
// Zone Control Modal State
const zoneControlGroupId = ref<string | null>(null);

const zoneControlGroup = computed(() => {
  if (!zoneControlGroupId.value) return null;
  return snapcast.groups.find((g) => g.id === zoneControlGroupId.value) || null;
});

function openZoneControl(group: Group) {
  zoneControlGroupId.value = group.id;
}

function closeZoneControl() {
  zoneControlGroupId.value = null;
}

function handleOpenSettingsFromZoneControl() {
  // Don't close zone control to allow stacking (dialog over dialog)
  if (zoneControlGroup.value) {
    openGroupSettings(zoneControlGroup.value);
  }
}

function getGroupName(group: Group): string {
  return getGroupDisplayName(group, snapcast.streams);
}

const displayStreams = computed(() => {
  return snapcast.streams.map((stream) => ({
    id: stream.id,
    name: getStreamName(stream),
  }));
});

function toggleGroupMute(group: Group) {
  snapcast.setGroupMute(group.id, !group.muted);
}

function changeGroupStream(group: Group, streamId: string) {
  if (!streamId) return;
  snapcast.setGroupStream(group.id, streamId);
}

function toggleClientMute(client: Client) {
  snapcast.setClientVolume(
    client.id,
    client.config.volume.percent,
    !client.config.volume.muted
  );
}

function setVolume(client: Client, volume: number) {
  snapcast.setClientVolume(client.id, volume, client.config.volume.muted);
}

function getGroupVolume(groupId: string): number {
  const linkedIds = settings.groupVolumeLinks[groupId]?.linkedClientIds || [];
  const group = snapcast.groups.find((g) => g.id === groupId);
  return averageGroupVolume(group, linkedIds);
}

/**
 * Set group volume (adjusts all linked clients proportionally)
 */
async function setGroupVolume(groupId: string, groupVolume: number) {
  const linkConfig = settings.groupVolumeLinks[groupId];
  const linkedIds = linkConfig?.linkedClientIds || [];

  if (linkedIds.length === 0) return;

  // Get reference volumes from settings (or current volumes as fallback)
  const referenceVolumes = linkConfig?.referenceVolumes || {};

  await snapcast.setGroupVolumeProportional(
    groupId,
    groupVolume,
    linkedIds,
    referenceVolumes
  );
}

/**
 * Adjust group volume by delta
 */
async function adjustGroupVolume(groupId: string, delta: number) {
  const currentVolume = getGroupVolume(groupId);
  const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
  await setGroupVolume(groupId, newVolume);
}
```

Also delete the now-unused `getStreamName`/`getGroupDisplayName` imports **only if** nothing else in the file still uses them — re-check with `grep -n "getStreamName\|getGroupDisplayName" src/App.vue` after the deletions above; if either import has zero remaining call sites, delete that import line too.

- [ ] **Step 5: Verify no dangling references**

Run: `grep -n "ZoneGrid\|ZoneControlModal\|zoneControlGroup\|openZoneControl\|closeZoneControl\|handleOpenSettingsFromZoneControl\|getGroupVolume\|setGroupVolume\|adjustGroupVolume\|toggleGroupMute\|changeGroupStream\|toggleClientMute\b\|displayStreams\|getGroupName\b" src/App.vue`
Expected: no output (every one of these was either deleted or — for `getGroupName`/`toggleClientMute`/etc. — confirm none are accidentally still referenced by a surviving modal binding; the Group Settings/Client Settings/Client Details/Create Group modal bindings further down the template don't use any of them, only `group-settings`/`client-settings`/`client-details`/`create-group` events wired to `openGroupSettings`/`openClientSettings`/`openClientDetails`/`openCreateGroup`, which all stay).

- [ ] **Step 6: Verify build**

Run: `pnpm run build`
Expected: succeeds — this is the step that actually catches a missed reference (an unresolved component tag or an undefined identifier in the template fails Vue's compiler / `vue-tsc`).

- [ ] **Step 7: Verify in the browser**

`pnpm run dev`. Confirm the app loads straight into the Simple UI with no way to reach a Classic grid (there's no toggle left — Task 10 already removed it from Settings); every zone card's gear icon still opens Group Settings; "Control"-style zone-level volume adjustment still happens through the Simple UI's own Volume & Speakers sheet (never through the deleted `ZoneControlModal`).

- [ ] **Step 8: Commit**

```bash
git add src/App.vue
git commit -m "refactor: App.vue — Simple is now the only view, remove Classic/ZoneControlModal wiring"
```

---

## Task 19: Remove the `canChangeView` permission

**Files:**
- Modify: `src/stores/auth.ts`
- Modify: `src/stores/__tests__/auth.test.ts`
- Modify: `src/components/PermissionsConfig.vue`

**Interfaces:** `AuthPermissions` no longer has a `canChangeView` field. `hasFeaturePermission`'s accepted-feature union no longer includes `"canChangeView"`. Nothing in the codebase calls `hasFeaturePermission("canChangeView")` anymore after Task 10 — confirmed, this task is safe to run after Task 10.

- [ ] **Step 1: Remove `canChangeView` from `auth.ts`**

Delete the field (and its explanatory comment) from `AuthPermissions`:

```ts
  // Optional because permissions persisted before this flag existed won't
  // carry it — a missing value is treated as allowed (see hasFeaturePermission).
  canChangeView?: boolean;
```

Delete `canChangeView: true,` from the initial `permissions` ref's default object (the one right after `const permissions = ref<AuthPermissions>({`).

Delete `| "canChangeView"` from `hasFeaturePermission`'s parameter type union.

Delete `canChangeView: true,` from `resetPermissions()`'s default object.

- [ ] **Step 2: Update the test**

In `src/stores/__tests__/auth.test.ts`, delete the `it("treats canChangeView missing from older saved permissions as allowed", ...)` test block entirely (it tests a permission that no longer exists).

- [ ] **Step 3: Remove the "Allow Changing Layout" toggle from `PermissionsConfig.vue`**

Delete this entire `<label>` block (lines 161-183 as read this session):

```vue
            <label
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div>
                <span class="block font-medium text-gray-900 dark:text-white"
                  >Allow Changing Layout</span
                >
                <span class="block text-xs text-gray-500 dark:text-gray-400"
                  >Turn off to lock this device to its current Classic/Simple
                  layout</span
                >
              </div>
              <div class="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  v-model="localPermissions.canChangeView"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </div>
            </label>
```

Delete `canChangeView: props.initialPermissions.canChangeView !== false,` from the `localPermissions` ref's initializer in the script.

Apply the substitution table to the rest of `PermissionsConfig.vue`'s structural grays while this file is open for editing (same mechanical pass as every other modal task: `bg-white dark:bg-slate-900` → `bg-[var(--surface-1)]`, `border-gray-200 dark:border-gray-800` / `border-gray-200 dark:border-gray-700` → `border-[var(--border)]`, every toggle row's `bg-gray-50 dark:bg-slate-800` → `bg-[var(--surface-2)]`, `text-gray-900 dark:text-white` → `text-[var(--text-primary)]`, `text-gray-700 dark:text-gray-300` → `text-[var(--text-secondary)]`, `text-gray-500 dark:text-gray-400` → `text-[var(--text-tertiary)]`). This modal is created/destroyed by the parent's `v-if` rather than an internal `open` toggle (its own comment explains why — it doesn't use `AppDialog`'s `open`-prop-driven Transition model, so it is **not** migrated to `AppDialog` in this plan; it keeps its own backdrop/dialog markup, just retoken it).

- [ ] **Step 4: Run tests and build**

Run: `pnpm test` — expect PASS, no reference to `canChangeView` anywhere.
Run: `pnpm run build` — expect success.

- [ ] **Step 5: Verify in the browser**

Settings → Change Permissions (with auth enabled). Confirm "Allow Changing Layout" no longer appears anywhere in the permissions list; every other toggle (volume, rename groups/clients, select stream, configure PSV, assign/link clients, UI visibility, entity restrictions) still works.

- [ ] **Step 6: Commit**

```bash
git add src/stores/auth.ts src/stores/__tests__/auth.test.ts src/components/PermissionsConfig.vue
git commit -m "refactor: remove canChangeView permission, apply design tokens to PermissionsConfig"
```

---

## Task 20: Remove `viewMode` from the settings store

**Files:**
- Modify: `src/stores/settings.ts`

**Interfaces:** `ViewMode` type, `settings.viewMode`, and `settings.setViewMode` are deleted. Confirmed by this session's repo-wide grep: after Tasks 10 and 18, nothing references any of the three.

- [ ] **Step 1: Delete the type and its doc comment**

```ts
/**
 * Main-screen layout.
 * - "classic": the original zone grid + Zone Control dialog (every option).
 * - "simple": large, self-contained zone cards (source, volume, mute and
 *   speaker linking inline) aimed at everyday, non-technical use.
 */
export type ViewMode = "classic" | "simple";
```

- [ ] **Step 2: Delete the state**

```ts
    const viewMode = ref<ViewMode>("classic");
```

- [ ] **Step 3: Delete the setter**

```ts
    function setViewMode(mode: ViewMode) {
      viewMode.value = mode === "simple" ? "simple" : "classic";
    }

```

- [ ] **Step 4: Delete the two return-object entries**

Delete `viewMode,` from the returned state object and `setViewMode,` from the returned actions object.

- [ ] **Step 5: Delete the persistence path**

Delete `"viewMode",` from the `persist.pick` array (the store's actual
persistence option is named `pick`, not `paths`).

- [ ] **Step 6: Verify repo-wide**

Run: `grep -rn "viewMode\|ViewMode" src`
Expected: no output.

- [ ] **Step 7: Run tests and build**

Run: `pnpm test` — expect PASS.
Run: `pnpm run build` — expect success.

- [ ] **Step 8: Commit**

```bash
git add src/stores/settings.ts
git commit -m "refactor: remove viewMode from settings store"
```

---

## Task 21: Delete the Classic UI files, final verification

**Files:**
- Delete: `src/components/ZoneGrid.vue`
- Delete: `src/components/VolumeControl.vue`
- Delete: `src/components/ZoneControlModal.vue`

**Interfaces:** None of these three export anything any surviving file imports — confirmed: `ZoneGrid`/`ZoneControlModal`'s only importer was `App.vue`, deleted in Task 18; `VolumeControl`'s importers need a final check in Step 1 below (it wasn't traced to a specific importer during planning beyond "Classic-only" from this session's feature-parity audit — verify before deleting).

- [ ] **Step 1: Confirm nothing imports the three files, then delete them**

Run: `grep -rln "ZoneGrid\|VolumeControl\.vue\|ZoneControlModal" src --include="*.vue" --include="*.ts"`
Expected: only the three files themselves (and nothing else — if anything else shows up, stop and investigate before deleting; it means something still depends on one of them that this plan didn't account for).

```bash
git rm src/components/ZoneGrid.vue src/components/VolumeControl.vue src/components/ZoneControlModal.vue
```

- [ ] **Step 2: Delete helpers only Classic used, and stale comments**

`git rm src/utils/group-volume.ts src/utils/__tests__/group-volume.test.ts`. In `src/utils/stream-status.ts` delete `getStreamStatusIcon`, `getStreamStatusColor`, and `getStreamStatusTooltip` (keep `getStreamStatus`), and delete their test cases and imports from `src/utils/__tests__/stream-status.test.ts`.

Reword the comments that still describe Classic: `src/composables/useZoneControls.ts:99`, `src/composables/useEscapeToClose.ts:8-10`, `src/utils/zone-volume.ts:7-8`, `src/components/simple/SimpleZoneView.vue:28` and `:129`. Keep what each comment explains; drop the Classic reference.

Run: `grep -rnEi "viewMode|ZoneGrid|VolumeControl\b|ZoneControl\b|ZoneControlModal|getSourceAccent|getSourceHue|canChangeView|averageGroupVolume|classic|zone control" src`
Expected: no output. (`getVolumeControlMode` and similar settings names do not match this pattern and must stay.)

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: PASS, every test file green.

- [ ] **Step 4: Run the full build**

Run: `pnpm run build`
Expected: succeeds (type-check + Vite build).

- [ ] **Step 5: Full visual QA pass**

`pnpm run dev`, using a mock or real Snapcast server with a mix of playing/idle/muted/offline-client/empty-zone/multi-speaker/long-name zones:

- Desktop, light theme: zone cards, toolbar, every modal (group settings, client details, client settings, create group, filter groups, app settings, server info), connection panel (disconnect to see it), setup passcode + unlock (enable auth to see them), toasts, loading spinner.
- Desktop, dark theme: same full pass.
- Mobile width (375px) and a ~768px tablet width, both themes: confirm every modal renders as a bottom sheet with a drag handle and no clipped content, the toolbar's overflow menu works, touch targets are comfortably sized.
- Confirm no gray/white/slate literal classes visibly clash with the token system in either theme (no leftover-pure-white card on a near-black page, no light-mode-only unstyled patch).

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "$(cat <<'EOF'
refactor: delete Classic UI files (ZoneGrid, VolumeControl, ZoneControlModal)

Simple UI is now the app's only interface. Feature-parity audit (done
during planning) confirmed Simple already covered every Classic
capability before this redesign started.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 22: Classic parity fixes

Run this after Task 15 and before Task 16. Reading `ZoneGrid.vue` and `ZoneControlModal.vue` found two things Classic has that Simple lacks.

**Files:**
- Modify: `src/composables/useZoneControls.ts`
- Modify: `src/composables/__tests__/use-zone-controls.test.ts`
- Modify: `src/components/simple/SimpleZoneCard.vue`
- Modify: `src/components/simple/SimpleVolumeSlider.vue`

**Interfaces:**
- Consumes: `useZoneControls` from Task 2.
- Produces: `useZoneControls(group).zoneVolume` (`ComputedRef<number>`): the average of the linked speakers, or of every allowed speaker when none are linked.

- [ ] **Step 1: Write the failing test**

Append to `src/composables/__tests__/use-zone-controls.test.ts`, adding `import { useSettingsStore } from "@/stores/settings";` and `import type { Client } from "@/stores/snapcast";` to the imports:

```ts
function makeClient(id: string, percent: number): Client {
  return {
    id,
    config: { name: id, volume: { muted: false, percent } },
    host: { name: id },
  } as Client;
}

describe("useZoneControls zoneVolume", () => {
  const clients = [makeClient("c1", 20), makeClient("c2", 60)];

  it("averages every speaker when none are linked", () => {
    const zone = useZoneControls(() => makeGroup({ clients }));

    expect(zone.zoneVolume.value).toBe(40);
  });

  it("averages only the linked speakers when some are linked", () => {
    useSettingsStore().setGroupVolumeLinks("g1", ["c2"], {});
    const zone = useZoneControls(() => makeGroup({ clients }));

    expect(zone.zoneVolume.value).toBe(60);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/composables/__tests__/use-zone-controls.test.ts`
Expected: FAIL, `zone.zoneVolume` is undefined.

- [ ] **Step 3: Add `zoneVolume`**

In `src/composables/useZoneControls.ts`, after the `masterVolume` computed, add:

```ts
  const zoneVolume = computed(() =>
    averageClientVolume(hasMasterVolume.value ? linkedClients.value : speakers.value)
  );
```

Add `zoneVolume,` to the returned object after `masterVolume,`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/composables/__tests__/use-zone-controls.test.ts`
Expected: PASS.

- [ ] **Step 5: Show the volume on every zone card**

In `src/components/simple/SimpleZoneCard.vue`'s volume row: remove `v-if="zone.hasMasterVolume.value"` from the outer `<span>`, change both `zone.masterVolume.value` references to `zone.zoneVolume.value`, and delete the `<span v-else ...>Volume &amp; speakers</span>` fallback. Keep the `sr-only` label.

- [ ] **Step 6: Keep the master −/+ buttons on phones**

In `src/components/simple/SimpleVolumeSlider.vue`, change `'w-11 h-11 max-sm:hidden'` to `'w-11 h-11'` on both buttons.

- [ ] **Step 7: Run tests and build, then commit**

Run: `pnpm test && pnpm run build`
Expected: both succeed.

```bash
git add src/composables/useZoneControls.ts src/composables/__tests__/use-zone-controls.test.ts src/components/simple/SimpleZoneCard.vue src/components/simple/SimpleVolumeSlider.vue
git commit -m "fix: show zone volume on every card, keep master volume buttons on phones"
```
