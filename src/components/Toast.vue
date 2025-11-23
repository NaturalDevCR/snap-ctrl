<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-sm sm:w-auto sm:min-w-[320px]">
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
          class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg bg-white dark:bg-slate-900 border shadow-lg cursor-pointer hover:-translate-y-0.5 transition-all duration-300"
          :class="{
            'border-l-4 border-l-emerald-500 border-gray-200 dark:border-gray-800': notification.type === 'success',
            'border-l-4 border-l-red-500 border-gray-200 dark:border-gray-800': notification.type === 'error',
            'border-l-4 border-l-amber-500 border-gray-200 dark:border-gray-800': notification.type === 'warning',
            'border-l-4 border-l-blue-500 border-gray-200 dark:border-gray-800': notification.type === 'info'
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
          <span class="flex-1 text-gray-700 dark:text-gray-200 text-sm leading-relaxed font-medium pt-0.5">{{ notification.message }}</span>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0 -mr-1 -mt-1 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800" @click.stop="notifications.remove(notification.id)">
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

<style scoped>
/* Scoped styles removed in favor of Tailwind CSS */
</style>
