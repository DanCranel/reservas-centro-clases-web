<script setup>
import { ESTADOS } from '../services/reglas.js';
/**
 * Filtros controlados: recibe el valor por v-model y emite un objeto NUEVO
 * en cada cambio (nunca muta la prop).
 */
const props = defineProps({
  modelValue: { type: Object, required: true },
  servicios: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);
const cambiar = (campo, valor) => emit('update:modelValue', { ...props.modelValue, [campo]: valor || undefined, page: 1 });
const limpiar = () => emit('update:modelValue', { page: 1 });
</script>

<template>
  <form class="filtros tarjeta" role="search" aria-label="Filtrar reservas" @submit.prevent>
    <div class="filtros__campo">
      <label for="f-fecha">Fecha</label>
      <input id="f-fecha" type="date" :value="modelValue.fecha ?? ''" @change="cambiar('fecha', $event.target.value)" />
    </div>
    <div class="filtros__campo">
      <label for="f-estado">Estado</label>
      <select id="f-estado" :value="modelValue.estado ?? ''" @change="cambiar('estado', $event.target.value)">
        <option value="">Todos</option>
        <option v-for="e in ESTADOS" :key="e" :value="e">{{ e }}</option>
      </select>
    </div>
    <div class="filtros__campo">
      <label for="f-servicio">Servicio</label>
      <select id="f-servicio" :value="modelValue.servicioId ?? ''" @change="cambiar('servicioId', $event.target.value)">
        <option value="">Todos</option>
        <option v-for="s in servicios" :key="s.id" :value="String(s.id)">{{ s.nombre }}</option>
      </select>
    </div>
    <button type="button" class="boton boton--secundario" @click="limpiar">Limpiar filtros</button>
  </form>
</template>

<style scoped>
.filtros { display: grid; gap: 0.75rem; align-items: end; margin-bottom: 1rem; }
.filtros__campo { display: grid; gap: 0.25rem; }
label { font-weight: 600; font-size: 0.92rem; }
@media (min-width: 48em) { .filtros { grid-template-columns: repeat(3, 1fr) auto; } }
</style>
