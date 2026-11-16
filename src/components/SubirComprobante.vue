<script setup>
import { ref } from 'vue';
import { reservasApi } from '../services/api/index.js';
import { useAccion } from '../composables/useAccion.js';
import { registrarCambioPropio } from '../composables/useTiempoReal.js';

/** Sube el comprobante de pago. Valida tipo y tamaño antes de enviar; el servidor vuelve a validar. */
const props = defineProps({
  reservaId: { type: Number, required: true },
  tieneComprobante: { type: Boolean, default: false },
  deshabilitado: { type: Boolean, default: false },
});
const emit = defineEmits(['subido']);

const TIPOS = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX = 2 * 1024 * 1024;
const archivo = ref(null);
const errorLocal = ref('');
const entrada = ref(null);
const { enviando, error, ejecutar } = useAccion((f) => reservasApi.subirComprobante(props.reservaId, f));

function elegir(evento) {
  const f = evento.target.files?.[0] ?? null;
  errorLocal.value = '';
  if (f && !TIPOS.includes(f.type)) errorLocal.value = 'Solo se aceptan archivos PDF, PNG o JPG.';
  else if (f && f.size > MAX) errorLocal.value = 'El archivo supera 2 MB.';
  archivo.value = errorLocal.value ? null : f;
}

async function subir() {
  if (!archivo.value) { errorLocal.value = 'Elija un archivo.'; return; }
  registrarCambioPropio(props.reservaId);
  const r = await ejecutar(archivo.value);
  if (r.ok) {
    archivo.value = null;
    if (entrada.value) entrada.value.value = '';
    emit('subido', r.valor);
  }
}
</script>

<template>
  <section class="tarjeta" aria-labelledby="titulo-comprobante">
    <h2 id="titulo-comprobante">Comprobante de pago</h2>
    <p v-if="tieneComprobante">
      Ya hay un comprobante adjunto.
      <a :href="reservasApi.urlComprobante(reservaId)" target="_blank" rel="noopener">Ver comprobante<span class="visualmente-oculto"> (se abre en otra pestaña)</span></a>
    </p>
    <form class="subir" @submit.prevent="subir">
      <label for="archivo">{{ tieneComprobante ? 'Reemplazar comprobante' : 'Adjuntar comprobante' }} (PDF, PNG o JPG, máx. 2 MB)</label>
      <input id="archivo" ref="entrada" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        :disabled="enviando || deshabilitado" :aria-invalid="errorLocal || error ? 'true' : 'false'"
        aria-describedby="archivo-error" @change="elegir" />
      <p id="archivo-error" class="error" role="alert">{{ errorLocal || error?.message }}</p>
      <button type="submit" class="boton boton--secundario" :disabled="enviando || deshabilitado || !archivo">
        {{ enviando ? 'Subiendo…' : 'Subir comprobante' }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.subir { display: grid; gap: 0.5rem; justify-items: start; }
label { font-weight: 600; }
.error { margin: 0; color: var(--error); font-weight: 600; min-height: 1.2em; }
input[type='file'] { min-height: auto; border: 1px dashed #8a96a8; }
</style>
