import { defineStore } from "pinia";
import { ref } from "vue";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

export const useNotificationStore = defineStore("notification", () => {
  const notifications = ref<Notification[]>([]);

  function show(type: NotificationType, message: string, duration = 5000) {
    const id = `${Date.now()}-${Math.random()}`;
    const notification: Notification = { id, type, message, duration };

    notifications.value.push(notification);

    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }
  }

  function remove(id: string) {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
  }

  function success(message: string, duration?: number) {
    show("success", message, duration);
  }

  function error(message: string, duration?: number) {
    show("error", message, duration);
  }

  function warning(message: string, duration?: number) {
    show("warning", message, duration);
  }

  function info(message: string, duration?: number) {
    show("info", message, duration);
  }

  return {
    notifications,
    show,
    remove,
    success,
    error,
    warning,
    info,
  };
});
