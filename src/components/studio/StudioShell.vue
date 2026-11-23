<script setup lang="ts">
import { t } from "@/i18n";
import { computed, ref, watch } from "vue";
import { useSnapcastStore, type Client, type Group } from "@/stores/snapcast";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import { useZoneOrder } from "@/composables/useZoneOrder";
import { getGroupDisplayName } from "@/utils/group-name";
import { getStreamName } from "@/utils/stream-name";
import { getStreamStatus, parsePlayState } from "@/utils/stream-status";
import { confirmMute } from "@/utils/confirm-mute";
import ConnectionPanel from "@/components/ConnectionPanel.vue";
import GroupFilterModal from "@/components/GroupFilterModal.vue";
import StudioZoneCard from "./StudioZoneCard.vue";
import pkg from "../../../package.json";

defineProps<{ showingPermissionsSetup: boolean }>();
const emit = defineEmits<{
  settings: [];
  "server-info": [];
  "create-group": [];
  "group-settings": [group: Group];
  "client-details": [client: Client];
  "client-settings": [client: Client];
  "player-target": [element: HTMLElement | null];
}>();
const snapcast = useSnapcastStore();
const settings = useSettingsStore();
const auth = useAuthStore();
const query = ref("");
const filter = ref<"all" | "playing" | "muted">("all");
const showFilter = ref(false);
const refreshing = ref(false);
const playerHost = ref<HTMLElement | null>(null);
watch(playerHost, (element) => emit("player-target", element), {
  flush: "post",
});
const canAdjustVolume = computed(() =>
  auth.hasFeaturePermission("canAdjustVolumes"),
);
const { sortedZones } = useZoneOrder(
  computed(() => snapcast.filteredGroups),
  {
    hiddenZoneIds: computed(() => settings.hiddenGroups),
    showEmptyZones: computed(() => settings.showEmptyGroups),
    browserPlayerId: computed(() => snapcast.browserPlayerId),
  },
);
const groupName = (group: Group) =>
  getGroupDisplayName(group, snapcast.streams);
const playing = (group: Group) =>
  parsePlayState(getStreamStatus(snapcast.streams, group.stream_id)) ===
    "playing" && !group.muted;
const playingCount = computed(() => sortedZones.value.filter(playing).length);
const allMuted = computed(
  () => sortedZones.value.length > 0 && sortedZones.value.every((g) => g.muted),
);
const search = computed(() => query.value.trim().toLowerCase());
const visibleZones = computed(() =>
  sortedZones.value.filter((g) => {
    const speakers = auth.filterAllowedEntities("client", g.clients);
    const matchesSearch =
      `${groupName(g)} ${getStreamName(snapcast.streams.find((s) => s.id === g.stream_id))} ${speakers.map((c) => c.config.name || c.host.name).join(" ")}`
        .toLowerCase()
        .includes(search.value);
    return (
      matchesSearch &&
      (filter.value === "all" ||
        (filter.value === "playing" ? playing(g) : g.muted))
    );
  }),
);
async function refresh() {
  refreshing.value = true;
  try {
    await snapcast.getServerStatus();
  } finally {
    refreshing.value = false;
  }
}
async function toggleMuteAll() {
  if (!canAdjustVolume.value) return;
  const mute = !allMuted.value;
  const targetHost = snapcast.host;
  const targetIds = new Set(sortedZones.value.map((g) => g.id));
  if (
    mute &&
    !(await confirmMute("Mute all {count} visible zones?", {
      count: targetIds.size,
    }))
  )
    return;
  if (!canAdjustVolume.value || snapcast.host !== targetHost) return;
  // New or newly visible zones were not part of the confirmed action.
  for (const group of sortedZones.value) {
    if (targetIds.has(group.id) && group.muted !== mute)
      snapcast.setGroupMute(group.id, mute);
  }
}
function clearFilters() {
  query.value = "";
  filter.value = "all";
}
</script>

