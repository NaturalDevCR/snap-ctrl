<template>
  <span
    ref="triggerRef"
    class="inline-block"
    @mouseenter="show"
    @mouseleave="hide"
  >
    <slot></slot>
  </span>
  <Teleport to="body">
    <div
      v-show="visible"
      ref="tooltipRef"
      class="fixed z-[99999] px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg pointer-events-none whitespace-nowrap"
      :style="tooltipStyle"
    >
      {{ text }}
      <div
        class="absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45"
        :class="arrowClasses"
      ></div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";

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

const triggerRef = ref<HTMLElement | null>(null);
const tooltipRef = ref<HTMLElement | null>(null);
const visible = ref(false);
const tooltipStyle = ref<Record<string, string>>({});

const show = async () => {
  visible.value = true;
  await nextTick();
  updatePosition();
};

const hide = () => {
  visible.value = false;
};

const updatePosition = () => {
  if (!triggerRef.value || !tooltipRef.value) return;

  const triggerRect = triggerRef.value.getBoundingClientRect();
  const tooltipRect = tooltipRef.value.getBoundingClientRect();
  const offset = 8;

  let top = 0;
  let left = 0;

  switch (props.position) {
    case "bottom":
      top = triggerRect.bottom + offset;
      left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
      break;
    case "top":
      top = triggerRect.top - offset - tooltipRect.height;
      left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
      break;
    case "left":
      top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      left = triggerRect.left - offset - tooltipRect.width;
      break;
    case "right":
      top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      left = triggerRect.right + offset;
      break;
  }

  tooltipStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  };
};

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
