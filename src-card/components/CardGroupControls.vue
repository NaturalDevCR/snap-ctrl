<script setup lang="ts">
import type { Client, Group } from "@/types/snapcast-rpc";

const props = defineProps<{
  client: Client;
  groups: Group[];
  currentGroupId: string;
  request: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>;
}>();

function onChangeGroup(event: Event) {
  const targetGroupId = (event.target as HTMLSelectElement).value;
  if (targetGroupId === props.currentGroupId) return;

  const targetGroup = props.groups.find((g) => g.id === targetGroupId);
  if (!targetGroup) return;

  const newClientIds = [...targetGroup.clients.map((c) => c.id), props.client.id];
  props.request("Group.SetClients", { id: targetGroupId, clients: newClientIds });
}
</script>

<template>
  <select class="group-select" :value="currentGroupId" @change="onChangeGroup">
    <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name || g.id }}</option>
  </select>
</template>

<style scoped>
.group-select {
  margin-left: 8px;
  background: var(--card-background-color, #fff);
  color: var(--primary-text-color, #212121);
  border: 1px solid var(--divider-color, #e0e0e0);
  border-radius: 4px;
  padding: 2px 4px;
}
</style>
