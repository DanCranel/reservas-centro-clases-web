/**
 * Servidor de demostración / producción: une la API de la Unidad 2 y esta SPA
 * en el MISMO origen. Así la cookie de sesión, Socket.IO y el service worker
 * funcionan sin CORS ni cookies de terceros.
 *
 *   API_DIR=../reservas-centro-clases-api node deploy/servidor.js
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Carpeta de la API: variable API_DIR o, si no existe, se busca junto a este proyecto.
const candidatas = [process.env.API_DIR, '../reservas-centro-clases-api', '../../Tarea2/reservas-centro-clases-api']
  .filter(Boolean).map((c) => path.resolve(raiz, c));
const API_DIR = candidatas.find((c) => fs.existsSync(path.join(c, 'package.json')));
if (!API_DIR) {
  console.error('No se encontró la API de la Unidad 2. Clónela al lado de este proyecto o defina API_DIR.');
  process.exit(1);
}
const DIST = path.join(raiz, 'dist');
const produccion = process.env.NODE_ENV === 'production';

// Se cargan los módulos de la API (y sus dependencias) desde su propia carpeta.
const requerirApi = createRequire(path.join(API_DIR, 'package.json'));
const express = requerirApi('express');
const { Server } = requerirApi('socket.io');
const config = requerirApi('./src/config');
const { abrirBaseDeDatos } = requerirApi('./src/db/connection');
const { sembrar } = requerirApi('./src/db/seed');
const { crearApp } = requerirApi('./src/app');
const { crearNotificador } = requerirApi('./src/realtime/notificador');

const db = abrirBaseDeDatos(config.dbFile);
await sembrar(db);
const notificador = crearNotificador();
const { app: api, middlewareSesion } = crearApp({ db, config, notificar: notificador.notificar });

const app = express();
app.disable('x-powered-by');
if (produccion) { app.set('trust proxy', 1); api.set('trust proxy', 1); } // detrás del proxy HTTPS de Render

// 1) Archivos de la SPA. index.html y sw.js nunca se cachean en el navegador
//    (para que las actualizaciones lleguen); los assets con hash son inmutables.
app.use(express.static(DIST, {
  setHeaders(res, archivo) {
    const nombre = path.basename(archivo);
    if (nombre === 'index.html' || nombre === 'sw.js' || nombre.endsWith('.webmanifest')) res.set('Cache-Control', 'no-cache');
    else if (archivo.includes(`${path.sep}assets${path.sep}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
  },
}));
// 2) La API (rutas /api/*).
app.use(api);
// 3) Cualquier otra ruta es de la SPA (history mode): se responde index.html.
app.get(/^(?!\/api\/|\/socket\.io\/).*/, (_req, res) => {
  res.set('Cache-Control', 'no-cache').sendFile(path.join(DIST, 'index.html'));
});

const servidor = http.createServer(app);
notificador.conectar(new Server(servidor), middlewareSesion);
const puerto = Number(process.env.PORT) || 8080;
servidor.listen(puerto, () => console.log(`Demo (SPA + API) en http://localhost:${puerto}`));
