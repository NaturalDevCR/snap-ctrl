# Source clarity, change confirmation, volume access, zoom lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a zone's playing source visually obvious on its card, require confirmation before switching a zone's source, label the volume-summary row as a navigation affordance, disable pinch/double-tap zoom, and default the volume nudge step to 1.

**Architecture:** Five independent, additive edits inside the existing Simple UI (`src/components/simple/*`), the settings store, and `index.html`/`main.css`. No new components except one small confirm dialog built on the existing `AppDialog.vue`. No store shape changes beyond one default value.

**Tech Stack:** Vue 3 `<script setup>`, Pinia, Tailwind utility classes + CSS custom properties, Vitest (raw `createApp`/`h` mounting, no Vue Test Utils).

## Global Constraints

- Follow existing component conventions: `<script setup lang="ts">`, props/emits via `defineProps`/`defineEmits` generics, Tailwind classes with `var(--token)` colors, no new UI libraries.
- Tests mount components the way existing tests in `src/components/simple/__tests__/` do: `createApp` + `h`, or `createApp(Component)` with a real Pinia instance (`createPinia()` / `setActivePinia`), never Vue Test Utils.
- No `window.confirm` — the new confirm dialog reuses `AppDialog.vue`.
- Design spec: `docs/superpowers/specs/2026-11-15-source-clarity-volume-zoom-design.md`.

---

### Task 1: Volume step default → 1

**Files:**
- Modify: `src/stores/settings.ts:21`
- Test: `src/stores/__tests__/settings.test.ts` (create — no existing dedicated settings test file; `upgrade-path.test.ts` only covers migration)

**Interfaces:**
- Produces: `useSettingsStore().volumeStep` now starts at `1` instead of `5` for a store with no persisted state.

- [ ] **Step 1: Write the failing test**

Create `src/stores/__tests__/settings.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSettingsStore } from "@/stores/settings";

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe("settings store defaults", () => {
  it("defaults volumeStep to 1 for a fresh install", () => {
    expect(useSettingsStore().volumeStep).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/__tests__/settings.test.ts`
Expected: FAIL — `expect(received).toBe(expected)` with `received: 5`.

- [ ] **Step 3: Write minimal implementation**

In `src/stores/settings.ts`, change line 21:

```ts
    const volumeStep = ref(1);
```

(was `ref(5)`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/__tests__/settings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/settings.ts src/stores/__tests__/settings.test.ts
git commit -m "feat: default volume nudge step to 1%"
```

---

### Task 2: Disable pinch/double-tap zoom

**Files:**
- Modify: `index.html:10`
- Modify: `src/assets/main.css`

**Interfaces:**
- None (no JS/TS interface — markup/CSS only). No automated test: jsdom (Vitest's environment) does not implement touch-action or real pinch-zoom, so this is verified manually per Task 2 Step 3.

- [ ] **Step 1: Update the viewport meta tag**

In `index.html`, change line 10 from:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

to:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

- [ ] **Step 2: Block double-tap zoom via CSS**

Open `src/assets/main.css` and find the top-level `html, body` (or `:root`/`body`) rule block. Add (creating the rule if none of `html`/`body` currently has a bare selector):

```css
html,
body {
  touch-action: manipulation;
}
```

Place it near the top of the file, alongside other global resets (if the file already has an `html, body { ... }` rule, add the `touch-action` declaration into that existing rule instead of creating a duplicate one).

- [ ] **Step 3: Manually verify**

Run: `npm run dev` (or the project's existing dev script), open the app in a touch-emulated browser viewport (e.g. Chrome DevTools device toolbar), and confirm pinch-to-zoom and double-tap-to-zoom no longer scale the page.

- [ ] **Step 4: Commit**

```bash
git add index.html src/assets/main.css
git commit -m "fix: disable pinch and double-tap zoom"
```

---

### Task 3: Zone card source row reflects zone play state

**Files:**
- Modify: `src/components/simple/SimpleSourceButton.vue`
- Test: `src/components/simple/__tests__/simple-source-button.test.ts` (create)

**Interfaces:**
- Consumes: `useZoneControls(group).playAccent` — **not currently exported** from `useZoneControls` (`src/composables/useZoneControls.ts`); it is a local `computed` used only inside the composable (line 69-73). This task exports it.
- Consumes: `useZoneControls(group).playState` (already exported) — `Ref<"playing" | "idle" | "unavailable">`.
- Produces: no new exports from `SimpleSourceButton.vue` (it's a leaf component, no emits/props change).

- [ ] **Step 1: Export `playAccent` from the composable**

In `src/composables/useZoneControls.ts`, add `playAccent` to the returned object (after `statusLabel`, alongside the other zone/source fields — around line 205):

```ts
    statusLabel,
    playAccent,
    currentSourceName,
```

(Only the returned object changes — `playAccent` itself already exists as a computed at lines 69-73, unchanged.)

- [ ] **Step 2: Write the failing test**

Create `src/components/simple/__tests__/simple-source-button.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, h, type App } from "vue";
import { createPinia, setActivePinia } from "pinia";
import SimpleSourceButton from "@/components/simple/SimpleSourceButton.vue";
import { useSnapcastStore } from "@/stores/snapcast";
import type { Group } from "@/stores/snapcast";

