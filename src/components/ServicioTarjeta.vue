<script setup>
import { precio } from '../services/reglas.js';
defineProps({
  servicio: { type: Object, required: true },
  puedeReservar: { type: Boolean, default: false },
});
</script>

<template>
  <article class="tarjeta servicio">
    <h2>{{ servicio.nombre }}</h2>
    <p class="texto-suave">{{ servicio.descripcion }}</p>
    <dl class="servicio__datos">
      <div><dt>Precio</dt><dd>{{ precio(servicio.precioCentavos) }} / hora</dd></div>
      <div><dt>Cupo por horario</dt><dd>{{ servicio.cupo }} estudiantes</dd></div>
    </dl>
    <RouterLink
      v-if="puedeReservar"
      class="boton"
      :to="{ name: 'reserva-nueva', query: { servicioId: servicio.id } }"
    >Reservar<span class="visualmente-oculto"> {{ servicio.nombre }}</span></RouterLink>
    <RouterLink v-else class="boton boton--secundario" :to="{ name: 'ingresar', query: { volver: `/reservas/nueva?servicioId=${servicio.id}` } }">
      Ingresar para reservar<span class="visualmente-oculto"> {{ servicio.nombre }}</span>
    </RouterLink>
  </article>
</template>

<style scoped>
.servicio { display: flex; flex-direction: column; gap: 0.5rem; }
.servicio p { margin: 0; flex: 1; }
.servicio__datos { display: flex; gap: 1.5rem; margin: 0; }
.servicio__datos dt { font-size: 0.82rem; color: var(--texto-suave); }
.servicio__datos dd { margin: 0; font-weight: 700; }
.servicio .boton { align-self: flex-start; }
</style>
