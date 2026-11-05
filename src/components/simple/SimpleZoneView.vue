<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import { useZoneOrder } from "@/composables/useZoneOrder";
import { useEscapeToClose } from "@/composables/useEscapeToClose";
import { getStreamStatus } from "@/utils/stream-status";
import SimpleZoneCard from "@/components/simple/SimpleZoneCard.vue";
import GroupFilterModal from "@/components/GroupFilterModal.vue";
import Tooltip from "@/components/Tooltip.vue";
import type { Client, Group } from "@/stores/snapcast";
import "./simple-view.css";

const emit = defineEmits<{
  (e: "group-settings", group: Group): void;
  (e: "create-group"): void;
  (e: "client-details", client: Client): void;
  (e: "client-settings", client: Client): void;
}>();

const snapcast = useSnapcastStore();
const settings = useSettingsStore();
const auth = useAuthStore();

const refreshing = ref(false);
const showGroupFilter = ref(false);
const showOverflowMenu = ref(false);
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

// Shared filtering/ordering, so hidden zones, custom order and the
// Browser Player's temporary group behave consistently.
const { sortedZones } = useZoneOrder(
  computed(() => snapcast.filteredGroups),
  {
    hiddenZoneIds: computed(() => settings.hiddenGroups),
    showEmptyZones: computed(() => settings.showEmptyGroups),
    browserPlayerId: computed(() => snapcast.browserPlayerId),
  }
);

const canAdjustVolume = computed(() => auth.hasFeaturePermission("canAdjustVolumes"));

function isPlaying(group: Group) {
  const status = getStreamStatus(snapcast.streams, group.stream_id).toLowerCase();
  return status === "playing" || status === "kplaying";
}

const playingCount = computed(
  () => sortedZones.value.filter((g) => isPlaying(g) && !g.muted).length
);

const allMuted = computed(
  () => sortedZones.value.length > 0 && sortedZones.value.every((g) => g.muted)
);

const summary = computed(() => {
  const total = sortedZones.value.length;
  const zones = `${total} zone${total === 1 ? "" : "s"}`;
  if (playingCount.value === 0) return `Nothing playing · ${zones}`;
  return `${playingCount.value} playing now · ${zones}`;
});

function toggleMuteAll() {
  if (!canAdjustVolume.value) return;
  const mute = !allMuted.value;
  for (const g of sortedZones.value) {
    if (g.muted !== mute) snapcast.setGroupMute(g.id, mute);
  }
}

async function refreshStatus() {
  refreshing.value = true;
  try {
    await snapcast.getServerStatus();
  } finally {
    refreshing.value = false;
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- Hero header -->
    <div class="relative z-30 flex flex-col sm:flex-row sm:items-end justify-between gap-4 hero-in">
      <div>
        <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
          Your zones
        </h2>
        <p class="mt-1 flex items-center gap-2 text-[var(--text-tertiary)]">
          <span class="relative flex w-2.5 h-2.5" aria-hidden="true">
            <span
              v-if="playingCount > 0"
              class="absolute inline-flex h-full w-full rounded-full bg-[var(--status-playing)] opacity-75 animate-ping"
            ></span>
            <span
              class="relative inline-flex w-2.5 h-2.5 rounded-full"
              :class="playingCount > 0 ? 'bg-[var(--status-playing)]' : 'bg-[var(--status-idle)]'"
            ></span>
          </span>
          <span aria-live="polite">{{ summary }}</span>
        </p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <button
          v-if="canAdjustVolume && sortedZones.length > 1"
          type="button"
          class="h-11 px-4 inline-flex items-center gap-2 rounded-full border text-sm font-semibold shadow-sm transition-all duration-300 active:scale-95"
          :class="
            allMuted
              ? 'bg-[var(--status-attention-deep)] border-[var(--status-attention-deep)] text-white shadow-red-500/30 hover:brightness-90'
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
        <div ref="overflowMenuRef" class="relative ml-auto sm:hidden">
          <button
            type="button"
            class="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] shadow-sm transition-all active:scale-90"
            :aria-expanded="showOverflowMenu"
            aria-label="More zone actions"
            @click="showOverflowMenu = !showOverflowMenu"
          >
            <span class="mdi mdi-dots-horizontal text-xl"></span>
          </button>
          <Transition name="sv-pop">
            <div
              v-if="showOverflowMenu"
              class="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xl p-1.5 z-20"
            >
              <button
                type="button"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                @click="settings.setShowEmptyGroups(!settings.showEmptyGroups); showOverflowMenu = false"
              >
                <span class="mdi text-lg" :class="settings.showEmptyGroups ? 'mdi-eye' : 'mdi-eye-off'" aria-hidden="true"></span>
                {{ settings.showEmptyGroups ? "Hide empty groups" : "Show empty groups" }}
              </button>
              <button
                v-if="auth.permissions.showGroupFilter"
                type="button"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                @click="showGroupFilter = true; showOverflowMenu = false"
              >
                <span class="mdi mdi-filter-variant text-lg" aria-hidden="true"></span>
                Filter groups
              </button>
              <button
                type="button"
                :disabled="refreshing"
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
    </div>

    <TransitionGroup
      tag="div"
      name="zone"
      appear
      class="relative grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start"
    >
      <SimpleZoneCard
        v-for="(group, index) in sortedZones"
        :key="group.id"
        :group="group"
        :style="{ '--i': index }"
        @group-settings="emit('group-settings', $event)"
        @client-details="emit('client-details', $event)"
        @client-settings="emit('client-settings', $event)"
      />
    </TransitionGroup>

    <div
      v-if="snapcast.isConnected && sortedZones.length === 0"
      class="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-1)]"
    >
      <div
        class="w-20 h-20 rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] flex items-center justify-center mb-4"
      >
        <span class="mdi mdi-speaker-off text-4xl"></span>
      </div>
      <h3 class="text-xl font-bold text-[var(--text-primary)] mb-2">
        No zones to show
      </h3>
      <p class="text-[var(--text-tertiary)] max-w-sm">
        <template v-if="snapcast.groups.length === 0">
          Make sure your Snapcast server is running and has speakers connected.
        </template>
        <template v-else>
          Every zone is hidden by your current filters. Turn on "Show Empty
          Groups" in Settings or check the group filter.
        </template>
      </p>
    </div>

    <GroupFilterModal :open="showGroupFilter" @close="showGroupFilter = false" />
  </div>
</template>

<style scoped>
/* Cards rise into place one after another on first render / view switch,
   and new zones animate in (or out) as groups change on the server. */
.zone-enter-active {
  transition:
    opacity 450ms ease,
    transform 450ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(var(--i, 0) * 70ms);
}
.zone-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}
.zone-enter-from {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}
.zone-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
.zone-move {
  transition: transform 400ms cubic-bezier(0.22, 1, 0.36, 1);
}

.hero-in {
  animation: hero-in 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes hero-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