let app: App;
let host: HTMLElement;

function baseGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "g1",
    name: "Aracari",
    stream_id: "s1",
    clients: [],
    muted: false,
    ...overrides,
  };
}

function mount(group: Group) {
  host = document.createElement("div");
  document.body.appendChild(host);
  app = createApp({ render: () => h(SimpleSourceButton, { group }) });
  app.use(createPinia());
  app.mount(host);
}

function iconTile() {
  return host.querySelector<HTMLElement>("span.sv-accent-tile, span[aria-hidden='true']")!;
}

beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(() => {
  app?.unmount();
  document.body.innerHTML = "";
});

describe("SimpleSourceButton play-state styling", () => {
  it("applies the playing accent style when the zone's stream is playing", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams = [{ id: "s1", uri: "spotify:x", status: "playing" }];
    mount(baseGroup());

    expect(iconTile().getAttribute("style") ?? "").toContain("--accent");
  });

  it("applies the idle accent style when the zone's stream is idle", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams = [{ id: "s1", uri: "spotify:x", status: "idle" }];
    mount(baseGroup());

    expect(iconTile().getAttribute("style") ?? "").toContain("--accent");
  });
});
```

Note: this test only asserts the style attribute carries an `--accent` custom property (proving the binding exists); it does not assert the exact color value, since that depends on the CSS token names chosen in Step 3.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/simple/__tests__/simple-source-button.test.ts`
Expected: FAIL — the icon `<span>` has no `style` attribute yet (`toContain` fails on empty string).

- [ ] **Step 4: Write minimal implementation**

In `src/components/simple/SimpleSourceButton.vue`, change the icon tile `<span>` (currently):

```html
    <span
      class="w-11 h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] flex items-center justify-center shrink-0 transition-all duration-500"
      aria-hidden="true"
    >
```

to:

```html
    <span
      class="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-500"
      :class="
        zone.playState.value === 'playing'
          ? 'border-transparent text-white shadow-md'
          : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)]'
      "
      :style="zone.playState.value === 'playing' ? { background: zone.playAccent.value.main } : undefined"
      aria-hidden="true"
    >
```

