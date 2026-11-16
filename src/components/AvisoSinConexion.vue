<script setup>
import { useEnLinea } from '../composables/useEnLinea.js';
const enLinea = useEnLinea();
</script>

<template>
  <div v-if="!enLinea" class="sin-conexion" role="status">
    <strong>Sin conexión.</strong> Puede ver el catálogo guardado; las reservas y los cambios necesitan internet.
  </div>
</template>

<style scoped>
.sin-conexion { background: var(--aviso-fondo); border-bottom: 1px solid #e8c766; padding: 0.6rem 1rem; text-align: center; }
</style>
