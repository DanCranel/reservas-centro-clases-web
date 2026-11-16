import { createRouter, createWebHistory } from 'vue-router';
import { useSesion } from '../composables/useSesion.js';

export const rutas = [
  { path: '/', name: 'inicio', redirect: () => (useSesion().usuario.value ? { name: 'reservas' } : { name: 'servicios' }) },
  { path: '/servicios', name: 'servicios', component: () => import('../views/ServiciosView.vue'), meta: { titulo: 'Servicios' } },
  { path: '/ingresar', name: 'ingresar', component: () => import('../views/IngresarView.vue'), meta: { titulo: 'Iniciar sesión', soloInvitado: true } },
  { path: '/registro', name: 'registro', component: () => import('../views/RegistroView.vue'), meta: { titulo: 'Crear cuenta', soloInvitado: true } },
  { path: '/reservas', name: 'reservas', component: () => import('../views/ReservasView.vue'), meta: { titulo: 'Mis reservas', requiereSesion: true } },
  { path: '/reservas/nueva', name: 'reserva-nueva', component: () => import('../views/ReservaNuevaView.vue'), meta: { titulo: 'Nueva reserva', requiereSesion: true } },
  {
    path: '/reservas/:id(\\d+)', name: 'reserva', component: () => import('../views/ReservaDetalleView.vue'),
    props: (ruta) => ({ id: Number(ruta.params.id) }), meta: { titulo: 'Detalle de reserva', requiereSesion: true },
  },
  { path: '/:ruta(.*)*', name: 'no-encontrada', component: () => import('../views/NoEncontradaView.vue'), meta: { titulo: 'Página no encontrada' } },
];

/** Guardia pura (sin efectos) para poder probarla de forma aislada. */
export function decidirAcceso(destino, usuario) {
  if (destino.meta.requiereSesion && !usuario) return { name: 'ingresar', query: { volver: destino.fullPath } };
  if (destino.meta.soloInvitado && usuario) return { name: 'reservas' };
  return true;
}

export function crearEnrutador(historial = createWebHistory()) {
  const router = createRouter({
    history: historial,
    routes: rutas,
    scrollBehavior: (_a, _de, guardada) => guardada ?? { top: 0 },
  });

  router.beforeEach(async (destino) => {
    const { verificar, usuario } = useSesion();
    await verificar();
    return decidirAcceso(destino, usuario.value);
  });

  router.afterEach((destino) => {
    document.title = `${destino.meta.titulo ?? 'Reservas'} · Centro de Clases Paute`;
  });

  return router;
}
