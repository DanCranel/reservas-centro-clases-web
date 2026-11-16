import { watch, onScopeDispose } from 'vue';
import { io } from 'socket.io-client';
import { useSesion } from './useSesion.js';
import { useAvisos } from './useAvisos.js';

/**
 * Conexión Socket.IO ligada a la sesión: se abre al iniciar sesión y se cierra
 * al salir. Las vistas se suscriben con alCambiarReserva() y reciben un
 * desuscriptor (se limpia solo al desmontar el componente).
 */
const oyentes = new Set();
const propios = new Map(); // id de reserva -> momento en que ESTA pestaña la modificó
let socket = null;

/** Evita mostrar un aviso por un cambio que acaba de hacer el propio usuario. */
export function registrarCambioPropio(id) {
  propios.set(id, Date.now());
}
const esPropio = (evento, datos, usuarioId) =>
  (evento === 'reserva:creada' && datos.usuarioId === usuarioId) ||
  Date.now() - (propios.get(datos.id) ?? 0) < 5000;

const TEXTOS = {
  'reserva:creada': (r) => `Nueva reserva #${r.id}: ${r.estudianteNombre}, ${r.fecha} ${r.horaInicio}.`,
  'reserva:actualizada': (r) => `Reserva #${r.id} ahora está ${r.estado}.`,
  'reserva:eliminada': (r) => `Se eliminó la reserva #${r.id}.`,
  'reserva:comprobante': (r) => `Se subió el comprobante de la reserva #${r.id}.`,
};

function conectar(avisar, usuarioId) {
  socket = io({ transports: ['websocket', 'polling'], reconnectionDelayMax: 10000 });
  Object.keys(TEXTOS).forEach((evento) => {
    socket.on(evento, ({ datos }) => {
      if (!esPropio(evento, datos, usuarioId)) avisar(TEXTOS[evento](datos), 'info');
      oyentes.forEach((fn) => fn(evento, datos));
    });
  });
}

function desconectar() {
  socket?.disconnect();
  socket = null;
}

/** Se llama una vez en App.vue. */
export function useConexionTiempoReal() {
  const { usuario } = useSesion();
  const { avisar } = useAvisos();
  watch(() => usuario.value?.id, (id) => {
    desconectar();
    if (id) conectar(avisar, id);
  }, { immediate: true });
  onScopeDispose(desconectar);
}

/** Suscripción desde una vista. */
export function alCambiarReserva(fn) {
  oyentes.add(fn);
  const quitar = () => oyentes.delete(fn);
  onScopeDispose(quitar);
  return quitar;
}
