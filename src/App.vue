<script setup>
import { ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppCabecera from './components/AppCabecera.vue';
import AvisoSinConexion from './components/AvisoSinConexion.vue';
import AvisoActualizacion from './components/AvisoActualizacion.vue';
import ListaAvisos from './components/ListaAvisos.vue';
import { useConexionTiempoReal } from './composables/useTiempoReal.js';
import { useSesion } from './composables/useSesion.js';

useConexionTiempoReal();

const ruta = useRoute();
const router = useRouter();
const principal = ref(null);
const { usuario } = useSesion();

// Accesibilidad: al cambiar de página se mueve el foco al contenido principal,
// así un lector de pantalla anuncia la nueva vista.
let primeraCarga = true;
watch(() => ruta.fullPath, async () => {
  if (primeraCarga) { primeraCarga = false; return; }
  await nextTick();
  principal.value?.focus();
});

// Si la sesión expira mientras se usa una ruta privada, se vuelve al login.
watch(usuario, (u, antes) => {
  if (antes && !u && ruta.meta.requiereSesion) router.replace({ name: 'ingresar', query: { volver: ruta.fullPath } });
});
</script>

<template>
  <a class="saltar" href="#contenido">Saltar al contenido</a>
  <AppCabecera />
  <AvisoSinConexion />
  <main id="contenido" ref="principal" tabindex="-1" class="contenedor">
    <RouterView />
  </main>
  <ListaAvisos />
  <AvisoActualizacion />
</template>
