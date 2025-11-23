<template>
  <div class="flex items-center justify-center" :class="inline ? 'flex-row gap-2' : 'flex-col gap-3'">
    <div class="relative animate-spin" :style="{ width: size, height: size }">
      <div class="w-full h-full border-[3px] border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full"></div>
    </div>
    <span v-if="label" class="text-gray-500 dark:text-gray-400 text-sm">{{ label }}</span>
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