<template>
  <div class="st-app">
    <a href="#studio-content" class="st-skip-link">{{
      t("Skip to content")
    }}</a>
    <header class="st-topbar">
      <div class="st-topbar-inner">
        <a class="st-brand" href="#studio-content" aria-label="SnapCtrl Studio">
          <img
            class="st-app-icon"
            :src="'./pwa-192x192.png'"
            alt=""
            width="36"
            height="36"
          />
          <span>snapctrl<span class="st-brand-edition">STUDIO</span></span>
        </a>
        <div class="st-topbar-actions">
          <button
            type="button"
            class="st-connection"
            :class="{ 'st-connection--online': snapcast.isConnected }"
            :aria-label="
              snapcast.isConnected
                ? t(`Connected: server information`)
                : t(`Connection settings`)
            "
            @click="
              snapcast.isConnected ? emit('server-info') : emit('settings')
            "
          >
            <i class="st-dot" aria-hidden="true"></i
            ><span>{{
              snapcast.isConnected
                ? t("Connected")
                : snapcast.isConnecting
                  ? t("Connecting")
                  : t("Offline")
            }}</span>
          </button>
          <button
            type="button"
            class="st-classic-button"
            :aria-label="t('Switch to Classic interface')"
            @click="settings.setInterfaceMode('classic')"
          >
            <span class="mdi mdi-swap-horizontal" aria-hidden="true"></span
            ><span>{{ t("Classic") }}</span>
          </button>
          <button
            type="button"
            class="st-icon-button"
            :aria-label="
              t(
                settings.theme === 'dark'
                  ? 'Switch to light theme'
                  : 'Switch to dark theme',
              )
            "
            @click="settings.toggleTheme()"
          >
            <span
              class="mdi"
              :class="
                settings.theme === 'dark'
                  ? 'mdi-white-balance-sunny'
                  : 'mdi-weather-night'
              "
              aria-hidden="true"
            ></span>
          </button>
          <button
            type="button"
            class="st-icon-button"
            :aria-label="t('Application settings')"
            @click="emit('settings')"
          >
            <span class="mdi mdi-tune-variant" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </header>
    <main id="studio-content" class="st-main" tabindex="-1">
      <ConnectionPanel
        v-if="!snapcast.isConnected && !snapcast.isConnecting"
        :showing-permissions-setup="showingPermissionsSetup"
      />
      <section
        v-else-if="snapcast.isConnecting"
        class="st-loading"
        role="status"
        aria-live="polite"
      >
        <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
        <h1>{{ t("Connecting to Snapcast") }}</h1>
        <p>{{ t("Waiting for your server…") }}</p>
      </section>
      <template v-else>
        <div class="st-section-heading">
          <div>
            <h1>{{ t("Your zones") }}<span class="st-heading-dot">.</span></h1>
            <p class="st-zone-summary" aria-live="polite">
              {{
                t(sortedZones.length === 1 ? "{count} zone" : "{count} zones", {
                  count: sortedZones.length,
                })
              }}<span aria-hidden="true"> · </span
              >{{ t("{count} playing", { count: playingCount }) }}
            </p>
          </div>
          <div class="st-section-actions">
            <button
              v-if="canAdjustVolume && sortedZones.length > 1"
              type="button"
              class="st-button st-button--quiet st-mute-all"
              :class="{ 'st-muted': allMuted }"
              :aria-label="
                allMuted ? t(`Unmute all zones`) : t(`Mute all zones`)
              "
              :aria-pressed="allMuted"
              @click="toggleMuteAll"
            >
              <span
                class="mdi"
                :class="allMuted ? 'mdi-volume-high' : 'mdi-volume-off'"
                aria-hidden="true"
              ></span
              ><span>{{ allMuted ? t("Unmute all") : t("Mute all") }}</span>
            </button>
            <button
              v-if="auth.permissions.showCreateGroup"
              type="button"
              class="st-button st-button--primary"
              @click="emit('create-group')"
            >
              <span class="mdi mdi-plus" aria-hidden="true"></span
              >{{ t("Add zone") }}
            </button>
          </div>
        </div>
        <div class="st-toolbar">
          <div class="st-segments" :aria-label="t('Filter zones')">
            <button
              v-for="item in ['all', 'playing', 'muted'] as const"
              :key="item"
              type="button"
              :class="{ 'st-segment-active': filter === item }"
              :aria-pressed="filter === item"
              @click="filter = item"
            >
              {{
                item === "all"
                  ? t("All zones")
                  : item === "playing"
                    ? t("Playing")
                    : t("Muted")
              }}<span v-if="item === 'all'">{{ sortedZones.length }}</span>
            </button>
          </div>
          <div class="st-toolbar-right">
            <label class="st-search"
              ><span class="mdi mdi-magnify" aria-hidden="true"></span
              ><input
                v-model="query"
                type="search"
                :aria-label="t('Search zones')"
                :placeholder="t('Search zones, sources, speakers…')"
            /></label>
            <button
              type="button"
              class="st-icon-button st-bordered st-empty-toggle"
              :aria-label="
                settings.showEmptyGroups
                  ? t(`Hide empty zones`)
                  : t(`Show empty zones`)
              "
              :aria-pressed="settings.showEmptyGroups"
              @click="settings.setShowEmptyGroups(!settings.showEmptyGroups)"
            >
              <span
                class="mdi"
                :class="
                  settings.showEmptyGroups
                    ? 'mdi-eye-outline'
                    : 'mdi-eye-off-outline'
                "
                aria-hidden="true"
              ></span>
            </button>
            <button
              v-if="auth.permissions.showGroupFilter"
              type="button"
              class="st-icon-button st-bordered"
              :aria-label="t('Manage zone visibility and order')"
              @click="showFilter = true"
            >
              <span class="mdi mdi-filter-variant" aria-hidden="true"></span>
            </button>
            <button
              type="button"
              class="st-icon-button st-bordered"
              :aria-label="t('Refresh server status')"
              :disabled="refreshing"
              @click="refresh"
            >
              <span
                class="mdi mdi-refresh"
                :class="{ 'mdi-spin': refreshing }"
                aria-hidden="true"
              ></span>
            </button>
          </div>
        </div>
        <TransitionGroup
          v-if="visibleZones.length"
          name="st-card"
          tag="div"
          class="st-zone-grid"
          appear
        >
          <StudioZoneCard
            v-for="(group, index) in visibleZones"
            :key="group.id"
            :group="group"
            :style="{ '--st-index': Math.min(index, 8) }"
            @group-settings="emit('group-settings', $event)"
            @client-details="emit('client-details', $event)"
            @client-settings="emit('client-settings', $event)"
          />
        </TransitionGroup>
        <div v-else class="st-empty">
          <span class="mdi mdi-speaker-wireless" aria-hidden="true"></span>
          <h2>
            {{
              sortedZones.length
                ? t("No matching zones")
                : t("No zones to show")
            }}
          </h2>
          <p>
            {{
              sortedZones.length
                ? t("Try another search or filter.")
                : t(
                    "Connect speakers to Snapcast, or check your zone visibility settings.",
                  )
            }}
          </p>
          <button
            v-if="query || filter !== 'all'"
            type="button"
            class="st-button st-button--quiet"
            @click="clearFilters"
          >
            {{ t("Clear filters") }}</button><button
            v-else-if="auth.permissions.showGroupFilter"
            type="button"
            class="st-button st-button--quiet"
            @click="showFilter = true"
          >
            {{ t("Manage zones") }}
          </button>
        </div>
        <section
          v-if="auth.permissions.showBrowserPlayer"
          class="st-player"
          :aria-label="t('Listen on this device')"
        >
          <h2>
            <span class="mdi mdi-headphones" aria-hidden="true"></span
            >{{ t("Listen on this device") }}
          </h2>
          <div ref="playerHost" class="st-player-host"></div>
        </section>
      </template>
      <footer class="st-footer">
        <span
          >SnapCtrl Studio <span aria-hidden="true">·</span> v{{
            pkg.version
          }}</span
        ><a
          href="https://github.com/NaturalDevCR/snap-ctrl"
          target="_blank"
          rel="noopener noreferrer"
          >NaturalDevCR
          <span class="mdi mdi-arrow-top-right" aria-hidden="true"></span
        ></a>
      </footer>
    </main>
    <GroupFilterModal :open="showFilter" @close="showFilter = false" />
  </div>
</template>
