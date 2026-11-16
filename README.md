# Reservas · Centro de Clases Paute: SPA/PWA con Vue 3

Tarea Unidad 3 · Aplicaciones Web · Universidad Politécnica Salesiana
Autor: Daniel Morales

Aplicación de una sola página (Vue 3 + Vite + Vue Router) que consume la [API REST de la Unidad 2](https://github.com/DanCranel/reservas-centro-clases-api). Es instalable como PWA y funciona sin conexión de forma limitada y segura.

**Demo:** ver el enlace en el informe (Render, plan gratuito: la primera visita puede tardar ~50 s en despertar).
Cuentas de prueba: `maria@correo.com / Maria123!` (estudiante) · `admin@tejiendoredes.ec / Admin123!` (administración).

## Funcionalidades

- Catálogo de servicios (público), registro e inicio de sesión.
- Mis reservas / todas las reservas (admin): filtros guardados en la URL, paginación y acciones de confirmar y cancelar.
- Nueva reserva y detalle con reprogramación, cancelación, eliminación y subida del comprobante de pago.
- Avisos en tiempo real (Socket.IO): la administración ve las reservas nuevas al instante y la estudiante ve cuando le confirman.
- Estados de **carga, éxito, vacío y error** en todas las vistas, con botón *Reintentar*.
- Responsive (mobile first), accesible (WCAG 2.1 AA: 0 infracciones con axe-core) e instalable.

## Ejecutar en local

Requisitos: Node.js 22.13 o superior y el repositorio de la API clonado **al lado** de este:

```
Tarea2/reservas-centro-clases-api      ← API (Unidad 2)
Tarea3/reservas-centro-clases-web      ← este proyecto
```

```bash
npm install
npm test            # 35 pruebas (Vitest)

# Opción A: desarrollo (dos terminales)
cd ../../Tarea2/reservas-centro-clases-api && npm start   # API en :3000
npm run dev                                                # SPA en http://localhost:5173 (proxy a :3000)

# Opción B: como en producción, con service worker (una terminal)
npm run demo        # http://localhost:8080 (encuentra la API sola; o defina API_DIR)
```

La primera vez, instale también las dependencias de la API (`npm install` dentro de su carpeta).

## Arquitectura

```
src/
  services/http.js        ÚNICO punto de acceso HTTP: response.ok, ApiError, timeout, cancelación, 401
  services/api/           Funciones por recurso (authApi, serviciosApi, reservasApi)
  services/reglas.js      Validaciones puras (las mismas reglas que la API)
  composables/            usePeticion (estados + anti-carrera), useAccion (sin doble envío),
                          useSesion (único estado global), useTiempoReal, useAvisos, useEnLinea
  components/             Presentación: reciben props y emiten eventos; no llaman a la API
  views/                  Una por ruta; orquestan datos y componentes (carga diferida)
  router/                 Rutas, guardias de sesión (función pura decidirAcceso)
deploy/servidor.js        Sirve la SPA + la API de la U2 en el mismo origen (Render / demo local)
docs/                     Diagrama de componentes y evidencias
```

Diagrama: [`docs/diagrama-componentes.png`](docs/diagrama-componentes.png)

### Estrategia de API

- Mismo origen (proxy de Vite en desarrollo y `deploy/servidor.js` en producción), así que la cookie de sesión `HttpOnly` funciona sin CORS.
- Toda respuesta pasa por `http.js`. Si `response.ok` es falso, se lanza un `ApiError { status, code, message, details }` a partir del formato uniforme de la API, y los `details` se muestran por campo en los formularios.
- Fallo de red, 503 del service worker o tiempo agotado (12 s) dan `SIN_CONEXION` o `TIEMPO_AGOTADO` con un mensaje claro. Un 401 cierra la sesión local y lleva al login.
- **Condiciones de carrera:** `usePeticion` aborta la petición anterior con `AbortController` y descarta respuestas que llegan tarde mediante un contador de turno (p. ej. al cambiar filtros rápido). Al salir de la vista se cancela lo pendiente.
- **Mutaciones:** `useAccion` bloquea el doble envío. Los `PATCH` envían `version` (concurrencia optimista de la API) y, ante `409 VERSION_CONFLICTO`, se avisa y se recargan los datos actuales.

### Estrategia de caché (service worker, Workbox)

| Recurso | Estrategia | Motivo |
|---|---|---|
| App shell (HTML, JS, CSS, íconos) | Precache + `navigateFallback` | La app abre sin conexión |
| `GET /api/servicios` | StaleWhileRevalidate (24 h, 5 entradas) | Catálogo público: rápido y disponible offline |
| Resto de `/api/*` (sesión, reservas, comprobantes) | NetworkOnly | Datos personales: **nunca** se guardan en caché |
| `/socket.io` | Excluido | Tiempo real solo en línea |

Sin conexión no se envían ni se encolan reservas, para evitar duplicados al reconectar. Los formularios se deshabilitan con un aviso. Solo se guarda en `sessionStorage` el nombre y rol del usuario de la pestaña, para que la interfaz no lo dé por desconectado. Las actualizaciones del SW son tipo *prompt*: el usuario decide cuándo recargar.

## Despliegue en Render

`render.yaml` crea un servicio web que clona la API, construye la SPA y ejecuta `deploy/servidor.js`. En Render: **New + → Blueprint →** este repositorio.

## Pruebas y evidencias

- `npm test`: 35 pruebas (servicio HTTP, anti-carrera, validaciones, componentes, guardias).
- Recorrido E2E (`e2e/recorrido.cjs`, instrucciones en su primera línea) con Playwright contra el servidor real: 30 comprobaciones (flujos, 401/409, tiempo real, instalabilidad, offline, axe-core). Resultado en [`docs/evidencias/recorrido-e2e.txt`](docs/evidencias/recorrido-e2e.txt) y capturas en `docs/evidencias/`.
