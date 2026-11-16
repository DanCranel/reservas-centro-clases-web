/**
 * Cliente HTTP centralizado. TODA la comunicación con la API pasa por aquí:
 *  - valida response.ok y convierte cualquier fallo en un ApiError uniforme,
 *  - aplica un tiempo límite y permite cancelar con AbortController,
 *  - envía la cookie de sesión (mismo origen) y avisa cuando la sesión expira (401).
 */
export class ApiError extends Error {
  constructor({ status = 0, code = 'ERROR', message = 'Ocurrió un error inesperado.', details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Errores de validación por campo -> { campo: mensaje } */
  get erroresPorCampo() {
    return Array.isArray(this.details)
      ? Object.fromEntries(this.details.filter((d) => d.campo).map((d) => [d.campo, d.mensaje]))
      : {};
  }
}

export const esCancelacion = (err) => err?.name === 'AbortError' || err?.code === 'CANCELADA';

const MENSAJES = {
  SIN_CONEXION: 'No hay conexión con el servidor. Revise su internet e intente de nuevo.',
  TIEMPO_AGOTADO: 'El servidor tardó demasiado en responder. Intente de nuevo.',
  RESPUESTA_INVALIDA: 'El servidor respondió con un formato inesperado.',
};

/** Arma la URL con parámetros de consulta, omitiendo los vacíos. */
export function construirUrl(base, ruta, consulta) {
  const params = new URLSearchParams(
    Object.entries(consulta ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ).toString();
  return `${base}${ruta}${params ? `?${params}` : ''}`;
}

async function leerCuerpo(res) {
  if (res.status === 204) return null;
  const tipo = res.headers.get('content-type') ?? '';
  if (!tipo.includes('application/json')) return undefined;
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

export function crearClienteHttp({ base = '/api', fetchImpl = (...a) => globalThis.fetch(...a), timeoutMs = 12000 } = {}) {
  let alNoAutenticado = () => {};

  async function solicitar(metodo, ruta, { cuerpo, consulta, signal } = {}) {
    const tiempo = new AbortController();
    const temporizador = setTimeout(() => tiempo.abort(new DOMException('timeout', 'TimeoutError')), timeoutMs);
    const senal = signal ? AbortSignal.any([signal, tiempo.signal]) : tiempo.signal;
    const esFormulario = typeof FormData !== 'undefined' && cuerpo instanceof FormData;

    let res;
    try {
      res = await fetchImpl(construirUrl(base, ruta, consulta), {
        method: metodo,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', ...(cuerpo && !esFormulario ? { 'Content-Type': 'application/json' } : {}) },
        body: cuerpo ? (esFormulario ? cuerpo : JSON.stringify(cuerpo)) : undefined,
        signal: senal,
      });
    } catch (err) {
      if (signal?.aborted) throw new ApiError({ code: 'CANCELADA', message: 'Petición cancelada.' });
      if (tiempo.signal.aborted) throw new ApiError({ code: 'TIEMPO_AGOTADO', message: MENSAJES.TIEMPO_AGOTADO });
      throw new ApiError({ code: 'SIN_CONEXION', message: MENSAJES.SIN_CONEXION });
    } finally {
      clearTimeout(temporizador);
    }

    const datos = await leerCuerpo(res);
    if (!res.ok) {
      const e = datos?.error;
      const error = new ApiError({
        status: res.status,
        code: e?.code ?? `HTTP_${res.status}`,
        message: e?.message ?? `Error ${res.status} del servidor.`,
        details: e?.details,
      });
      // El service worker responde 503 sin cuerpo cuando no hay red en rutas NetworkOnly.
      if (res.status === 503 && !e) throw new ApiError({ status: 503, code: 'SIN_CONEXION', message: MENSAJES.SIN_CONEXION });
      if (res.status === 401 && ruta !== '/auth/login') alNoAutenticado(error);
      throw error;
    }
    if (datos === undefined) throw new ApiError({ status: res.status, code: 'RESPUESTA_INVALIDA', message: MENSAJES.RESPUESTA_INVALIDA });
    return datos;
  }

  return {
    get: (ruta, op) => solicitar('GET', ruta, op),
    post: (ruta, cuerpo, op) => solicitar('POST', ruta, { ...op, cuerpo }),
    put: (ruta, cuerpo, op) => solicitar('PUT', ruta, { ...op, cuerpo }),
    patch: (ruta, cuerpo, op) => solicitar('PATCH', ruta, { ...op, cuerpo }),
    delete: (ruta, op) => solicitar('DELETE', ruta, op),
    alExpirarSesion: (fn) => { alNoAutenticado = fn; },
  };
}

export const http = crearClienteHttp();
