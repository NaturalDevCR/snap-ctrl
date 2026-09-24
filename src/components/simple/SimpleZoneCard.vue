<script setup lang="ts">
import { ref } from "vue";
import { useZoneControls } from "@/composables/useZoneControls";
import SimpleSourceButton from "@/components/simple/SimpleSourceButton.vue";
import SimpleZoneModal from "@/components/simple/SimpleZoneModal.vue";
import Tooltip from "@/components/Tooltip.vue";
import type { Client, Group } from "@/stores/snapcast";

const props = defineProps<{ group: Group }>();

const emit = defineEmits<{
  (e: "group-settings", group: Group): void;
  (e: "client-details", client: Client): void;
  (e: "client-settings", client: Client): void;
}>();

const zone = useZoneControls(() => props.group);
const showVolume = ref(false);
</script>

<template>
  <article
    class="relative flex flex-col rounded-3xl border bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
    :class="[
      group.muted ? 'border-red-200 dark:border-red-900/50' : 'border-gray-200/80 dark:border-gray-800',
      { 'is-playing': zone.playState.value === 'playing' && !group.muted },
    ]"
    :style="zone.accentStyle.value"
    :aria-label="zone.zoneName.value"
  >
    <!-- Ambient glow in the source's color; "breathes" while playing. -->
    <div class="sv-glow" aria-hidden="true"></div>

    <div class="relative p-5 sm:p-6 flex flex-col gap-4">
      <!-- Header -->
      <header class="flex items-start gap-4">
        <div
          class="sv-tile relative w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-lg transition-all duration-500"
          :class="{ 'is-muted': group.muted, 'is-idle': zone.playState.value !== 'playing' }"
          aria-hidden="true"
        >
          <Transition name="sv-swap" mode="out-in">
            <span v-if="group.muted" key="muted" class="mdi mdi-volume-off text-3xl"></span>
            <span v-else-if="zone.playState.value === 'playing'" key="eq" class="sv-eq">
              <span></span><span></span><span></span><span></span>
            </span>
            <span
              v-else
              :key="zone.currentSourceIcon.value"
              class="mdi text-3xl"
              :class="zone.currentSourceIcon.value"
            ></span>
          </Transition>
          <span
            v-if="zone.playState.value === 'playing' && !group.muted"
            class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow"
          >
            <span class="mdi text-sm sv-accent-text" :class="zone.currentSourceIcon.value"></span>
          </span>
        </div>

        <div class="flex-1 min-w-0 pt-1">
          <div class="flex items-center gap-2 min-w-0">
            <h3
              class="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate"
              :title="zone.zoneName.value"
            >
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
          <p class="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 min-w-0">
            <span class="relative flex w-2 h-2 shrink-0" aria-hidden="true">
              <span
                v-if="zone.playState.value === 'playing'"
                class="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"
              ></span>
              <span
                class="relative inline-flex w-2 h-2 rounded-full"
                :class="{
                  'bg-green-500': zone.playState.value === 'playing',
                  'bg-amber-400': zone.playState.value === 'idle',
                  'bg-red-500': zone.playState.value === 'unavailable',
                }"
              ></span>
            </span>
            <span class="shrink-0">{{ zone.statusLabel.value }}</span>
            <template v-if="zone.speakers.value.length > 0">
              <span aria-hidden="true">·</span>
              <span class="truncate">
                {{ zone.speakers.value.length }} speaker{{ zone.speakers.value.length === 1 ? "" : "s" }}
              </span>
            </template>
          </p>
        </div>

        <Tooltip v-if="zone.showGroupSettings.value" text="Zone settings">
          <button
            type="button"
            class="w-10 h-10 -mr-2 -mt-1 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:rotate-90 active:scale-90 transition-all duration-300"
            @click="emit('group-settings', group)"
          >
            <span class="mdi mdi-cog-outline text-2xl"></span>
          </button>
        </Tooltip>
      </header>

      <!-- Source -->
      <SimpleSourceButton :group="group" />

      <!-- Volume summary → opens the Volume & Speakers sheet -->
      <div v-if="zone.speakers.value.length > 0" class="flex items-center gap-2.5">
        <button
          type="button"
          class="w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl border transition-all duration-300 active:scale-90 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          :class="
            group.muted
              ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          "
          :disabled="!zone.canAdjustVolume.value"
          :aria-pressed="group.muted"
          :aria-label="group.muted ? `Unmute ${zone.zoneName.value}` : `Mute ${zone.zoneName.value}`"
          @click="zone.toggleZoneMute"
        >
          <Transition name="sv-swap" mode="out-in">
            <span
              :key="group.muted ? 'off' : 'on'"
              class="mdi text-2xl"
              :class="group.muted ? 'mdi-volume-off' : 'mdi-volume-high'"
            ></span>
          </Transition>
        </button>

        <button
          type="button"
          class="group/vol flex-1 min-w-0 h-12 flex items-center gap-3 pl-3 pr-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 text-left transition-all duration-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          aria-haspopup="dialog"
          @click="showVolume = true"
        >
          <span class="mdi mdi-tune-vertical-variant text-xl sv-accent-text shrink-0" aria-hidden="true"></span>

          <span v-if="zone.hasMasterVolume.value" class="flex-1 min-w-0 flex items-center gap-3">
            <span class="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" aria-hidden="true">
              <span
                class="block h-full rounded-full transition-all duration-300"
                :style="{
                  width: `${zone.masterVolume.value}%`,
                  background: group.muted ? '#94a3b8' : zone.accent.value,
                }"
              ></span>
            </span>
            <span
              class="tabular-nums text-sm font-bold w-9 text-right"
              :class="group.muted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'"
            >{{ zone.masterVolume.value }}%</span>
          </span>
          <span v-else class="flex-1 min-w-0 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
            Volume &amp; speakers
          </span>

          <span class="mdi mdi-chevron-right text-lg text-slate-400 group-hover/vol:translate-x-0.5 transition-transform" aria-hidden="true"></span>
          <span class="sr-only">Open volume and speakers for {{ zone.zoneName.value }}</span>
        </button>
      </div>

      <p v-else class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span class="mdi mdi-speaker-off text-lg" aria-hidden="true"></span>
        No speakers in this zone yet.
      </p>
    </div>

    <SimpleZoneModal
      :open="showVolume"
      :group="group"
      @close="showVolume = false"
      @group-settings="emit('group-settings', $event)"
      @client-details="emit('client-details', $event)"
      @client-settings="emit('client-settings', $event)"
    />
  </article>
</template>
