import { createApp } from 'vue';
import App from './App.vue';
import { crearEnrutador } from './router/index.js';
import './styles/base.css';

createApp(App).use(crearEnrutador()).mount('#app');
