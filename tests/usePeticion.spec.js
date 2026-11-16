import { describe, it, expect } from 'vitest';
import { usePeticion } from '../src/composables/usePeticion.js';

const diferida = () => {
  let resolver, rechazar;
  const promesa = new Promise((res, rej) => { resolver = res; rechazar = rej; });
  return { promesa, resolver, rechazar };
};

describe('usePeticion', () => {
  it('recorre los estados cargando -> exito / vacio', async () => {
    const d = diferida();
    const p = usePeticion(() => d.promesa);
    expect(p.estado.value).toBe('inactivo');
    const ej = p.ejecutar();
    expect(p.estado.value).toBe('cargando');
    d.resolver([1, 2]);
    await ej;
    expect(p.estado.value).toBe('exito');

    const vacia = usePeticion(async () => []);
    await vacia.ejecutar();
    expect(vacia.estado.value).toBe('vacio');
  });

  it('expone el error', async () => {
    const p = usePeticion(async () => { throw new Error('falló'); });
    await p.ejecutar();
    expect(p.estado.value).toBe('error');
    expect(p.error.value.message).toBe('falló');
  });

  it('evita condiciones de carrera: una respuesta vieja no pisa a la nueva y se aborta', async () => {
    const lenta = diferida();
    const rapida = diferida();
    const senales = [];
    const p = usePeticion((filtro, signal) => { senales.push(signal); return filtro === 'A' ? lenta.promesa : rapida.promesa; });

    const primera = p.ejecutar('A');
    const segunda = p.ejecutar('B');
    expect(senales[0].aborted).toBe(true); // la petición A se canceló
    rapida.resolver(['B']);
    await segunda;
    lenta.resolver(['A']); // llega tarde
    await primera;
    expect(p.datos.value).toEqual(['B']);
    expect(p.cargando.value).toBe(false);
  });

  it('al recargar conserva los datos anteriores (no vuelve a "cargando")', async () => {
    const d = diferida();
    let llamada = 0;
    const p = usePeticion(() => (++llamada === 1 ? Promise.resolve([1]) : d.promesa));
    await p.ejecutar();
    p.ejecutar();
    expect(p.estado.value).toBe('exito');
    expect(p.cargando.value).toBe(true);
    d.resolver([1, 2]);
  });
});
