<script setup lang="ts">
import { computed } from "vue";
import type { Group } from "@/types/snapcast-rpc";
import { applyZoneFilter } from "../utils/applyZoneFilter";
import CardVolumeRow from "./CardVolumeRow.vue";
import CardGroupControls from "./CardGroupControls.vue";

const props = defineProps<{
  groups: Group[];
  zoneFilter: string[] | undefined;
  request: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>;
}>();

const visibleGroups = computed(() => applyZoneFilter(props.groups, props.zoneFilter));
</script>

<template>
  <div class="zone-grid">
    <section v-for="group in visibleGroups" :key="group.id" class="zone">
      <h3>{{ group.name || group.id }}</h3>
      <div v-for="client in group.clients" :key="client.id" class="client-line">
        <CardVolumeRow :client="client" :request="request" />
        <CardGroupControls
          :client="client"
          :groups="groups"
          :current-group-id="group.id"
          :request="request"
        />
      </div>
    </section>
    <p v-if="visibleGroups.length === 0" class="empty">No zones to show.</p>
  </div>
</template>

<style scoped>
.zone {
  margin-bottom: 16px;
}
.zone h3 {
  margin: 0 0 4px;
  color: var(--primary-text-color, #212121);
  font-size: 1em;
}
.client-line {
  display: flex;
  align-items: center;
}
.empty {
  color: var(--secondary-text-color, #666);
  text-align: center;
  padding: 16px;
}
</style>
