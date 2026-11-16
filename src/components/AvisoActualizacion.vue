<script setup>
// Registro del service worker (vite-plugin-pwa). Con registerType 'prompt'
// la nueva versión espera a que el usuario la acepte.
import { useRegisterSW } from 'virtual:pwa-register/vue';

const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW();
const cerrar = () => { needRefresh.value = false; offlineReady.value = false; };
</script>

<template>
  <div v-if="needRefresh || offlineReady" class="pwa tarjeta" role="alertdialog" aria-labelledby="pwa-texto">
    <p id="pwa-texto">
      {{ needRefresh ? 'Hay una nueva versión de la aplicación.' : 'La aplicación ya funciona sin conexión.' }}
    </p>
    <div class="fila-acciones">
      <button v-if="needRefresh" class="boton boton--pequeno" type="button" @click="updateServiceWorker(true)">Actualizar</button>
      <button class="boton boton--secundario boton--pequeno" type="button" @click="cerrar">Cerrar</button>
    </div>
  </div>
</template>

<style scoped>
.pwa { position: fixed; left: 1rem; bottom: 1rem; z-index: 40; max-width: 22rem; }
.pwa p { margin: 0 0 0.5rem; }
</style>
