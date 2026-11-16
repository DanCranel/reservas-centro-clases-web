import { describe, it, expect, vi } from 'vitest';
import { crearClienteHttp, ApiError, construirUrl } from '../src/services/http.js';

const respuesta = (status, cuerpo, tipo = 'application/json') =>
  new Response(cuerpo === undefined ? null : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo), { status, headers: { 'content-type': tipo } });

describe('servicio HTTP', () => {
  it('construye la URL omitiendo filtros vacíos', () => {
    expect(construirUrl('/api', '/reservas', { estado: 'pendiente', fecha: '', page: 2, x: undefined }))
      .toBe('/api/reservas?estado=pendiente&page=2');
  });

  it('devuelve el JSON cuando response.ok y envía la cookie de mismo origen', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respuesta(200, { data: [1] }));
    const http = crearClienteHttp({ fetchImpl });
    await expect(http.get('/servicios')).resolves.toEqual({ data: [1] });
    expect(fetchImpl.mock.calls[0][1].credentials).toBe('same-origin');
  });

  it('serializa el cuerpo JSON con su cabecera', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respuesta(201, { data: { id: 1 } }));
    await crearClienteHttp({ fetchImpl }).post('/reservas', { a: 1 });
    const op = fetchImpl.mock.calls[0][1];
    expect(op.headers['Content-Type']).toBe('application/json');
    expect(op.body).toBe('{"a":1}');
  });

  it('convierte el error uniforme de la API en ApiError con detalles por campo', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respuesta(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: [{ campo: 'fecha', mensaje: 'no puede estar en el pasado' }] },
    }));
    const err = await crearClienteHttp({ fetchImpl }).post('/reservas', {}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect(err.erroresPorCampo).toEqual({ fecha: 'no puede estar en el pasado' });
  });

  it('error sin JSON (p. ej. 502 del proxy) usa un mensaje genérico', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respuesta(502, '<html>Bad gateway</html>', 'text/html'));
    await expect(crearClienteHttp({ fetchImpl }).get('/servicios')).rejects.toMatchObject({ status: 502, code: 'HTTP_502' });
  });

  it('respuesta 200 que no es JSON se rechaza', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respuesta(200, '<html></html>', 'text/html'));
    await expect(crearClienteHttp({ fetchImpl }).get('/servicios')).rejects.toMatchObject({ code: 'RESPUESTA_INVALIDA' });
  });

  it('204 devuelve null', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await expect(crearClienteHttp({ fetchImpl }).delete('/reservas/1')).resolves.toBeNull();
  });

  it('fallo de red -> SIN_CONEXION', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(crearClienteHttp({ fetchImpl }).get('/servicios')).rejects.toMatchObject({ code: 'SIN_CONEXION', status: 0 });
  });

  it('503 vacío del service worker (sin red) -> SIN_CONEXION', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    await expect(crearClienteHttp({ fetchImpl }).get('/reservas')).rejects.toMatchObject({ code: 'SIN_CONEXION' });
  });

  it('cancelación del llamador -> CANCELADA', async () => {
    const fetchImpl = (_u, { signal }) => new Promise((_r, rej) => signal.addEventListener('abort', () => rej(new DOMException('x', 'AbortError'))));
    const ctrl = new AbortController();
    const p = crearClienteHttp({ fetchImpl }).get('/reservas', { signal: ctrl.signal });
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ code: 'CANCELADA' });
  });

  it('tiempo agotado -> TIEMPO_AGOTADO', async () => {
    const fetchImpl = (_u, { signal }) => new Promise((_r, rej) => signal.addEventListener('abort', () => rej(new DOMException('x', 'AbortError'))));
    await expect(crearClienteHttp({ fetchImpl, timeoutMs: 20 }).get('/lento')).rejects.toMatchObject({ code: 'TIEMPO_AGOTADO' });
  });

  it('401 avisa que la sesión expiró (excepto en el login)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respuesta(401, { error: { code: 'UNAUTHENTICATED', message: 'Debe iniciar sesión.' } }));
    const http = crearClienteHttp({ fetchImpl });
    const alExpirar = vi.fn();
    http.alExpirarSesion(alExpirar);
    await http.get('/reservas').catch(() => {});
    await http.post('/auth/login', {}).catch(() => {});
    expect(alExpirar).toHaveBeenCalledTimes(1);
  });
});
