<script setup lang="ts">
import { ref, shallowRef } from "vue";
import { useCardConnection } from "../composables/useCardConnection";
import CardConnectionError from "./CardConnectionError.vue";
import CardZoneGrid from "./CardZoneGrid.vue";

export interface CardConfig {
  host: string;
  port: number;
  title?: string;
  zone_filter?: string[];
}

const config = ref<CardConfig | null>(null);
// shallowRef (not ref): CardConnection's status/error/groups fields are
// themselves Refs. A plain ref() applies UnwrapRef, which deep-unwraps
// those nested Refs both in the type system and at runtime (via Vue's
// ref-unwrapping-in-reactive-objects), breaking the `.value` accesses
// below. shallowRef keeps the composable's return object — and its
// nested Refs — intact.
const connection = shallowRef<ReturnType<typeof useCardConnection> | null>(null);

function setConfig(next: CardConfig) {
  config.value = next;
  connection.value?.disconnect();
  connection.value = useCardConnection({ host: next.host, port: next.port });
  connection.value.connect();
}

function setHass(_hass: unknown) {
  // Reserved for reading HA theme metadata in a future iteration; the
  // card currently relies entirely on CSS custom properties already
  // applied to the document by the HA frontend, which requires no
  // explicit hass handling.
}

function retry() {
  connection.value?.retry();
}

function teardown() {
  connection.value?.disconnect();
}

defineExpose({ setConfig, setHass, teardown });
</script>

<template>
  <ha-card :header="config?.title">
    <div class="card-content">
      <template v-if="connection">
        <CardConnectionError
          :status="connection.status.value"
          :error="connection.error.value"
          @retry="retry"
        />
        <CardZoneGrid
          v-if="connection.status.value === 'connected'"
          :groups="connection.groups.value"
          :zone-filter="config?.zone_filter"
          :request="connection.request"
        />
      </template>
      <p v-else class="empty">Card not configured.</p>
    </div>
  </ha-card>
</template>

<style scoped>
.card-content {
  padding: 8px 16px 16px;
}
.empty {
  color: var(--secondary-text-color, #666);
  text-align: center;
  padding: 16px;
}
</style>
