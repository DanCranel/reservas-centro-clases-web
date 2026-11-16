<script setup>
defineProps({ estado: { type: String, required: true } });
</script>

<template>
  <span class="etiqueta" :class="`etiqueta--${estado}`">{{ estado }}</span>
</template>

<style scoped>
.etiqueta { display: inline-block; padding: 0.05rem 0.6rem; border-radius: 99px; font-size: 0.82rem; font-weight: 600; background: #e7ecf4; color: var(--azul-oscuro); text-transform: capitalize; }
.etiqueta--confirmada { background: var(--ok-fondo); color: var(--ok); }
.etiqueta--cancelada { background: var(--error-fondo); color: var(--error); }
</style>
