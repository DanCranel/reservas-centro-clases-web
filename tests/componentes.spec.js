import { describe, it, expect } from 'vitest';
import { mount, RouterLinkStub } from '@vue/test-utils';
import ReservaFormulario from '../src/components/ReservaFormulario.vue';
import ReservaTarjeta from '../src/components/ReservaTarjeta.vue';
import ReservaFiltros from '../src/components/ReservaFiltros.vue';
import EstadoPeticion from '../src/components/EstadoPeticion.vue';
import { decidirAcceso } from '../src/router/index.js';

const global = { stubs: { RouterLink: RouterLinkStub } };
const servicios = [{ id: 2, nombre: 'Clases de recuperación', precioCentavos: 800, cupo: 4 }];
const reserva = {
  id: 7, estudianteNombre: 'Sofía', servicio: { id: 2, nombre: 'Clases de recuperación' }, fecha: '2026-11-17',
  horaInicio: '15:00', horaFin: '16:00', duracionMin: 60, notas: '', estado: 'pendiente', tieneComprobante: false, version: 1,
};

describe('ReservaFormulario', () => {
  it('no emite si hay errores y marca los campos con aria-invalid', async () => {
    const w = mount(ReservaFormulario, { props: { servicios }, global, attachTo: document.body });
    await w.find('form').trigger('submit');
    expect(w.emitted('enviar')).toBeUndefined();
    expect(w.find('[role="alert"]').text()).toMatch(/Revise/);
    expect(w.find('#estudiante').attributes('aria-invalid')).toBe('true');
    expect(w.find('#estudiante').attributes('aria-describedby')).toBe('estudiante-error');
    w.unmount();
  });

  it('emite un objeto limpio y no muta la prop "inicial"', async () => {
    const inicial = Object.freeze({ servicioId: 2 });
    const w = mount(ReservaFormulario, { props: { servicios, inicial }, global });
    await w.find('#estudiante').setValue('  Mateo  ');
    await w.find('#fecha').setValue('2099-11-17'); // martes
    await w.find('#hora').setValue('10:00');
    await w.find('form').trigger('submit');
    expect(w.emitted('enviar')[0][0]).toEqual({ servicioId: 2, estudianteNombre: 'Mateo', fecha: '2099-11-17', horaInicio: '10:00', duracionMin: 60 });
    expect(inicial).toEqual({ servicioId: 2 });
  });

  it('muestra los errores que devuelve el servidor por campo', () => {
    const w = mount(ReservaFormulario, { props: { servicios, erroresServidor: { fecha: 'no puede estar en el pasado' } }, global });
    return w.setProps({ erroresServidor: { fecha: 'no puede estar en el pasado' } }).then(() => {
      expect(w.find('#fecha-error').text()).toBe('no puede estar en el pasado');
    });
  });

  it('en modo edición no permite cambiar el servicio', () => {
    const w = mount(ReservaFormulario, { props: { servicios, inicial: { servicioId: 2 }, modoEdicion: true }, global });
    expect(w.find('#servicio').attributes('disabled')).toBeDefined();
  });
});

describe('ReservaTarjeta', () => {
  it('solo administración ve "Confirmar"; emite la reserva sin modificarla', async () => {
    const est = mount(ReservaTarjeta, { props: { reserva }, global });
    expect(est.text()).not.toMatch(/Confirmar/);
    const adm = mount(ReservaTarjeta, { props: { reserva, esAdmin: true }, global });
    await adm.findAll('button')[0].trigger('click');
    expect(adm.emitted('confirmar')[0][0]).toBe(reserva);
  });

  it('una reserva cancelada no muestra acciones', () => {
    const w = mount(ReservaTarjeta, { props: { reserva: { ...reserva, estado: 'cancelada' }, esAdmin: true }, global });
    expect(w.findAll('button')).toHaveLength(0);
  });
});

describe('ReservaFiltros', () => {
  it('emite un objeto nuevo y reinicia la página', async () => {
    const modelValue = Object.freeze({ estado: 'pendiente', page: 3 });
    const w = mount(ReservaFiltros, { props: { modelValue, servicios } });
    await w.find('#f-fecha').setValue('2026-11-20');
    expect(w.emitted('update:modelValue')[0][0]).toEqual({ estado: 'pendiente', fecha: '2026-11-20', page: 1 });
  });
});

describe('EstadoPeticion', () => {
  it.each([
    ['cargando', /Cargando/],
    ['vacio', /No hay datos/],
    ['error', /No se pudo cargar\. Sin red/],
  ])('estado %s', (estado, texto) => {
    const w = mount(EstadoPeticion, { props: { estado, error: { message: 'Sin red' } }, slots: { default: 'CONTENIDO' } });
    expect(w.text()).toMatch(texto);
    expect(w.text()).not.toMatch(/CONTENIDO/);
  });

  it('éxito muestra el contenido y el error permite reintentar', async () => {
    expect(mount(EstadoPeticion, { props: { estado: 'exito' }, slots: { default: 'CONTENIDO' } }).text()).toBe('CONTENIDO');
    const w = mount(EstadoPeticion, { props: { estado: 'error', error: { message: 'x' } } });
    await w.find('button').trigger('click');
    expect(w.emitted('reintentar')).toHaveLength(1);
  });
});

describe('guardias del router', () => {
  const privada = { meta: { requiereSesion: true }, fullPath: '/reservas?estado=pendiente' };
  it('ruta privada sin sesión -> login con retorno', () => {
    expect(decidirAcceso(privada, null)).toEqual({ name: 'ingresar', query: { volver: '/reservas?estado=pendiente' } });
  });
  it('login con sesión -> reservas; ruta pública siempre pasa', () => {
    expect(decidirAcceso({ meta: { soloInvitado: true } }, { id: 1 })).toEqual({ name: 'reservas' });
    expect(decidirAcceso({ meta: {} }, null)).toBe(true);
    expect(decidirAcceso(privada, { id: 1 })).toBe(true);
  });
});
