import { describe, it, expect } from 'vitest';
import { validarReserva, validarCredenciales } from '../src/services/reglas.js';

const valida = { servicioId: 2, estudianteNombre: 'Sofía', fecha: '2026-11-17', horaInicio: '15:00', duracionMin: 60 };
const HOY = '2026-11-16';

describe('reglas de validación (mismas que la API)', () => {
  it('reserva válida no tiene errores', () => expect(validarReserva(valida, HOY)).toEqual({}));
  it('fecha pasada', () => expect(validarReserva({ ...valida, fecha: '2026-11-10' }, HOY).fecha).toMatch(/pasado/));
  it('domingo', () => expect(validarReserva({ ...valida, fecha: '2026-11-22' }, HOY).fecha).toMatch(/lunes a sábado/));
  it('antes de abrir y después de cerrar', () => {
    expect(validarReserva({ ...valida, horaInicio: '07:30' }, HOY).horaInicio).toMatch(/08:00/);
    expect(validarReserva({ ...valida, horaInicio: '19:30', duracionMin: 60 }, HOY).horaInicio).toMatch(/20:00/);
  });
  it('campos obligatorios', () => {
    expect(Object.keys(validarReserva({}, HOY)).sort()).toEqual(['duracionMin', 'estudianteNombre', 'fecha', 'horaInicio', 'servicioId']);
  });
  it('credenciales de registro exigen contraseña fuerte', () => {
    expect(validarCredenciales({ nombre: 'Ana', email: 'ana@correo.com', password: 'abc' }, { registro: true }).password).toBeTruthy();
    expect(validarCredenciales({ nombre: 'Ana', email: 'ana@correo.com', password: 'Clave1234' }, { registro: true })).toEqual({});
  });
});
