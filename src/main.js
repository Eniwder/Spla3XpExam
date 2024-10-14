/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins';

// Components
import App from './App.vue';
import i18n from "./i18n";
// Composables
import { createApp } from 'vue';

const app = createApp(App);

registerPlugins(app);
app.use(i18n);

app.mount('#app');
