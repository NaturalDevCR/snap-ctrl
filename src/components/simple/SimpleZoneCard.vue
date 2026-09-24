<script setup lang="ts">
import { ref, computed } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import { getGroupDisplayName } from "@/utils/group-name";
import { getStreamName } from "@/utils/stream-name";
import { getStreamStatus } from "@/utils/stream-status";
import { getSourceAccent, getSourceHue, getSourceIcon } from "@/utils/source-style";
import {
  averageClientVolume,
  resolveZoneVolumeTargets,
  snapshotVolumes,
} from "@/utils/zone-volume";
import SimpleVolumeSlider from "@/components/simple/SimpleVolumeSlider.vue";
import Tooltip from "@/components/Tooltip.vue";
import type { Client, Group } from "@/stores/snapcast";

const props = defineProps<{ group: Group }>();

const emit = defineEmits<{
  (e: "group-settings", group: Group): void;
}>();

const snapcast = useSnapcastStore();
const settings = useSettingsStore();
const auth = useAuthStore();

const showSpeakers = ref(false);

// ---- Permissions -----------------------------------------------------------
const canAdjustVolume = computed(() => auth.hasFeaturePermission("canAdjustVolumes"));
const canSelectStream = computed(() => auth.hasFeaturePermission("canSelectStream"));
const canLinkClients = computed(() => auth.hasFeaturePermission("canLinkClients"));

// ---- Zone / source ---------------------------------------------------------
const zoneName = computed(() => getGroupDisplayName(props.group, snapcast.streams));

type PlayState = "playing" | "idle" | "unavailable";

function playStateOf(streamId: string): PlayState {
  const status = getStreamStatus(snapcast.streams, streamId).toLowerCase();
  if (status === "playing" || status === "kplaying") return "playing";
  if (status === "idle" || status === "kidle") return "idle";
  return "unavailable";
}

const playState = computed(() => playStateOf(props.group.stream_id));

const currentStream = computed(() =>
  snapcast.streams.find((s) => s.id === props.group.stream_id)
);
const currentSourceName = computed(() => getStreamName(currentStream.value));
const currentSourceIcon = computed(() => getSourceIcon(currentStream.value));

// Each source gets a stable accent hue; the card, its tile, the selected
// chip and the volume fill all take on the color of what's playing.
const hue = computed(() => getSourceHue(currentStream.value));
const palette = computed(() => getSourceAccent(hue.value));
const accent = computed(() => (props.group.muted ? "#ef4444" : palette.value.main));
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

const statusLabel = computed(() => {
  if (playState.value === "playing") return "Playing";
  if (playState.value === "idle") return "Paused";
  return "Unavailable";
});

function selectSource(streamId: string) {
  if (!canSelectStream.value || streamId === props.group.stream_id) return;
  snapcast.setGroupStream(props.group.id, streamId);
}

function onSourceKeydown(event: KeyboardEvent, index: number) {
  // Arrow-key roving between chips, like a native radio group.
  const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  const dir = keys[event.key];
  if (!dir) return;
  event.preventDefault();
  const list = sources.value;
  const next = list[(index + dir + list.length) % list.length];
  if (!next) return;
  selectSource(next.id);
  const container = (event.currentTarget as HTMLElement).parentElement;
  const buttons = container?.querySelectorAll<HTMLButtonElement>("button[role=radio]");
  buttons?.[(index + dir + list.length) % list.length]?.focus();
}

// ---- Volume ----------------------------------------------------------------
const speakers = computed<Client[]>(() =>
  auth.filterAllowedEntities("client", props.group.clients)
);

const linkedIds = computed(
  () => settings.groupVolumeLinks[props.group.id]?.linkedClientIds ?? []
);

const targets = computed(() =>
  resolveZoneVolumeTargets(props.group, linkedIds.value, (id) =>
    auth.isEntityAllowed("client", id)
  )
);

const zoneVolume = computed(() => averageClientVolume(targets.value.clients));
const exponent = computed(() => settings.getVolumeExponent(props.group.id));

const linkedCount = computed(
  () => speakers.value.filter((c) => linkedIds.value.includes(c.id)).length
);

const volumeCaption = computed(() => {
  if (!canAdjustVolume.value) return "Volume changes are disabled on this device";
  const n = targets.value.clients.length;
  if (targets.value.usesLinks) {
    return `Moves ${n} linked speaker${n === 1 ? "" : "s"} together`;
  }
  if (n <= 1) return "";
  return `Moves all ${n} speakers together`;
});

