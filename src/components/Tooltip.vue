<template>
  <div class="relative flex items-center group">
    <slot></slot>
    <div
      class="absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap"
      :class="positionClasses"
    >
      {{ text }}
      <div
        class="absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45"
        :class="arrowClasses"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  position: {
    type: String,
    default: "top",
    validator: (value: string) =>
      ["top", "bottom", "left", "right"].includes(value),
  },
});

const positionClasses = computed(() => {
  switch (props.position) {
    case "bottom":
      return "top-full mt-2 left-1/2 -translate-x-1/2";
    case "left":
      return "right-full mr-2 top-1/2 -translate-y-1/2";
    case "right":
      return "left-full ml-2 top-1/2 -translate-y-1/2";
    case "top":
    default:
      return "bottom-full mb-2 left-1/2 -translate-x-1/2";
  }
});

const arrowClasses = computed(() => {
  switch (props.position) {
    case "bottom":
      return "-top-1 left-1/2 -translate-x-1/2";
    case "left":
      return "-right-1 top-1/2 -translate-y-1/2";
    case "right":
      return "-left-1 top-1/2 -translate-y-1/2";
    case "top":
    default:
      return "-bottom-1 left-1/2 -translate-x-1/2";
  }
});
</script>
