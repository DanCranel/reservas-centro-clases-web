<script setup>
import { computed } from 'vue';
import EtiquetaEstado from './EtiquetaEstado.vue';
import { formatoFecha } from '../services/reglas.js';

/** Presentación de UNA reserva. No llama a la API: solo emite la intención. */
const props = defineProps({
  reserva: { type: Object, required: true },
  esAdmin: { type: Boolean, default: false },
  ocupada: { type: Boolean, default: false },
});
defineEmits(['confirmar', 'cancelar']);

const activa = computed(() => props.reserva.estado !== 'cancelada');
</script>

<template>
  <article class="tarjeta reserva" :aria-labelledby="`reserva-${reserva.id}`">
    <header class="reserva__cabecera">
      <h2 :id="`reserva-${reserva.id}`">
        <RouterLink :to="{ name: 'reserva', params: { id: reserva.id } }">{{ reserva.estudianteNombre }}</RouterLink>
      </h2>
      <EtiquetaEstado :estado="reserva.estado" />
    </header>
    <p class="reserva__servicio">{{ reserva.servicio.nombre }}</p>
    <p class="texto-suave">
      <time :datetime="reserva.fecha">{{ formatoFecha(reserva.fecha) }}</time>,
      {{ reserva.horaInicio }}–{{ reserva.horaFin }}
      <span v-if="reserva.tieneComprobante"> · comprobante adjunto</span>
    </p>
    <div v-if="activa" class="fila-acciones">
      <button
        v-if="esAdmin && reserva.estado === 'pendiente'" type="button" class="boton boton--pequeno"
        :disabled="ocupada" @click="$emit('confirmar', reserva)"
      >Confirmar<span class="visualmente-oculto"> reserva de {{ reserva.estudianteNombre }}</span></button>
      <button
        type="button" class="boton boton--peligro boton--pequeno" :disabled="ocupada" @click="$emit('cancelar', reserva)"
      >Cancelar<span class="visualmente-oculto"> reserva de {{ reserva.estudianteNombre }}</span></button>
      <RouterLink class="boton boton--secundario boton--pequeno" :to="{ name: 'reserva', params: { id: reserva.id } }">
        Ver detalle<span class="visualmente-oculto"> de {{ reserva.estudianteNombre }}</span>
      </RouterLink>
    </div>
  </article>
</template>

<style scoped>
.reserva { display: grid; gap: 0.35rem; }
.reserva p { margin: 0; }
.reserva__cabecera { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.reserva h2 { margin: 0; font-size: 1.05rem; }
.reserva__servicio { font-weight: 600; }
.fila-acciones { margin-top: 0.4rem; }
</style>
