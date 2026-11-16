import { ref, computed, shallowRef, onScopeDispose, getCurrentScope } from 'vue';
import { esCancelacion } from '../services/http.js';

/**
 * Ejecuta una petición y expone su estado: 'inactivo' | 'cargando' | 'exito' | 'vacio' | 'error'.
 *
 * Evita condiciones de carrera: cada nueva ejecución CANCELA la anterior
 * (AbortController) y además solo se aplica la respuesta de la última
 * ejecución (contador), así una respuesta lenta nunca pisa a una más nueva.
 */
export function usePeticion(fn, { esVacio = (d) => Array.isArray(d) && d.length === 0 } = {}) {
  const datos = shallowRef(null);
  const error = shallowRef(null);
  const cargando = ref(false);
  const ejecutada = ref(false);
  let controlador = null;
  let turno = 0;

  async function ejecutar(...args) {
    controlador?.abort();
    controlador = new AbortController();
    const miTurno = ++turno;
    cargando.value = true;
    error.value = null;
    try {
      const resultado = await fn(...args, controlador.signal);
      if (miTurno !== turno) return undefined; // llegó tarde: se descarta
      datos.value = resultado;
      ejecutada.value = true;
      return resultado;
    } catch (err) {
      if (miTurno !== turno || esCancelacion(err)) return undefined;
      error.value = err;
      ejecutada.value = true;
      return undefined;
    } finally {
      if (miTurno === turno) cargando.value = false;
    }
  }

  const cancelar = () => {
    controlador?.abort();
    turno += 1;
    cargando.value = false;
  };

  if (getCurrentScope()) onScopeDispose(cancelar); // al salir de la vista se cancela lo pendiente

  const estado = computed(() => {
    if (cargando.value && datos.value === null) return 'cargando';
    if (error.value) return 'error';
    if (!ejecutada.value) return 'inactivo';
    return esVacio(datos.value) ? 'vacio' : 'exito';
  });

  return { datos, error, cargando, estado, ejecutar, cancelar };
}
