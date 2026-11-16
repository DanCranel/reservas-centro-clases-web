/**
 * Reglas de validación del lado del cliente (funciones puras). Son las MISMAS
 * reglas que aplica la API: dan retroalimentación inmediata, pero el servidor
 * sigue siendo la autoridad y sus errores también se muestran por campo.
 */
export const DURACIONES = [60, 90, 120];
export const ESTADOS = ['pendiente', 'confirmada', 'cancelada'];

const aMinutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const hoyLocal = (zona = 'America/Guayaquil') =>
  new Intl.DateTimeFormat('en-CA', { timeZone: zona }).format(new Date());

export function validarReserva(r, hoy = hoyLocal()) {
  const errores = {};
  if (!r.servicioId) errores.servicioId = 'Elija un servicio.';
  if (!r.estudianteNombre || r.estudianteNombre.trim().length < 2) errores.estudianteNombre = 'Escriba el nombre del estudiante (mínimo 2 letras).';
  else if (r.estudianteNombre.trim().length > 80) errores.estudianteNombre = 'Máximo 80 caracteres.';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.fecha ?? '')) errores.fecha = 'Elija una fecha.';
  else if (r.fecha < hoy) errores.fecha = 'La fecha no puede estar en el pasado.';
  else if (new Date(`${r.fecha}T12:00:00Z`).getUTCDay() === 0) errores.fecha = 'El centro atiende de lunes a sábado.';

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.horaInicio ?? '')) errores.horaInicio = 'Elija una hora.';
  else if (aMinutos(r.horaInicio) < 8 * 60) errores.horaInicio = 'El centro abre a las 08:00.';
  else if (aMinutos(r.horaInicio) + Number(r.duracionMin) > 20 * 60) errores.horaInicio = 'La clase debe terminar hasta las 20:00.';

  if (!DURACIONES.includes(Number(r.duracionMin))) errores.duracionMin = 'Elija 60, 90 o 120 minutos.';
  if ((r.notas ?? '').length > 500) errores.notas = 'Máximo 500 caracteres.';
  return errores;
}

export function validarCredenciales({ email, password, nombre }, { registro = false } = {}) {
  const errores = {};
  if (registro && (!nombre || nombre.trim().length < 2)) errores.nombre = 'Escriba su nombre (mínimo 2 letras).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((email ?? '').trim())) errores.email = 'Escriba un correo válido.';
  if (!password) errores.password = 'Escriba su contraseña.';
  else if (registro && (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) {
    errores.password = 'Mínimo 8 caracteres, con letras y números.';
  }
  return errores;
}

export const formatoFecha = (iso) =>
  new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${iso}T12:00:00Z`));

export const precio = (centavos) => `$${(centavos / 100).toFixed(2)}`;
