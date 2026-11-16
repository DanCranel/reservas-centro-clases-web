import { reactive, computed, readonly } from 'vue';
import { authApi } from '../services/api/index.js';
import { http } from '../services/http.js';

/**
 * ÚNICO estado global de la app: quién inició sesión. Lo necesitan el router
 * (guardias), la cabecera y el tiempo real. Lo demás vive en cada vista.
 */
const estado = reactive({ usuario: null, verificada: false });
let verificacion = null;

// Copia mínima (id, nombre, rol) en sessionStorage: solo para que, SIN conexión,
// la interfaz recuerde quién usaba esta pestaña. Nunca se guardan reservas ni
// contraseñas, y se borra al cerrar la pestaña o la sesión.
const CLAVE = 'reservas.usuario';
const guardarCopia = (u) => {
  try {
    if (u) sessionStorage.setItem(CLAVE, JSON.stringify({ id: u.id, nombre: u.nombre, rol: u.rol }));
    else sessionStorage.removeItem(CLAVE);
  } catch { /* almacenamiento no disponible */ }
};
const leerCopia = () => {
  try { return JSON.parse(sessionStorage.getItem(CLAVE)); } catch { return null; }
};
const fijarUsuario = (u) => { estado.usuario = u; guardarCopia(u); };

http.alExpirarSesion(() => fijarUsuario(null));

// Al recuperar la conexión se vuelve a confirmar la sesión con el servidor.
if (typeof window !== 'undefined') window.addEventListener('online', () => { verificacion = null; useSesion().verificar(); });

export function useSesion() {
  /** Pregunta al servidor por la sesión actual (una sola vez, compartida). */
  function verificar() {
    verificacion ??= authApi.yo()
      .then(fijarUsuario)
      .catch((err) => {
        // Sin red no se sabe si la sesión sigue viva: se usa la copia de la pestaña.
        if (err?.code === 'SIN_CONEXION' || err?.code === 'TIEMPO_AGOTADO') estado.usuario = leerCopia();
        else fijarUsuario(null);
      })
      .finally(() => { estado.verificada = true; });
    return verificacion;
  }

  async function ingresar(credenciales) {
    fijarUsuario(await authApi.ingresar(credenciales));
    estado.verificada = true;
    return estado.usuario;
  }

  async function registrar(cuenta) {
    fijarUsuario(await authApi.registrar(cuenta));
    estado.verificada = true;
    return estado.usuario;
  }

  async function salir() {
    try { await authApi.salir(); } finally { fijarUsuario(null); }
  }

  return {
    sesion: readonly(estado),
    usuario: computed(() => estado.usuario),
    esAdmin: computed(() => estado.usuario?.rol === 'admin'),
    verificar, ingresar, registrar, salir,
  };
}

/** Solo para pruebas. */
export const _reiniciarSesion = () => { estado.usuario = null; estado.verificada = false; verificacion = null; };