// Baseline captured at the start of an unlinked drag, so speakers keep
// their relative offsets for the whole gesture even when one of them
// bottoms out at 0 or tops out at 100 along the way.
let dragBaseline: Record<string, number> | null = null;

function setZoneVolume(value: number) {
  if (!canAdjustVolume.value) return;
  const { clients, usesLinks } = targets.value;
  if (clients.length === 0) return;

  let baseline: Record<string, number>;
  if (usesLinks) {
    // Same baseline the classic Zone Control master slider uses.
    baseline = settings.groupVolumeLinks[props.group.id]?.referenceVolumes ?? {};
  } else {
    dragBaseline ??= snapshotVolumes(clients);
    baseline = dragBaseline;
  }

  snapcast.setGroupVolumeProportional(
    props.group.id,
    value,
    clients.map((c) => c.id),
    baseline
  );
}

function endZoneGesture() {
  dragBaseline = null;
}

function toggleZoneMute() {
  if (!canAdjustVolume.value) return;
  snapcast.setGroupMute(props.group.id, !props.group.muted);
}

function setSpeakerVolume(client: Client, value: number) {
  dragBaseline = null;
  snapcast.setClientVolume(client.id, value, client.config.volume.muted);
}

function toggleSpeakerMute(client: Client) {
  snapcast.setClientVolume(
    client.id,
    client.config.volume.percent,
    !client.config.volume.muted
  );
}

// ---- Linking ---------------------------------------------------------------
function isLinked(client: Client) {
  return linkedIds.value.includes(client.id);
}

function toggleLink(client: Client) {
  if (!canLinkClients.value) return;
  const inGroup = new Set(props.group.clients.map((c) => c.id));
  const current = linkedIds.value.filter((id) => inGroup.has(id));
  const next = current.includes(client.id)
    ? current.filter((id) => id !== client.id)
    : [...current, client.id];

  // Re-baseline every linked speaker at its current volume, exactly like
  // saving the Linked checkboxes in Group Settings does.
  const referenceVolumes: Record<string, number> = {};
  for (const c of props.group.clients) {
    if (next.includes(c.id)) referenceVolumes[c.id] = c.config.volume.percent;
  }
  settings.setGroupVolumeLinks(props.group.id, next, referenceVolumes);
  dragBaseline = null;
}

function speakerName(client: Client) {
  return client.config.name || client.host.name;
}
</script>

