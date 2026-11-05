<template>
  <div class="flex items-center justify-center" :class="inline ? 'flex-row gap-2' : 'flex-col gap-3'">
    <div class="relative animate-spin" :style="{ width: size, height: size }">
      <div class="w-full h-full border-[3px] border-[var(--border)] border-t-blue-600 rounded-full"></div>
    </div>
    <span v-if="label" class="text-[var(--text-tertiary)] text-sm">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  size?: string
  label?: string
  inline?: boolean
}

withDefaults(defineProps<Props>(), {
  size: '40px',
  inline: false
})
</script>

<style scoped>
/* Scoped styles removed in favor of Tailwind CSS */
</style>
