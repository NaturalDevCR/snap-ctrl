import { ref, computed, type Ref, type ComputedRef } from "vue";
import { useSettingsStore } from "@/stores/settings";

export interface ZoneLike {
  id: string;
  name?: string | null;
  clients?: Array<{ id: string; config?: { name?: string | null } }>;
}

const BROWSER_PLAYER_NAME = "SnapCtrl";

export function isBrowserZone(zone: ZoneLike): boolean {
  return !!zone.clients?.some(
    (c) => c.config?.name === BROWSER_PLAYER_NAME
  );
}

export function useZoneOrder<T extends ZoneLike>(
  zones: Ref<T[]> | ComputedRef<T[]>,
  options: {
    hiddenZoneIds: Ref<string[]> | ComputedRef<string[]>;
    showEmptyZones: Ref<boolean> | ComputedRef<boolean>;
    browserPlayerId: Ref<string | null> | ComputedRef<string | null>;
  }
) {
  const settings = useSettingsStore();

  const draggedIndex = ref<number | null>(null);
  const dragOverIndex = ref<number | null>(null);

  const sortedZones = computed(() => {
    let result = [...zones.value];

    result = result.filter((z) => !options.hiddenZoneIds.value.includes(z.id));

    if (!options.showEmptyZones.value) {
      result = result.filter((z) => (z.clients?.length ?? 0) > 0);
    }

    if (options.browserPlayerId.value) {
      const browserId = options.browserPlayerId.value;
      result = result.filter((z) => !z.clients?.some((c) => c.id === browserId));
    }

    return result.sort((a, b) => {
      const isBrowserA = isBrowserZone(a);
      const isBrowserB = isBrowserZone(b);
      if (isBrowserA && !isBrowserB) return 1;
      if (!isBrowserA && isBrowserB) return -1;

      const indexA = settings.customGroupOrder.indexOf(a.id);
      const indexB = settings.customGroupOrder.indexOf(b.id);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      return (a.name ?? "").localeCompare(b.name ?? "");
    });
  });

  const orderedZonesForFilter = computed(() => {
    const all = [...zones.value];

    const browserGroup = all.find((z) => isBrowserZone(z));
    const regular = all.filter((z) => !isBrowserZone(z));

    const sorted = regular.sort((a, b) => {
      const indexA = settings.customGroupOrder.indexOf(a.id);
      const indexB = settings.customGroupOrder.indexOf(b.id);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

    if (browserGroup) sorted.push(browserGroup);
    return sorted;
  });

  function moveInCustomOrder(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    const source = zones.value.find((z) => z.id === sourceId);
    if (source && isBrowserZone(source)) return;

    let order = [...settings.customGroupOrder];
    if (order.length === 0) {
      order = sortedZones.value
        .filter((z) => !isBrowserZone(z))
        .map((z) => z.id);
    }

    if (!order.includes(sourceId)) order.push(sourceId);
    if (!order.includes(targetId)) order.push(targetId);

    order = order.filter((id) => id !== sourceId);
    const targetIndex = order.indexOf(targetId);
    if (targetIndex !== -1) {
      order.splice(targetIndex, 0, sourceId);
    } else {
      order.push(sourceId);
    }

    settings.setCustomGroupOrder(order);
  }

  function reorderInList(ordered: T[], sourceIndex: number, targetIndex: number) {
    if (sourceIndex === targetIndex) return null;
    const dragged = ordered[sourceIndex];
    if (!dragged) return null;
    if (isBrowserZone(dragged)) return null;
    const next = [...ordered];
    next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, dragged);
    return next
      .filter((z) => !isBrowserZone(z))
      .map((z) => z.id);
  }

  function handleDragStart(index: number, event?: DragEvent) {
    draggedIndex.value = index;
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  function handleDragOver(index: number, event: DragEvent) {
    event.preventDefault();
    dragOverIndex.value = index;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function handleDrop(targetIndex: number, event: DragEvent) {
    event.preventDefault();
    if (draggedIndex.value === null || draggedIndex.value === targetIndex) return;
    const newOrder = reorderInList(
      orderedZonesForFilter.value,
      draggedIndex.value,
      targetIndex
    );
    if (newOrder) settings.setCustomGroupOrder(newOrder);
    draggedIndex.value = null;
    dragOverIndex.value = null;
  }

  function handleDragEnd() {
    draggedIndex.value = null;
    dragOverIndex.value = null;
  }

  function toggleVisibility(zoneId: string) {
    const list = [...settings.hiddenGroups];
    const index = list.indexOf(zoneId);
    if (index === -1) list.push(zoneId);
    else list.splice(index, 1);
    settings.setHiddenGroups(list);
  }

  return {
    sortedZones,
    orderedZonesForFilter,
    draggedIndex,
    dragOverIndex,
    moveInCustomOrder,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    toggleVisibility,
    isBrowserZone,
  };
}