<template>
  <article
    class="zone-card group/card relative flex flex-col rounded-3xl border bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
    :class="[
      group.muted
        ? 'border-red-200 dark:border-red-900/50'
        : 'border-gray-200/80 dark:border-gray-800',
      { 'is-playing': playState === 'playing' && !group.muted },
    ]"
    :style="accentStyle"
    :aria-label="zoneName"
  >
    <!-- Ambient glow in the source's color; it gently "breathes" while
         audio is playing and fades out when paused or muted. -->
    <div class="zone-glow" aria-hidden="true"></div>

    <div class="relative p-5 sm:p-6 flex flex-col gap-5">
      <!-- Header -->
      <header class="flex items-start gap-4">
        <div
          class="zone-tile relative w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-lg transition-all duration-500"
          :class="{ 'is-muted': group.muted, 'is-idle': playState !== 'playing' }"
          aria-hidden="true"
        >
          <Transition name="swap" mode="out-in">
            <span v-if="group.muted" key="muted" class="mdi mdi-volume-off text-3xl"></span>
            <span v-else-if="playState === 'playing'" key="eq" class="eq">
              <span></span><span></span><span></span><span></span>
            </span>
            <span v-else :key="currentSourceIcon" class="mdi text-3xl" :class="currentSourceIcon"></span>
          </Transition>
          <span
            v-if="playState === 'playing' && !group.muted"
            class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow"
          >
            <span class="mdi text-sm zone-accent-text" :class="currentSourceIcon"></span>
          </span>
        </div>

        <div class="flex-1 min-w-0 pt-1">
          <div class="flex items-center gap-2 min-w-0">
            <h3
              class="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate"
              :title="zoneName"
            >
              {{ zoneName }}
            </h3>
            <Transition name="pop">
              <span
                v-if="group.muted"
                class="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              >
                Muted
              </span>
            </Transition>
          </div>
          <p class="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 min-w-0">
            <span class="relative flex w-2 h-2 shrink-0" aria-hidden="true">
              <span
                v-if="playState === 'playing'"
                class="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"
              ></span>
              <span
                class="relative inline-flex w-2 h-2 rounded-full"
                :class="{
                  'bg-green-500': playState === 'playing',
                  'bg-amber-400': playState === 'idle',
                  'bg-red-500': playState === 'unavailable',
                }"
              ></span>
            </span>
            <span class="shrink-0">{{ statusLabel }}</span>
            <span aria-hidden="true">·</span>
            <Transition name="slide-fade" mode="out-in">
              <span
                :key="group.stream_id"
                class="truncate font-semibold text-slate-700 dark:text-slate-200"
              >{{ currentSourceName }}</span>
            </Transition>
          </p>
        </div>

        <Tooltip v-if="auth.permissions.showGroupSettings" text="Zone settings">
          <button
            type="button"
            class="w-10 h-10 -mr-2 -mt-1 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:rotate-90 active:scale-90 transition-all duration-300"
            @click="emit('group-settings', group)"
          >
            <span class="mdi mdi-cog-outline text-2xl"></span>
          </button>
        </Tooltip>
      </header>

      <!-- Source picker -->
      <section v-if="sources.length > 0">
        <h4
          :id="`src-label-${group.id}`"
          class="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500"
        >
          Listening to
        </h4>

        <div
          v-if="canSelectStream"
          role="radiogroup"
          :aria-labelledby="`src-label-${group.id}`"
          class="flex flex-wrap gap-2"
        >
          <button
            v-for="(source, index) in sources"
            :key="source.id"
            type="button"
            role="radio"
            :aria-checked="source.id === group.stream_id"
            :tabindex="
              source.id === group.stream_id ||
              (index === 0 && !sources.some((s) => s.id === group.stream_id))
                ? 0
                : -1
            "
            class="source-chip relative inline-flex items-center gap-2 max-w-full pl-1.5 pr-4 py-1.5 rounded-full border text-sm font-medium transition-all duration-300 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            :class="
              source.id === group.stream_id
                ? 'is-selected border-transparent text-white'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:-translate-y-px'
            "
            :style="{ '--chip': source.accent.main, '--chip-2': source.accent.deep }"
            @click="selectSource(source.id)"
            @keydown="onSourceKeydown($event, index)"
          >
            <span
              class="relative w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300"
              :class="source.id === group.stream_id ? 'bg-white/20' : 'chip-icon'"
              aria-hidden="true"
            >
              <span class="mdi text-base" :class="source.icon"></span>
              <span
                v-if="source.state === 'playing' && source.id !== group.stream_id"
                class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-slate-800"
              ></span>
            </span>
            <span class="truncate">{{ source.name }}</span>
            <Transition name="pop">
              <span
                v-if="source.id === group.stream_id"
                class="mdi mdi-check text-base -mr-1"
                aria-hidden="true"
              ></span>
            </Transition>
          </button>
        </div>

        <div
          v-else
          class="inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          <span class="w-7 h-7 rounded-full flex items-center justify-center chip-icon" aria-hidden="true">
            <span class="mdi text-base" :class="currentSourceIcon"></span>
          </span>
          <span class="truncate">{{ currentSourceName }}</span>
          <span class="mdi mdi-lock-outline text-slate-400" aria-hidden="true"></span>
          <span class="sr-only">(changing the source is disabled)</span>
        </div>
      </section>

      <!-- Zone volume -->
      <section v-if="speakers.length > 0" class="flex flex-col gap-1.5">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="mute-btn w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl border transition-all duration-300 active:scale-90 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
            :class="
              group.muted
                ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            "
            :disabled="!canAdjustVolume"
            :aria-pressed="group.muted"
            :aria-label="group.muted ? `Unmute ${zoneName}` : `Mute ${zoneName}`"
            @click="toggleZoneMute"
          >
            <Transition name="swap" mode="out-in">
              <span
                :key="group.muted ? 'off' : 'on'"
                class="mdi text-2xl"
                :class="group.muted ? 'mdi-volume-off' : 'mdi-volume-high'"
              ></span>
            </Transition>
          </button>

          <SimpleVolumeSlider
            class="flex-1 min-w-0"
            :volume="zoneVolume"
            :muted="group.muted"
            :label="`${zoneName} volume`"
            :exponent="exponent"
            :step="settings.volumeStep"
            :disabled="!canAdjustVolume"
            :accent="accent"
            @update:volume="setZoneVolume"
            @commit="endZoneGesture"
          />
        </div>
        <p
          v-if="volumeCaption"
          class="pl-[3.75rem] text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1"
        >
          <span
            v-if="!canAdjustVolume"
            class="mdi mdi-lock-outline"
            aria-hidden="true"
          ></span>
          <span
            v-else-if="targets.usesLinks"
            class="mdi mdi-link-variant"
            aria-hidden="true"
          ></span>
          {{ volumeCaption }}
        </p>
      </section>

      <p
        v-else
        class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
      >
        <span class="mdi mdi-speaker-off text-lg" aria-hidden="true"></span>
        No speakers in this zone yet.
      </p>
    </div>

    <!-- Speakers (expandable) -->
    <template v-if="speakers.length > 0">
      <button
        type="button"
        class="relative flex items-center gap-2 px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        :aria-expanded="showSpeakers"
        :aria-controls="`speakers-${group.id}`"
        @click="showSpeakers = !showSpeakers"
      >
        <span class="flex -space-x-1.5" aria-hidden="true">
          <span
            v-for="c in speakers.slice(0, 3)"
            :key="c.id"
            class="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold uppercase"
            :class="c.connected ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'"
          >{{ speakerName(c).charAt(0) }}</span>
        </span>
        <span>
          {{ speakers.length }} speaker{{ speakers.length === 1 ? "" : "s" }}
        </span>
        <Transition name="pop">
          <span
            v-if="linkedCount > 0"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold zone-accent-badge"
          >
            <span class="mdi mdi-link-variant" aria-hidden="true"></span>
            {{ linkedCount }} linked
          </span>
        </Transition>
        <span
          class="ml-auto mdi mdi-chevron-down text-xl text-slate-400 transition-transform duration-300"
          :class="{ 'rotate-180': showSpeakers }"
          aria-hidden="true"
        ></span>
      </button>

      <!-- grid-rows 0fr → 1fr animates to the content's real height -->
      <div
        :id="`speakers-${group.id}`"
        class="grid transition-[grid-template-rows] duration-300 ease-out"
        :class="showSpeakers ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
        :inert="!showSpeakers"
      >
        <div class="overflow-hidden">
          <div
            class="px-5 sm:px-6 pb-4 flex flex-col bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800"
          >
            <p
              v-if="canLinkClients && speakers.length > 1"
              class="pt-4 pb-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed"
            >
              <span class="mdi mdi-lightbulb-on-outline" aria-hidden="true"></span>
              Link speakers to move them together with the zone volume. With
              none linked, the zone volume moves every speaker.
            </p>

            <div
              v-for="(client, i) in speakers"
              :key="client.id"
              class="speaker-row py-3 flex flex-col gap-1 border-b last:border-0 border-slate-200/70 dark:border-slate-800"
              :class="[{ 'opacity-60': !client.connected }, { 'is-open': showSpeakers }]"
              :style="{ '--i': i }"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  :class="client.connected ? 'bg-green-500' : 'bg-slate-400 dark:bg-slate-600'"
                  aria-hidden="true"
                ></span>
                <span class="flex-1 min-w-0 truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {{ speakerName(client) }}
                </span>
                <span
                  v-if="!client.connected"
                  class="shrink-0 px-1.5 py-0.5 rounded text-[11px] bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                >
                  Offline
                </span>

                <button
                  v-if="canLinkClients && speakers.length > 1"
                  type="button"
                  class="shrink-0 h-9 px-3 inline-flex items-center gap-1.5 rounded-full border text-xs font-semibold transition-all duration-300 active:scale-90"
                  :class="
                    isLinked(client)
                      ? 'link-on border-transparent text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  "
                  :aria-pressed="isLinked(client)"
                  :aria-label="`Link ${speakerName(client)} to zone volume`"
                  @click="toggleLink(client)"
                >
                  <Transition name="swap" mode="out-in">
                    <span
                      :key="isLinked(client) ? 'on' : 'off'"
                      class="mdi"
                      :class="isLinked(client) ? 'mdi-link-variant' : 'mdi-link-variant-off'"
                      aria-hidden="true"
                    ></span>
                  </Transition>
                  {{ isLinked(client) ? "Linked" : "Link" }}
                </button>

                <button
                  type="button"
                  class="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border transition-all duration-300 active:scale-90 disabled:cursor-not-allowed disabled:opacity-60"
                  :class="
                    client.config.volume.muted
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  "
                  :disabled="!canAdjustVolume"
                  :aria-pressed="client.config.volume.muted"
                  :aria-label="
                    client.config.volume.muted
                      ? `Unmute ${speakerName(client)}`
                      : `Mute ${speakerName(client)}`
                  "
                  @click="toggleSpeakerMute(client)"
                >
                  <span
                    class="mdi text-lg"
                    :class="client.config.volume.muted ? 'mdi-volume-off' : 'mdi-volume-high'"
                  ></span>
                </button>
              </div>

              <SimpleVolumeSlider
                size="md"
                :volume="client.config.volume.percent"
                :muted="client.config.volume.muted || group.muted"
                :label="`${speakerName(client)} volume`"
                :exponent="exponent"
                :step="settings.volumeStep"
                :disabled="!canAdjustVolume"
                :accent="accent"
                @update:volume="setSpeakerVolume(client, $event)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </article>
