import { ref, shallowRef } from 'vue';

/**
 * Para operaciones que MODIFICAN datos (crear, cancelar, subir...).
 * Bloquea envíos dobles mientras hay una en curso y guarda el último error.
 * No se cancelan: abortar un POST no garantiza que el servidor no lo procese.
 */
export function useAccion(fn) {
  const enviando = ref(false);
  const error = shallowRef(null);

  async function ejecutar(...args) {
    if (enviando.value) return { ok: false, duplicada: true };
    enviando.value = true;
    error.value = null;
    try {
      return { ok: true, valor: await fn(...args) };
    } catch (err) {
      error.value = err;
      return { ok: false, error: err };
    } finally {
      enviando.value = false;
    }
  }

  return { enviando, error, ejecutar };
}
