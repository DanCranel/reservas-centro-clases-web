<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EstadoPeticion from '../components/EstadoPeticion.vue';
import ReservaFiltros from '../components/ReservaFiltros.vue';
import ReservaLista from '../components/ReservaLista.vue';
import { usePeticion } from '../composables/usePeticion.js';
import { useAccion } from '../composables/useAccion.js';
import { useSesion } from '../composables/useSesion.js';
import { useAvisos } from '../composables/useAvisos.js';
import { useEnLinea } from '../composables/useEnLinea.js';
import { alCambiarReserva, registrarCambioPropio } from '../composables/useTiempoReal.js';
import { reservasApi, serviciosApi } from '../services/api/index.js';

const ruta = useRoute();
const router = useRouter();
const { esAdmin } = useSesion();
const { avisar } = useAvisos();
const enLinea = useEnLinea();
const POR_PAGINA = 10;

// Los filtros viven en la URL: se pueden compartir, recargar y usar con "atrás".
const filtros = computed({
  get: () => ({
    fecha: ruta.query.fecha || undefined,
    estado: ruta.query.estado || undefined,
    servicioId: ruta.query.servicioId || undefined,
    page: Number(ruta.query.page) || 1,
  }),
  set: (f) => router.replace({ query: Object.fromEntries(Object.entries(f).filter(([k, v]) => v && !(k === 'page' && v === 1))) }),
});

const servicios = usePeticion(serviciosApi.listar);
const lista = usePeticion(
  (f, signal) => reservasApi.listar({ ...f, limit: POR_PAGINA }, signal),
  { esVacio: (r) => r.data.length === 0 },
);
const reservas = computed(() => lista.datos.value?.data ?? []);
const meta = computed(() => lista.datos.value?.meta);

// Cada cambio de filtro lanza una petición; usePeticion cancela la anterior.
watch(filtros, (f) => lista.ejecutar(f), { immediate: true });
onMounted(servicios.ejecutar);

const recargar = () => lista.ejecutar(filtros.value);
let espera = null;
alCambiarReserva(() => { clearTimeout(espera); espera = setTimeout(recargar, 250); });

const accion = useAccion(async (reserva, estado) => {
  registrarCambioPropio(reserva.id);
  return reservasApi.actualizar(reserva.id, { version: reserva.version, estado });
});
const idOcupado = ref(null); // deshabilita solo los botones de la tarjeta en proceso

async function cambiarEstado(reserva, estado) {
  if (estado === 'cancelada' && !window.confirm(`¿Cancelar la reserva de ${reserva.estudianteNombre}?`)) return;
  idOcupado.value = reserva.id;
  const r = await accion.ejecutar(reserva, estado);
  idOcupado.value = null;
  if (r.ok) avisar(`Reserva de ${reserva.estudianteNombre} ${estado}.`, 'exito');
  else if (r.error?.code === 'VERSION_CONFLICTO') avisar('Otra persona modificó esta reserva; se muestran los datos actuales.', 'error');
  else if (r.error) avisar(r.error.message, 'error');
  recargar();
}

const irAPagina = (page) => { filtros.value = { ...filtros.value, page }; };
const hayFiltros = computed(() => Boolean(filtros.value.fecha || filtros.value.estado || filtros.value.servicioId));
</script>

<template>
  <section aria-labelledby="titulo">
    <div class="encabezado">
      <h1 id="titulo">{{ esAdmin ? 'Todas las reservas' : 'Mis reservas' }}</h1>
      <RouterLink class="boton" to="/reservas/nueva">+ Nueva reserva</RouterLink>
    </div>

    <ReservaFiltros v-model="filtros" :servicios="servicios.datos.value ?? []" />

    <p class="estado-sutil" aria-live="polite">
      <span v-if="lista.cargando.value && lista.datos.value">Actualizando…</span>
      <span v-else-if="meta">{{ meta.total }} {{ meta.total === 1 ? 'reserva' : 'reservas' }}</span>
    </p>

    <EstadoPeticion :estado="lista.estado.value" :error="lista.error.value" texto-cargando="Cargando reservas…" @reintentar="recargar">
      <template #vacio>
        <p v-if="hayFiltros">No hay reservas con esos filtros.</p>
        <p v-else>Todavía no hay reservas. <RouterLink to="/reservas/nueva">Haga la primera</RouterLink>.</p>
      </template>
      <ReservaLista
        :reservas="reservas" :es-admin="esAdmin" :id-ocupado="idOcupado"
        @confirmar="cambiarEstado($event, 'confirmada')" @cancelar="cambiarEstado($event, 'cancelada')"
      />
      <nav v-if="meta && meta.paginas > 1" class="paginacion" aria-label="Paginación">
        <button type="button" class="boton boton--secundario boton--pequeno" :disabled="meta.page <= 1" @click="irAPagina(meta.page - 1)">Anterior</button>
        <span>Página {{ meta.page }} de {{ meta.paginas }}</span>
        <button type="button" class="boton boton--secundario boton--pequeno" :disabled="meta.page >= meta.paginas" @click="irAPagina(meta.page + 1)">Siguiente</button>
      </nav>
    </EstadoPeticion>
    <p v-if="!enLinea" class="texto-suave">Las reservas no se guardan sin conexión por privacidad; se cargarán al volver internet.</p>
  </section>
</template>

<style scoped>
.encabezado { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
.encabezado h1 { margin: 0; }
.estado-sutil { min-height: 1.5em; margin: 0 0 0.5rem; color: var(--texto-suave); }
.paginacion { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1rem; }
</style>
