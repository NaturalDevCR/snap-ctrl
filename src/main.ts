import "./polyfills";
import "./assets/main.css";
import "@mdi/font/css/materialdesignicons.css";
import "./assets/mdi-custom.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

import App from "./App.vue";
import { useNotificationStore } from "./stores/notification";

const app = createApp(App);

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);

app.mount("#app");

import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  onNeedRefresh() {
    const notify = useNotificationStore();
    notify.info("New content available. Reloading in 5s…", 5000);
    window.setTimeout(() => updateSW(true), 5000);
  },
  onOfflineReady() {
    const notify = useNotificationStore();
    notify.success("App ready to work offline");
  },
});
