<template>
  <Teleport to="body">
    <div
      style="top: calc(1rem + env(safe-area-inset-top)); right: calc(1rem + env(safe-area-inset-right))"
      class="fixed left-4 z-[9999] flex flex-col gap-3 pointer-events-none sm:left-auto sm:w-auto sm:max-w-sm sm:min-w-[320px]"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-x-8"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-8 scale-95"
      >
        <div
          v-for="notification in notifications.notifications"
          :key="notification.id"
          class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg bg-[var(--surface-1)] border shadow-lg cursor-pointer hover:-translate-y-0.5 transition-all duration-300"
          :class="{
            'border-l-4 border-l-emerald-500 border-[var(--border)]': notification.type === 'success',
            'border-l-4 border-l-red-500 border-[var(--border)]': notification.type === 'error',
            'border-l-4 border-l-amber-500 border-[var(--border)]': notification.type === 'warning',
            'border-l-4 border-l-blue-500 border-[var(--border)]': notification.type === 'info'
          }"
          @click="notifications.remove(notification.id)"
        >
          <span class="text-xl shrink-0 mt-0.5" :class="{
            'text-emerald-500': notification.type === 'success',
            'text-red-500': notification.type === 'error',
            'text-amber-500': notification.type === 'warning',
            'text-blue-500': notification.type === 'info'
          }">
            <span class="mdi" :class="getIconClass(notification.type)"></span>
          </span>
          <span class="flex-1 text-[var(--text-secondary)] text-sm leading-relaxed font-medium pt-0.5">{{ notification.message }}</span>
          <button class="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors shrink-0 -mr-3 -my-2 w-11 h-11 inline-flex items-center justify-center rounded-full hover:bg-[var(--surface-2)]" aria-label="Dismiss" @click.stop="notifications.remove(notification.id)">
            <span class="mdi mdi-close text-lg"></span>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useNotificationStore } from '@/stores/notification'
import type { NotificationType } from '@/stores/notification'

const notifications = useNotificationStore()

function getIconClass(type: NotificationType): string {
  switch (type) {
    case 'success': return 'mdi-check-circle'
    case 'error': return 'mdi-alert-circle'
    case 'warning': return 'mdi-alert'
    case 'info': return 'mdi-information'
    default: return 'mdi-information'
  }
}
</script>
