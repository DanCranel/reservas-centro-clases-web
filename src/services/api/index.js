/**
 * Funciones por recurso de la API. Las vistas nunca llaman a fetch directamente.
 * Cada función devuelve ya el contenido útil (data) y acepta un AbortSignal.
 */
import { http } from '../http.js';

const datos = (r) => r.data;

export const authApi = {
  yo: (signal) => http.get('/auth/me', { signal }).then(datos),
  ingresar: (credenciales) => http.post('/auth/login', credenciales).then(datos),
  registrar: (cuenta) => http.post('/auth/register', cuenta).then(datos),
  salir: () => http.post('/auth/logout'),
};

export const serviciosApi = {
  listar: (signal) => http.get('/servicios', { signal }).then(datos),
};

export const reservasApi = {
  /** Devuelve { data, meta } completo porque la vista necesita la paginación. */
  listar: (filtros, signal) => http.get('/reservas', { consulta: filtros, signal }),
  obtener: (id, signal) => http.get(`/reservas/${id}`, { signal }).then(datos),
  crear: (reserva) => http.post('/reservas', reserva).then(datos),
  actualizar: (id, cambios) => http.patch(`/reservas/${id}`, cambios).then(datos),
  eliminar: (id) => http.delete(`/reservas/${id}`),
  subirComprobante(id, archivo) {
    const formulario = new FormData();
    formulario.append('comprobante', archivo);
    return http.put(`/reservas/${id}/comprobante`, formulario).then(datos);
  },
  urlComprobante: (id) => `/api/reservas/${id}/comprobante`,
};
