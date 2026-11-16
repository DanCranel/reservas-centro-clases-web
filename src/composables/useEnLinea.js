import { ref } from 'vue';

/** Estado de conexión del navegador, compartido (un solo par de listeners). */
const enLinea = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { enLinea.value = true; });
  window.addEventListener('offline', () => { enLinea.value = false; });
}

export const useEnLinea = () => enLinea;
