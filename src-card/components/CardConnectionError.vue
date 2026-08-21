<script setup lang="ts">
defineProps<{
  status: "disconnected" | "connecting" | "connected";
  error: string | null;
}>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div v-if="status !== 'connected'" class="connection-state">
    <p v-if="status === 'connecting'">Connecting to Snapcast server…</p>
    <template v-else>
      <p>{{ error || "Disconnected from Snapcast server." }}</p>
      <button type="button" @click="emit('retry')">Retry now</button>
    </template>
  </div>
</template>

<style scoped>
.connection-state {
  padding: 16px;
  color: var(--secondary-text-color, #666);
  text-align: center;
}
button {
  margin-top: 8px;
  padding: 6px 16px;
  border-radius: 8px;
  border: none;
  background: var(--primary-color, #03a9f4);
  color: var(--text-primary-color, #fff);
  cursor: pointer;
}
</style>
