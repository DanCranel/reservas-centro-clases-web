<script setup>
import ReservaTarjeta from './ReservaTarjeta.vue';
/** Lista con claves estables (id de la reserva). Reenvía los eventos de cada tarjeta. */
defineProps({
  reservas: { type: Array, required: true },
  esAdmin: { type: Boolean, default: false },
  idOcupado: { type: Number, default: null },
});
defineEmits(['confirmar', 'cancelar']);
</script>

<template>
  <ul class="lista rejilla rejilla--2" role="list">
    <li v-for="r in reservas" :key="r.id">
      <ReservaTarjeta
        :reserva="r" :es-admin="esAdmin" :ocupada="idOcupado === r.id"
        @confirmar="$emit('confirmar', $event)" @cancelar="$emit('cancelar', $event)"
      />
    </li>
  </ul>
</template>

<style scoped>
.lista { list-style: none; padding: 0; margin: 0; }
</style>