And add `aria-hidden="true"` test selector by keeping the attribute as-is (the test's `iconTile()` selector matches either `.sv-accent-tile` or any `span[aria-hidden='true']`; no class rename is required, but confirm this is the **first** such span in the template so the query resolves to it — it is, since it precedes the name/subtitle spans).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/simple/__tests__/simple-source-button.test.ts`
Expected: PASS for the "playing" case. The "idle" case passes too since idle renders no inline `style` at all — **fix the test** before moving on: change the idle assertion to:

```ts
  it("does not force the playing accent style when the zone's stream is idle", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams = [{ id: "s1", uri: "spotify:x", status: "idle" }];
    mount(baseGroup());

    expect(iconTile().getAttribute("style")).toBeNull();
  });
```

Re-run: `npx vitest run src/components/simple/__tests__/simple-source-button.test.ts`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add src/composables/useZoneControls.ts src/components/simple/SimpleSourceButton.vue src/components/simple/__tests__/simple-source-button.test.ts
git commit -m "feat: tint zone card source icon by the zone's play state"
```

---

### Task 4: Confirm dialog before switching a zone's source

**Files:**
- Modify: `src/components/simple/SimpleSourceButton.vue`
- Test: `src/components/simple/__tests__/simple-source-button.test.ts` (append to file from Task 3)

**Interfaces:**
- Consumes: `AppDialog.vue` props `{ open: boolean; title: string; titleIcon?: string; size?: "sm"|"md"|"lg" }`, emits `close`, default slot for body, `footer` named slot (from `src/components/AppDialog.vue`, already defined, unchanged).
- Consumes: `zone.selectSource(streamId: string): void` and `zone.sources.value: { id: string; name: string; icon: string; state: ... }[]` (both already returned by `useZoneControls`, unchanged).
- Consumes: `SimpleSourcePicker.vue` emits `select(id: string)` (unchanged, already consumed).

- [ ] **Step 1: Write the failing test**

Append to `src/components/simple/__tests__/simple-source-button.test.ts`:

```ts
function sourceButton() {
  return host.querySelector<HTMLButtonElement>("button")!;
}

function confirmDialog() {
  return document.querySelector<HTMLElement>('[role="dialog"][aria-label*="Change"]');
}

describe("SimpleSourceButton change confirmation", () => {
  beforeEach(() => {
    const snapcast = useSnapcastStore();
    snapcast.streams = [
      { id: "s1", uri: "spotify:x", status: "playing" },
      { id: "s2", uri: "radio:y", status: "idle" },
    ];
  });

  it("opens a confirm dialog instead of switching immediately", async () => {
    const snapcast = useSnapcastStore();
    const spy = vi.spyOn(snapcast, "setGroupStream");
    mount(baseGroup());

    sourceButton().click();
    await nextTick();
    host.ownerDocument
      .querySelectorAll<HTMLButtonElement>('[role="option"]')[1]
      .click();
    await nextTick();

    expect(spy).not.toHaveBeenCalled();
    expect(confirmDialog()).not.toBeNull();
  });

  it("switches the source once the user confirms", async () => {
    const snapcast = useSnapcastStore();
    const spy = vi.spyOn(snapcast, "setGroupStream");
    mount(baseGroup());

    sourceButton().click();
    await nextTick();
    document.querySelectorAll<HTMLButtonElement>('[role="option"]')[1].click();
    await nextTick();
    confirmDialog()!
      .querySelectorAll("button")[confirmDialog()!.querySelectorAll("button").length - 1]
      .click();
    await nextTick();

    expect(spy).toHaveBeenCalledWith("g1", "s2");
  });

  it("does not switch if the user cancels", async () => {
    const snapcast = useSnapcastStore();
    const spy = vi.spyOn(snapcast, "setGroupStream");
    mount(baseGroup());

    sourceButton().click();
    await nextTick();
    document.querySelectorAll<HTMLButtonElement>('[role="option"]')[1].click();
    await nextTick();
    confirmDialog()!.querySelector<HTMLElement>("[aria-label='Close']")!.click();
    await nextTick();

    expect(spy).not.toHaveBeenCalled();
    expect(confirmDialog()).toBeNull();
  });
});
```

Add the missing imports at the top of the test file: `import { nextTick } from "vue";` (merge into the existing `vue` import) and `import { vi } from "vitest";` (merge into the existing `vitest` import).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/simple/__tests__/simple-source-button.test.ts`
Expected: FAIL — `setGroupStream` is called immediately (no confirm dialog exists yet), so the first test's `expect(spy).not.toHaveBeenCalled()` fails.

- [ ] **Step 3: Write minimal implementation**

In `src/components/simple/SimpleSourceButton.vue`, replace the `<script setup>` block with:

```ts
<script setup lang="ts">
import { ref, computed } from "vue";
import { useZoneControls } from "@/composables/useZoneControls";
import SimpleSourcePicker from "@/components/simple/SimpleSourcePicker.vue";
import AppDialog from "@/components/AppDialog.vue";
import type { Group } from "@/stores/snapcast";

const props = defineProps<{ group: Group }>();

const zone = useZoneControls(() => props.group);
const showPicker = ref(false);
const pendingSourceId = ref<string | null>(null);

const subtitle = computed(() => {
  if (!zone.canSelectStream.value) return "Changing the source is disabled";
  const n = zone.sources.value.length;
  if (n === 0) return "No sources available";
  if (!zone.canChangeSource.value) return "Only source available";
  return `${n} source${n === 1 ? "" : "s"} available`;
});

const pendingSourceName = computed(
  () => zone.sources.value.find((s) => s.id === pendingSourceId.value)?.name ?? ""
);

function requestSourceChange(id: string) {
  pendingSourceId.value = id;
}

function confirmSourceChange() {
  if (pendingSourceId.value) zone.selectSource(pendingSourceId.value);
  pendingSourceId.value = null;
}

function cancelSourceChange() {
  pendingSourceId.value = null;
}
</script>
```

Then replace the `<SimpleSourcePicker ... @select="zone.selectSource" .../>` element (currently the last block before `</template>`):

```html
  <SimpleSourcePicker
    v-if="zone.canChangeSource.value || showPicker"
    :open="showPicker"
    :zone-name="zone.zoneName.value"
    :sources="zone.sources.value"
    :current-id="group.stream_id"
    @select="requestSourceChange"
    @close="showPicker = false"
  />

  <AppDialog
    :open="pendingSourceId !== null"
    :title="`Change source?`"
    title-icon="mdi-swap-horizontal"
    size="sm"
    @close="cancelSourceChange"
  >
    <p class="text-sm text-[var(--text-secondary)]">
      Change <strong>{{ zone.zoneName.value }}</strong>'s source to
      <strong>{{ pendingSourceName }}</strong>? This replaces what's currently
      playing in this zone.
    </p>
    <template #footer>
      <div class="flex gap-2 w-full justify-end">
        <button
          type="button"
          class="h-11 px-4 rounded-full border border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
          @click="cancelSourceChange"
        >
          Cancel
        </button>
        <button
          type="button"
          class="h-11 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          @click="confirmSourceChange"
        >
          Change source
        </button>
      </div>
    </template>
  </AppDialog>
```

Note: `requestSourceChange` fires for the currently-selected id too if `SimpleSourcePicker`'s `choose()` were ever called with it, but the picker only lets the user click a different `role="option"` row to trigger a real change in practice — `zone.selectSource` itself still no-ops on a same-id call inside `useZoneControls` (existing guard, unchanged), so confirming a no-op change is harmless and this plan does not special-case it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/simple/__tests__/simple-source-button.test.ts`
Expected: PASS (all tests in the file, Task 3 and Task 4).

- [ ] **Step 5: Commit**

```bash
git add src/components/simple/SimpleSourceButton.vue src/components/simple/__tests__/simple-source-button.test.ts
git commit -m "feat: confirm before switching a zone's source"
```

---

### Task 5: Label the volume-summary row on the zone card

**Files:**
- Modify: `src/components/simple/SimpleZoneCard.vue:144-171`
- Test: `src/components/simple/__tests__/simple-zone-card.test.ts` (create)

**Interfaces:**
- Consumes: `useZoneControls` fields already used in this file (`zoneVolume`, `volumeFill`, `speakers`) — unchanged.
- No new props/emits.

- [ ] **Step 1: Write the failing test**

Create `src/components/simple/__tests__/simple-zone-card.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, h, type App } from "vue";
import { createPinia, setActivePinia } from "pinia";
import SimpleZoneCard from "@/components/simple/SimpleZoneCard.vue";
import { useSnapcastStore } from "@/stores/snapcast";
import type { Group, Client } from "@/stores/snapcast";

let app: App;
let host: HTMLElement;

function client(id: string): Client {
  return {
    id,
    name: id,
    host: { name: id, ip: "", mac: "", arch: "", os: "" },
    connected: true,
    config: { instance: 1, latency: 0, name: id, volume: { muted: false, percent: 50 } },
    snapclient: {} as Client["snapclient"],
  } as Client;
}

function baseGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "g1",
    name: "Aracari",
    stream_id: "s1",
    clients: [client("c1")],
    muted: false,
    ...overrides,
  };
}

function mount(group: Group) {
  host = document.createElement("div");
  document.body.appendChild(host);
  app = createApp({ render: () => h(SimpleZoneCard, { group }) });
  app.use(createPinia());
  app.mount(host);
}

beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(() => {
  app?.unmount();
  document.body.innerHTML = "";
});

describe("SimpleZoneCard volume row", () => {
  it("labels the volume-summary row as a navigation affordance", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams = [{ id: "s1", uri: "spotify:x", status: "idle" }];
    mount(baseGroup());

    expect(host.textContent).toContain("Volume & speakers");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/simple/__tests__/simple-zone-card.test.ts`
Expected: FAIL — "Volume & speakers" text not found.

- [ ] **Step 3: Write minimal implementation**

In `src/components/simple/SimpleZoneCard.vue`, inside the volume-summary `<button>` (lines 144-171), change the inner content span (currently just the progress bar + percentage):

```html
          <span class="flex-1 min-w-0 flex items-center gap-3">
            <span class="flex-1 h-1.5 rounded-full bg-[color-mix(in_srgb,var(--text-tertiary)_35%,transparent)] overflow-hidden" aria-hidden="true">
              <span
                class="block h-full rounded-full transition-all duration-300"
                :style="{
                  width: `${zone.zoneVolume.value}%`,
                  background: zone.volumeFill.value,
                }"
              ></span>
            </span>
            <span
              class="tabular-nums text-sm font-bold w-9 text-right"
              :class="group.muted ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-secondary)]'"
            >{{ zone.zoneVolume.value }}%</span>
          </span>
```

to:

```html
          <span class="flex-1 min-w-0 flex flex-col gap-1">
            <span class="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              Volume &amp; speakers
              <span
                class="tabular-nums text-sm font-bold"
                :class="group.muted ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-secondary)]'"
              >{{ zone.zoneVolume.value }}%</span>
            </span>
            <span class="w-full h-1.5 rounded-full bg-[color-mix(in_srgb,var(--text-tertiary)_35%,transparent)] overflow-hidden" aria-hidden="true">
              <span
                class="block h-full rounded-full transition-all duration-300"
                :style="{
                  width: `${zone.zoneVolume.value}%`,
                  background: zone.volumeFill.value,
                }"
              ></span>
            </span>
          </span>
```

(Moves the percentage next to the new label, and the progress bar below it; drops the now-redundant standalone percentage column since it's folded into the label line.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/simple/__tests__/simple-zone-card.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npx vitest run`
Expected: all tests PASS. If any existing test in `simple-zone-view.test.ts` or elsewhere asserted on the old volume-row markup/text, fix that assertion to match the new label (per the spec's Testing section).

- [ ] **Step 6: Commit**

```bash
git add src/components/simple/SimpleZoneCard.vue src/components/simple/__tests__/simple-zone-card.test.ts
git commit -m "feat: label the zone card's volume row as Volume & speakers"
```

---

## Final check

- [ ] **Run the full suite once more:** `npx vitest run` — all green.
- [ ] **Manual smoke test:** `npm run dev`, open a zone card, confirm: source icon tints while playing, picking a different source shows the confirm dialog and only applies on confirm, the volume row reads "Volume & speakers", the +/- buttons move 1% per tap, and pinch/double-tap zoom is disabled.
