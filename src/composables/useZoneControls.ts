import { computed } from "vue";
import { useSnapcastStore } from "@/stores/snapcast";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import { getGroupDisplayName } from "@/utils/group-name";
import { getStreamName } from "@/utils/stream-name";
import { getStreamStatus } from "@/utils/stream-status";
import { getSourceAccent, getSourceHue, getSourceIcon } from "@/utils/source-style";
import { averageClientVolume, linkedZoneClients } from "@/utils/zone-volume";
import type { Client, Group } from "@/stores/snapcast";

export type PlayState = "playing" | "idle" | "unavailable";

/**
 * Everything the Simple view needs to show and control one zone. The
 * zone card and its Volume & Speakers sheet both use it, so they always
 * agree on permissions, linked speakers and source colors.
 */
export function useZoneControls(group: () => Group) {
  const snapcast = useSnapcastStore();
  const settings = useSettingsStore();
  const auth = useAuthStore();

  // ---- Permissions ---------------------------------------------------------
  const canAdjustVolume = computed(() => auth.hasFeaturePermission("canAdjustVolumes"));
  const canSelectStream = computed(() => auth.hasFeaturePermission("canSelectStream"));
  const canLinkClients = computed(() => auth.hasFeaturePermission("canLinkClients"));
  const showGroupSettings = computed(() => auth.permissions.showGroupSettings);
  const showClientSettings = computed(() => auth.permissions.showClientSettings);

  // ---- Zone / source -------------------------------------------------------
  const zoneName = computed(() => getGroupDisplayName(group(), snapcast.streams));

  function playStateOf(streamId: string): PlayState {
    const status = getStreamStatus(snapcast.streams, streamId).toLowerCase();
    if (status === "playing" || status === "kplaying") return "playing";
    if (status === "idle" || status === "kidle") return "idle";
    return "unavailable";
  }

  const playState = computed(() => playStateOf(group().stream_id));
  const statusLabel = computed(() => {
    if (playState.value === "playing") return "Playing";
    if (playState.value === "idle") return "Paused";
    return "Unavailable";
  });

  const currentStream = computed(() =>
    snapcast.streams.find((s) => s.id === group().stream_id)
  );
  const currentSourceName = computed(() => getStreamName(currentStream.value));
  const currentSourceIcon = computed(() => getSourceIcon(currentStream.value));

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

  function selectSource(streamId: string) {
    if (!canSelectStream.value || streamId === group().stream_id) return;
    snapcast.setGroupStream(group().id, streamId);
  }

  // ---- Speakers & volume ---------------------------------------------------
  const speakers = computed<Client[]>(() =>
    auth.filterAllowedEntities("client", group().clients)
  );

  const linkedIds = computed(
    () => settings.groupVolumeLinks[group().id]?.linkedClientIds ?? []
  );

  const linkedClients = computed(() =>
    linkedZoneClients(group(), linkedIds.value, (id) => auth.isEntityAllowed("client", id))
  );

  /** A zone has a master volume only while it has linked speakers. */
  const hasMasterVolume = computed(() => linkedClients.value.length > 0);
  const masterVolume = computed(() => averageClientVolume(linkedClients.value));
  const exponent = computed(() => settings.getVolumeExponent(group().id));

  function setMasterVolume(value: number) {
    if (!canAdjustVolume.value || !hasMasterVolume.value) return;
    // Same call and baseline as the classic Zone Control master slider.
    snapcast.setGroupVolumeProportional(
      group().id,
      value,
      linkedClients.value.map((c) => c.id),
      settings.groupVolumeLinks[group().id]?.referenceVolumes ?? {}
    );
  }

  function toggleZoneMute() {
    if (!canAdjustVolume.value) return;
    snapcast.setGroupMute(group().id, !group().muted);
  }

  function setSpeakerVolume(client: Client, value: number) {
    snapcast.setClientVolume(client.id, value, client.config.volume.muted);
  }

  function toggleSpeakerMute(client: Client) {
    snapcast.setClientVolume(
      client.id,
      client.config.volume.percent,
      !client.config.volume.muted
    );
  }

  function isLinked(client: Client) {
    return linkedIds.value.includes(client.id);
  }

  function toggleLink(client: Client) {
    if (!canLinkClients.value) return;
    const g = group();
    const inGroup = new Set(g.clients.map((c) => c.id));
    const current = linkedIds.value.filter((id) => inGroup.has(id));
    const next = current.includes(client.id)
      ? current.filter((id) => id !== client.id)
      : [...current, client.id];

    // Re-baseline every linked speaker at its current volume, exactly like
    // saving the Linked checkboxes in Group Settings does.
    const referenceVolumes: Record<string, number> = {};
    for (const c of g.clients) {
      if (next.includes(c.id)) referenceVolumes[c.id] = c.config.volume.percent;
    }
    settings.setGroupVolumeLinks(g.id, next, referenceVolumes);
  }

  function speakerName(client: Client) {
    return client.config.name || client.host.name;
  }

  return {
    // permissions
    canAdjustVolume,
    canSelectStream,
    canLinkClients,
    showGroupSettings,
    showClientSettings,
    // zone / source
    zoneName,
    playState,
    statusLabel,
    currentSourceName,
    currentSourceIcon,
    accent,
    accentStyle,
    sources,
    selectSource,
    // volume
    speakers,
    linkedClients,
    hasMasterVolume,
    masterVolume,
    exponent,
    volumeStep: computed(() => settings.volumeStep),
    setMasterVolume,
    toggleZoneMute,
    setSpeakerVolume,
    toggleSpeakerMute,
    isLinked,
    toggleLink,
    speakerName,
  };
}
