<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSesion } from '../composables/useSesion.js';
import { useAvisos } from '../composables/useAvisos.js';

const { usuario, esAdmin, salir } = useSesion();
const { avisar } = useAvisos();
const router = useRouter();
const ruta = useRoute();
const menuAbierto = ref(false);

watch(() => ruta.fullPath, () => { menuAbierto.value = false; });

async function cerrarSesion() {
  await salir().catch(() => {});
  avisar('Sesión cerrada.', 'exito');
  router.push({ name: 'servicios' });
}
</script>

<template>
  <header class="cabecera">
    <div class="cabecera__barra contenedor-cab">
      <RouterLink to="/" class="marca">
        <img src="/icons/favicon.svg" alt="" width="32" height="32" />
        <span>Reservas <small>Centro de Clases Paute</small></span>
      </RouterLink>
      <button
        class="menu-boton" type="button" :aria-expanded="menuAbierto" aria-controls="navegacion"
        @click="menuAbierto = !menuAbierto"
      >
        <span aria-hidden="true">☰</span><span class="visualmente-oculto">Menú</span>
      </button>
      <nav id="navegacion" class="nav" :class="{ 'nav--abierta': menuAbierto }" aria-label="Principal">
        <RouterLink to="/servicios">Servicios</RouterLink>
        <template v-if="usuario">
          <RouterLink to="/reservas">{{ esAdmin ? 'Todas las reservas' : 'Mis reservas' }}</RouterLink>
          <RouterLink to="/reservas/nueva">Reservar</RouterLink>
          <span class="nav__usuario">{{ usuario.nombre }}<span v-if="esAdmin" class="insignia">admin</span></span>
          <button type="button" class="boton boton--secundario boton--pequeno" @click="cerrarSesion">Salir</button>
        </template>
        <template v-else>
          <RouterLink to="/ingresar">Ingresar</RouterLink>
          <RouterLink to="/registro" class="boton boton--pequeno">Crear cuenta</RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.cabecera { background: var(--azul); color: #fff; }
.contenedor-cab { width: min(100% - 2rem, 1040px); margin-inline: auto; }
.cabecera__barra { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; padding-block: 0.6rem; }
.marca { display: flex; align-items: center; gap: 0.6rem; color: #fff; text-decoration: none; font-weight: 700; }
.marca small { display: block; font-weight: 400; font-size: 0.78rem; opacity: 0.9; }
.marca img { border-radius: 8px; background: #fff; }
.menu-boton { min-width: 44px; min-height: 44px; font-size: 1.3rem; color: #fff; background: transparent; border: 1px solid rgb(255 255 255 / 0.5); border-radius: 8px; cursor: pointer; }
.nav { display: none; width: 100%; flex-direction: column; gap: 0.25rem; padding-bottom: 0.5rem; }
.nav--abierta { display: flex; }
.nav a:not(.boton) { color: #fff; text-decoration: none; padding: 0.55rem 0.25rem; border-radius: 6px; }
.nav a:not(.boton):hover { text-decoration: underline; }
.nav a.router-link-exact-active:not(.boton) { font-weight: 700; text-decoration: underline; text-underline-offset: 4px; }
.nav__usuario { opacity: 0.95; padding: 0.4rem 0.25rem; }
.insignia { margin-left: 0.4rem; background: var(--amarillo); color: #000; border-radius: 99px; padding: 0 0.5rem; font-size: 0.75rem; font-weight: 700; }
.nav .boton--pequeno { align-self: flex-start; }
@media (min-width: 52em) {
  .menu-boton { display: none; }
  .nav { display: flex; width: auto; flex-direction: row; align-items: center; gap: 1rem; padding: 0; }
  .nav .boton--pequeno { align-self: auto; }
}
</style>