</template>

<style scoped>
/* ---- Accent-driven pieces (--accent / --accent-2 set per card) -------- */
.zone-tile {
  background-image: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: 0 10px 24px -8px var(--accent);
}
.zone-tile.is-idle {
  filter: saturate(0.55);
  box-shadow: 0 6px 16px -10px var(--accent);
}
.zone-tile.is-muted {
  background-image: linear-gradient(135deg, #f87171, #dc2626);
  box-shadow: 0 10px 24px -10px #ef4444;
  filter: none;
}
.zone-accent-text {
  color: var(--accent);
}
.zone-accent-badge {
  color: var(--accent);
  background: var(--accent-soft);
}
.chip-icon {
  color: var(--chip);
  background: color-mix(in srgb, var(--chip) 14%, transparent);
}
.source-chip.is-selected {
  background-image: linear-gradient(135deg, var(--chip), var(--chip-2));
  box-shadow: 0 8px 20px -8px var(--chip);
}
.link-on {
  background-image: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: 0 6px 14px -8px var(--accent);
}

/* ---- Ambient glow ----------------------------------------------------- */
.zone-glow {
  position: absolute;
  top: -40%;
  left: -20%;
  width: 90%;
  height: 90%;
  border-radius: 9999px;
  background: radial-gradient(circle, var(--accent-soft) 0%, transparent 70%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 700ms ease;
}
.zone-card.is-playing .zone-glow {
  opacity: 1;
  animation: breathe 6s ease-in-out infinite;
}
@keyframes breathe {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(12%, 8%) scale(1.15);
  }
}

/* ---- Equalizer shown on the tile while playing ------------------------ */
.eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 3px;
  height: 24px;
}
.eq span {
  width: 4px;
  height: 100%;
  border-radius: 2px;
  background: currentColor;
  transform-origin: bottom;
  animation: eq-bounce 1s ease-in-out infinite;
}
.eq span:nth-child(2) {
  animation-delay: -0.35s;
  animation-duration: 0.8s;
}
.eq span:nth-child(3) {
  animation-delay: -0.7s;
  animation-duration: 1.2s;
}
.eq span:nth-child(4) {
  animation-delay: -0.15s;
  animation-duration: 0.9s;
}
@keyframes eq-bounce {
  0%,
  100% {
    transform: scaleY(0.25);
  }
  50% {
    transform: scaleY(1);
  }
}

/* ---- Speaker rows cascade in when the panel opens --------------------- */
.speaker-row {
  opacity: 0;
  transform: translateY(-6px);
  transition:
    opacity 250ms ease,
    transform 250ms ease;
}
.speaker-row.is-open {
  opacity: 1;
  transform: none;
  transition-delay: calc(var(--i) * 45ms + 80ms);
}
.speaker-row.is-open.opacity-60 {
  opacity: 0.6;
}

/* ---- Small reusable transitions --------------------------------------- */
.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}
.swap-enter-from {
  opacity: 0;
  transform: scale(0.6) rotate(-20deg);
}
.swap-leave-to {
  opacity: 0;
  transform: scale(0.6) rotate(20deg);
}

.pop-enter-active {
  transition:
    opacity 200ms ease,
    transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pop-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .eq span {
    animation: none;
    transform: scaleY(0.6);
  }
  .zone-card.is-playing .zone-glow {
    animation: none;
  }
}
</style>
