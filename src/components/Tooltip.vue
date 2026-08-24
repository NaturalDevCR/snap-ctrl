<template>
  <span
    ref="triggerRef"
    class="inline-block"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <component :is="slottedChild" v-if="slottedChild" />
    <slot v-else></slot>
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
import { ref, computed, nextTick, useSlots, cloneVNode } from "vue";

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

const slots = useSlots();

// Tooltips only ever appeared on :hover, so most of the app's icon-only
// buttons (wrapped in this component precisely so they'd get a label) had
// zero accessible name for screen readers and zero affordance on
// touch/keyboard — mobile has no hover, so those users never saw the label
// at all. Stamp the tooltip text on as aria-label (unless the child already
// set its own) so the same source of truth covers both the visual tooltip
// and the accessible name, and show on focus too so keyboard users get it.
const slottedChild = computed(() => {
  const children = slots.default?.() ?? [];
  if (children.length !== 1) return null;
  const vnode = children[0]!;
  if (typeof vnode.type === "symbol") return null; // Text/Comment/Fragment
  const existingLabel = (vnode.props as Record<string, unknown> | null)?.[
    "aria-label"
  ];
  return cloneVNode(vnode, { "aria-label": existingLabel || props.text });
});

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
