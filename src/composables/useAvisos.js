import { reactive, readonly } from 'vue';

/** Mensajes emergentes (toasts) compartidos por toda la app. */
const avisos = reactive([]);
let siguienteId = 1;

export function useAvisos() {
  function quitar(id) {
    const i = avisos.findIndex((a) => a.id === id);
    if (i >= 0) avisos.splice(i, 1);
  }
  function avisar(texto, tipo = 'info', duracionMs = 5000) {
    const id = siguienteId++;
    avisos.push({ id, texto, tipo });
    if (avisos.length > 4) avisos.shift();
    if (duracionMs) setTimeout(() => quitar(id), duracionMs);
    return id;
  }
  return { avisos: readonly(avisos), avisar, quitar };
}
