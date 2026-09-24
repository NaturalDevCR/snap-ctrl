<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useZoneControls } from "@/composables/useZoneControls";
import { useEscapeToClose } from "@/composables/useEscapeToClose";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import SimpleVolumeSlider from "@/components/simple/SimpleVolumeSlider.vue";
import SimpleSourceButton from "@/components/simple/SimpleSourceButton.vue";
import Tooltip from "@/components/Tooltip.vue";
import type { Client, Group } from "@/stores/snapcast";

const props = defineProps<{
  open: boolean;
  group: Group;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "group-settings", group: Group): void;
  (e: "client-details", client: Client): void;
  (e: "client-settings", client: Client): void;
}>();

const zone = useZoneControls(() => props.group);
const panelRef = ref<HTMLElement | null>(null);
let returnFocusTo: HTMLElement | null = null;

function close() {
  emit("close");
}

useEscapeToClose(() => props.open, close);
useBodyScrollLock(() => props.open);

watch(
  () => props.open,
  async (open) => {
    if (open) {
      returnFocusTo = document.activeElement as HTMLElement | null;
      await nextTick();
      panelRef.value?.focus();
    } else {
      returnFocusTo?.focus?.();
      returnFocusTo = null;
    }
  }
);
</script>

<template>
  <Teleport to="body">
    <Transition name="sv-sheet" :duration="{ enter: 380, leave: 240 }">
      <div
        v-if="open"
        class="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4"
        :style="zone.accentStyle.value"
      >
        <div
          class="sv-sheet-backdrop absolute inset-0 bg-black/50 backdrop-blur-sm"
          aria-hidden="true"
          @click="close"
        ></div>

        <div
          ref="panelRef"
          role="dialog"
          aria-modal="true"
          :aria-label="`${zone.zoneName.value}: volume and speakers`"
          tabindex="-1"
          class="sv-sheet-panel relative w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden outline-none"
          :class="{ 'is-playing': zone.playState.value === 'playing' && !group.muted }"
        >
          <div class="sv-glow" aria-hidden="true"></div>

          <!-- Grab handle (mobile affordance) -->
          <div class="sm:hidden pt-2.5 flex justify-center relative" aria-hidden="true">
            <div class="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
          </div>

          <!-- Header -->
          <header class="relative px-5 pt-4 sm:pt-5 pb-4 flex items-start gap-3">
            <div
              class="sv-tile w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white transition-all duration-500"
              :class="{ 'is-muted': group.muted, 'is-idle': zone.playState.value !== 'playing' }"
              aria-hidden="true"
            >
              <Transition name="sv-swap" mode="out-in">
                <span v-if="group.muted" key="m" class="mdi mdi-volume-off text-2xl"></span>
                <span v-else-if="zone.playState.value === 'playing'" key="eq" class="sv-eq scale-90">
                  <span></span><span></span><span></span><span></span>
                </span>
                <span v-else key="i" class="mdi text-2xl" :class="zone.currentSourceIcon.value"></span>
              </Transition>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <h3 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  {{ zone.zoneName.value }}
                </h3>
                <Transition name="sv-pop">
                  <span
                    v-if="group.muted"
                    class="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  >
                    Muted
                  </span>
                </Transition>
              </div>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Volume &amp; speakers
              </p>
            </div>
            <Tooltip v-if="zone.showGroupSettings.value" text="Zone settings">
              <button
                type="button"
                class="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:rotate-90 active:scale-90 transition-all duration-300"
                @click="emit('group-settings', group)"
              >
                <span class="mdi mdi-cog-outline text-xl"></span>
              </button>
            </Tooltip>
            <button
              type="button"
              class="w-10 h-10 -mr-2 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all"
              aria-label="Close"
              @click="close"
            >
              <span class="mdi mdi-close text-xl"></span>
            </button>
          </header>

          <div class="relative flex-1 overflow-y-auto custom-scrollbar px-5 pb-6 flex flex-col gap-5">
            <div class="sv-cascade" style="--i: 0">
              <SimpleSourceButton :group="group" />
            </div>

            <!-- Zone (master) volume -->
            <section
              class="sv-cascade rounded-2xl border p-4 flex flex-col gap-3 transition-colors duration-300"
              style="--i: 1"
              :class="
                group.muted
                  ? 'bg-red-50/70 dark:bg-red-900/10 border-red-200 dark:border-red-900/40'
                  : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
              "
            >
              <div class="flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <h4 class="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                    Zone volume
                  </h4>
                  <p class="text-sm text-slate-600 dark:text-slate-300">
                    <template v-if="zone.hasMasterVolume.value">
                      Moves {{ zone.linkedClients.value.length }} linked
                      speaker{{ zone.linkedClients.value.length === 1 ? "" : "s" }} together
                    </template>
                    <template v-else>Mute or unmute the whole zone</template>
                  </p>
                </div>
                <button
                  type="button"
                  class="h-11 px-4 shrink-0 inline-flex items-center gap-2 rounded-full border text-sm font-semibold transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
                  :class="
                    group.muted
                      ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  "
                  :disabled="!zone.canAdjustVolume.value"
                  :aria-pressed="group.muted"
                  :aria-label="group.muted ? `Unmute ${zone.zoneName.value}` : `Mute ${zone.zoneName.value}`"
                  @click="zone.toggleZoneMute"
                >
                  <Transition name="sv-swap" mode="out-in">
                    <span
                      :key="group.muted ? 'off' : 'on'"
                      class="mdi text-lg"
                      :class="group.muted ? 'mdi-volume-off' : 'mdi-volume-high'"
                      aria-hidden="true"
                    ></span>
                  </Transition>
                  {{ group.muted ? "Muted" : "Mute" }}
                </button>
              </div>

              <SimpleVolumeSlider
                v-if="zone.hasMasterVolume.value"
                :volume="zone.masterVolume.value"
                :muted="group.muted"
                :label="`${zone.zoneName.value} volume`"
                :exponent="zone.exponent.value"
                :step="zone.volumeStep.value"
                :disabled="!zone.canAdjustVolume.value"
                :accent="zone.accent.value"
                @update:volume="zone.setMasterVolume"
              />

              <p
                v-else-if="zone.speakers.value.length > 0"
                class="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed"
              >
                <span class="mdi mdi-link-variant text-base -mt-0.5 sv-accent-text" aria-hidden="true"></span>
                <span v-if="zone.canLinkClients.value">
                  To control several speakers with one slider, tap
                  <strong class="font-semibold text-slate-700 dark:text-slate-200">Link</strong>
                  on them below.
                </span>
                <span v-else>This zone has no linked speakers, so it has no zone volume.</span>
              </p>

              <p
                v-if="!zone.canAdjustVolume.value"
                class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
              >
                <span class="mdi mdi-lock-outline" aria-hidden="true"></span>
                Volume changes are disabled on this device
              </p>
            </section>

            <!-- Speakers -->
            <section class="sv-cascade" style="--i: 2">
              <div class="flex items-baseline justify-between mb-1 px-1">
                <h4 class="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  Speakers
                </h4>
                <span class="text-xs text-slate-400 dark:text-slate-500">
                  {{ zone.speakers.value.length }}
                </span>
              </div>

              <p
                v-if="zone.speakers.value.length === 0"
                class="py-8 text-center text-sm text-slate-500 dark:text-slate-400"
              >
                No speakers in this zone yet.
              </p>

              <div
                v-for="(client, i) in zone.speakers.value"
                :key="client.id"
                class="sv-cascade py-3.5 flex flex-col gap-1.5 border-b last:border-0 border-slate-100 dark:border-slate-800"
                :style="{ '--i': i + 3 }"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <!-- Avatar + name double as the "speaker info" button, so
                       the row keeps room for the name on phones. -->
                  <button
                    type="button"
                    class="group/info flex-1 min-w-0 flex items-center gap-2.5 -my-1 -ml-1 py-1 pl-1 pr-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
                    :aria-label="`${zone.speakerName(client)}: speaker info`"
                    @click="emit('client-details', client)"
                  >
                    <span
                      class="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold uppercase transition-all duration-300"
                      :class="
                        zone.isLinked(client)
                          ? 'sv-link-on text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      "
                      aria-hidden="true"
                    >
                      {{ zone.speakerName(client).charAt(0) }}
                      <span
                        class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900"
                        :class="client.connected ? 'bg-green-500' : 'bg-slate-400 dark:bg-slate-600'"
                      ></span>
                    </span>
                    <span class="flex-1 min-w-0" :class="{ 'opacity-60': !client.connected }">
                      <span class="flex items-center gap-1 min-w-0">
                        <span class="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {{ zone.speakerName(client) }}
                        </span>
                        <span
                          class="mdi mdi-information-outline text-sm text-slate-400 group-hover/info:text-slate-600 dark:group-hover/info:text-slate-300 transition-colors"
                          aria-hidden="true"
                        ></span>
                      </span>
                      <span class="block text-xs text-slate-400 dark:text-slate-500">
                        {{ client.connected ? "Online" : "Offline" }}
                        <template v-if="zone.isLinked(client)"> · Linked</template>
                      </span>
                    </span>
                  </button>

                  <button
                    v-if="zone.canLinkClients.value"
                    type="button"
                    class="shrink-0 h-9 px-3 inline-flex items-center gap-1.5 rounded-full border text-xs font-semibold transition-all duration-300 active:scale-90"
                    :class="
                      zone.isLinked(client)
                        ? 'sv-link-on border-transparent text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    "
                    :aria-pressed="zone.isLinked(client)"
                    :aria-label="`Link ${zone.speakerName(client)} to zone volume`"
                    @click="zone.toggleLink(client)"
                  >
                    <Transition name="sv-swap" mode="out-in">
                      <span
                        :key="zone.isLinked(client) ? 'on' : 'off'"
                        class="mdi"
                        :class="zone.isLinked(client) ? 'mdi-link-variant' : 'mdi-link-variant-off'"
                        aria-hidden="true"
                      ></span>
                    </Transition>
                    <span class="max-[360px]:hidden">{{ zone.isLinked(client) ? "Linked" : "Link" }}</span>
                  </button>

                  <Tooltip v-if="zone.showClientSettings.value" text="Speaker settings">
                    <button
                      type="button"
                      class="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90"
                      @click="emit('client-settings', client)"
                    >
                      <span class="mdi mdi-cog-outline text-lg"></span>
                    </button>
                  </Tooltip>

                  <button
                    type="button"
                    class="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border transition-all duration-300 active:scale-90 disabled:cursor-not-allowed disabled:opacity-60"
                    :class="
                      client.config.volume.muted
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    "
                    :disabled="!zone.canAdjustVolume.value"
                    :aria-pressed="client.config.volume.muted"
                    :aria-label="
                      client.config.volume.muted
                        ? `Unmute ${zone.speakerName(client)}`
                        : `Mute ${zone.speakerName(client)}`
                    "
                    @click="zone.toggleSpeakerMute(client)"
                  >
                    <span
                      class="mdi text-lg"
                      :class="client.config.volume.muted ? 'mdi-volume-off' : 'mdi-volume-high'"
                    ></span>
                  </button>
                </div>

                <div class="pl-[2.875rem]">
                  <SimpleVolumeSlider
                    size="md"
                    :volume="client.config.volume.percent"
                    :muted="client.config.volume.muted || group.muted"
                    :label="`${zone.speakerName(client)} volume`"
                    :exponent="zone.exponent.value"
                    :step="zone.volumeStep.value"
                    :disabled="!zone.canAdjustVolume.value"
                    :accent="zone.accent.value"
                    @update:volume="zone.setSpeakerVolume(client, $event)"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
