<script setup>
import { computed } from 'vue';
/**
 * Etiqueta + control + ayuda + error, con los atributos ARIA conectados.
 * El control llega por slot y recibe { id, describedby, invalid }.
 */
const props = defineProps({
  id: { type: String, required: true },
  etiqueta: { type: String, required: true },
  error: { type: String, default: '' },
  ayuda: { type: String, default: '' },
});
const describedby = computed(() => [props.ayuda && `${props.id}-ayuda`, props.error && `${props.id}-error`].filter(Boolean).join(' ') || undefined);
</script>

<template>
  <div class="campo">
    <label :for="id">{{ etiqueta }}</label>
    <slot :id="id" :describedby="describedby" :invalid="error ? 'true' : 'false'" />
    <p v-if="ayuda" :id="`${id}-ayuda`" class="campo__ayuda">{{ ayuda }}</p>
    <p v-if="error" :id="`${id}-error`" class="campo__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.campo { display: grid; gap: 0.3rem; }
label { font-weight: 600; }
.campo__ayuda { margin: 0; font-size: 0.88rem; color: var(--texto-suave); }
.campo__error { margin: 0; font-size: 0.9rem; color: var(--error); font-weight: 600; }
</style>
