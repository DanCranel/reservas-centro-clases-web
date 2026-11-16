<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EstadoPeticion from '../components/EstadoPeticion.vue';
import ReservaFormulario from '../components/ReservaFormulario.vue';
import { usePeticion } from '../composables/usePeticion.js';
import { useAccion } from '../composables/useAccion.js';
import { useAvisos } from '../composables/useAvisos.js';
import { useEnLinea } from '../composables/useEnLinea.js';
import { serviciosApi, reservasApi } from '../services/api/index.js';

const ruta = useRoute();
const router = useRouter();
const { avisar } = useAvisos();
const enLinea = useEnLinea();

const servicios = usePeticion(serviciosApi.listar);
onMounted(servicios.ejecutar);

const inicial = computed(() => ({ servicioId: Number(ruta.query.servicioId) || '' }));
const crear = useAccion(reservasApi.crear);
const erroresServidor = computed(() => crear.error.value?.erroresPorCampo ?? {});
const errorGeneral = computed(() => (crear.error.value && !Object.keys(erroresServidor.value).length ? crear.error.value : null));
const alerta = ref(null);

async function enviar(reserva) {
  const r = await crear.ejecutar(reserva);
  if (r.ok) {
    avisar(`Reserva creada para ${r.valor.estudianteNombre}.`, 'exito');
    router.push({ name: 'reserva', params: { id: r.valor.id } });
  } else {
    alerta.value?.focus();
  }
}
</script>

<template>
  <section aria-labelledby="titulo">
    <h1 id="titulo">Nueva reserva</h1>
    <div v-if="errorGeneral" ref="alerta" class="alerta" role="alert" tabindex="-1">
      <strong>No se pudo reservar.</strong> {{ errorGeneral.message }}
    </div>
    <p v-if="!enLinea" class="alerta alerta--aviso" role="status">Necesita conexión a internet para enviar la reserva.</p>
    <EstadoPeticion :estado="servicios.estado.value" :error="servicios.error.value" texto-cargando="Cargando servicios…"
      texto-vacio="No hay servicios disponibles para reservar." @reintentar="servicios.ejecutar">
      <ReservaFormulario
        :servicios="servicios.datos.value" :inicial="inicial" :enviando="crear.enviando.value"
        :deshabilitado="!enLinea" :errores-servidor="erroresServidor" @enviar="enviar"
      />
    </EstadoPeticion>
  </section>
</template>

<style scoped>
.alerta { background: var(--error-fondo); color: var(--error); border-radius: 8px; padding: 0.7rem 0.9rem; margin-bottom: 1rem; }
.alerta--aviso { background: var(--aviso-fondo); color: var(--texto); }
</style>
