<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import EstadoPeticion from '../components/EstadoPeticion.vue';
import EtiquetaEstado from '../components/EtiquetaEstado.vue';
import ReservaFormulario from '../components/ReservaFormulario.vue';
import SubirComprobante from '../components/SubirComprobante.vue';
import { usePeticion } from '../composables/usePeticion.js';
import { useAccion } from '../composables/useAccion.js';
import { useSesion } from '../composables/useSesion.js';
import { useAvisos } from '../composables/useAvisos.js';
import { useEnLinea } from '../composables/useEnLinea.js';
import { alCambiarReserva, registrarCambioPropio } from '../composables/useTiempoReal.js';
import { reservasApi, serviciosApi } from '../services/api/index.js';
import { formatoFecha } from '../services/reglas.js';

const props = defineProps({ id: { type: Number, required: true } });
const router = useRouter();
const { esAdmin } = useSesion();
const { avisar } = useAvisos();
const enLinea = useEnLinea();

const detalle = usePeticion(reservasApi.obtener, { esVacio: () => false });
const servicios = usePeticion(serviciosApi.listar);
const reserva = computed(() => detalle.datos.value);
const editando = ref(false);

// Si cambia el :id de la ruta, la petición anterior se cancela.
watch(() => props.id, (id) => { editando.value = false; detalle.ejecutar(id); }, { immediate: true });

// Otro usuario (p. ej. administración) cambió esta reserva: se recarga y se avisa.
alCambiarReserva((evento, datos) => {
  if (datos.id !== props.id) return;
  if (evento === 'reserva:eliminada') { avisar('Esta reserva fue eliminada.', 'error'); router.replace({ name: 'reservas' }); return; }
  if (editando.value) avisar('Esta reserva cambió mientras la editaba. Revise los datos antes de guardar.', 'error');
  detalle.ejecutar(props.id);
});

const guardar = useAccion((cambios) => {
  registrarCambioPropio(props.id);
  return reservasApi.actualizar(props.id, { version: reserva.value.version, ...cambios });
});
const erroresServidor = computed(() => guardar.error.value?.erroresPorCampo ?? {});
const errorGeneral = computed(() => (guardar.error.value && !Object.keys(erroresServidor.value).length ? guardar.error.value : null));

async function aplicar(cambios, mensaje) {
  const r = await guardar.ejecutar(cambios);
  if (r.ok) {
    detalle.datos.value = r.valor; // la API devuelve la reserva actualizada (nueva versión)
    editando.value = false;
    avisar(mensaje, 'exito');
  } else if (r.error?.code === 'VERSION_CONFLICTO') {
    avisar('Otra persona modificó esta reserva. Se cargaron los datos actuales.', 'error');
    detalle.ejecutar(props.id);
  }
}

function abrirEdicion() {
  editando.value = true;
  if (!servicios.datos.value) servicios.ejecutar();
}

const reprogramar = ({ estudianteNombre, fecha, horaInicio, duracionMin, notas }) =>
  aplicar({ estudianteNombre, fecha, horaInicio, duracionMin, notas: notas ?? '' }, 'Reserva actualizada.');

function cancelar() {
  if (window.confirm('¿Cancelar esta reserva?')) aplicar({ estado: 'cancelada' }, 'Reserva cancelada.');
}

const eliminar = useAccion(() => { registrarCambioPropio(props.id); return reservasApi.eliminar(props.id); });
async function borrar() {
  if (!window.confirm('¿Eliminar definitivamente esta reserva?')) return;
  const r = await eliminar.ejecutar();
  if (r.ok) { avisar('Reserva eliminada.', 'exito'); router.replace({ name: 'reservas' }); }
  else avisar(r.error.message, 'error');
}

const alSubir = (r) => { detalle.datos.value = r; avisar('Comprobante subido.', 'exito'); };

const inicialFormulario = computed(() => reserva.value && ({
  servicioId: reserva.value.servicio.id,
  estudianteNombre: reserva.value.estudianteNombre,
  fecha: reserva.value.fecha,
  horaInicio: reserva.value.horaInicio,
  duracionMin: reserva.value.duracionMin,
  notas: reserva.value.notas,
}));
const activa = computed(() => reserva.value && reserva.value.estado !== 'cancelada');
const ocupado = computed(() => guardar.enviando.value || eliminar.enviando.value || !enLinea.value);
</script>

<template>
  <section aria-labelledby="titulo">
    <p><RouterLink to="/reservas">← Volver a reservas</RouterLink></p>
    <EstadoPeticion :estado="detalle.estado.value" :error="detalle.error.value" texto-cargando="Cargando reserva…" @reintentar="detalle.ejecutar(id)">
      <template v-if="reserva">
        <div class="cabecera-detalle">
          <h1 id="titulo">Reserva #{{ reserva.id }}</h1>
          <EtiquetaEstado :estado="reserva.estado" />
        </div>

        <div v-if="errorGeneral" class="alerta" role="alert">{{ errorGeneral.message }}</div>

        <div class="rejilla rejilla--2">
          <section class="tarjeta" aria-labelledby="titulo-datos">
            <h2 id="titulo-datos">Datos</h2>
            <dl class="datos">
              <div><dt>Estudiante</dt><dd>{{ reserva.estudianteNombre }}</dd></div>
              <div><dt>Servicio</dt><dd>{{ reserva.servicio.nombre }}</dd></div>
              <div><dt>Fecha</dt><dd><time :datetime="reserva.fecha">{{ formatoFecha(reserva.fecha) }}</time></dd></div>
              <div><dt>Horario</dt><dd>{{ reserva.horaInicio }}–{{ reserva.horaFin }} ({{ reserva.duracionMin }} min)</dd></div>
              <div v-if="reserva.notas"><dt>Notas</dt><dd>{{ reserva.notas }}</dd></div>
            </dl>
            <div v-if="activa" class="fila-acciones">
              <button v-if="esAdmin && reserva.estado === 'pendiente'" type="button" class="boton" :disabled="ocupado"
                @click="aplicar({ estado: 'confirmada' }, 'Reserva confirmada.')">Confirmar</button>
              <button v-if="!editando" type="button" class="boton boton--secundario" :disabled="ocupado" @click="abrirEdicion">Reprogramar</button>
              <button type="button" class="boton boton--peligro" :disabled="ocupado" @click="cancelar">Cancelar reserva</button>
              <button v-if="reserva.estado === 'pendiente' || esAdmin" type="button" class="boton boton--peligro" :disabled="ocupado" @click="borrar">Eliminar</button>
            </div>
          </section>

          <SubirComprobante v-if="activa" :reserva-id="reserva.id" :tiene-comprobante="reserva.tieneComprobante"
            :deshabilitado="!enLinea" @subido="alSubir" />
        </div>

        <section v-if="editando" class="edicion" aria-labelledby="titulo-edicion">
          <h2 id="titulo-edicion">Reprogramar</h2>
          <EstadoPeticion :estado="servicios.estado.value" :error="servicios.error.value" @reintentar="servicios.ejecutar">
            <ReservaFormulario
              :servicios="servicios.datos.value" :inicial="inicialFormulario" modo-edicion texto-boton="Guardar cambios"
              :enviando="guardar.enviando.value" :deshabilitado="!enLinea" :errores-servidor="erroresServidor"
              @enviar="reprogramar" @cancelar="editando = false"
            />
          </EstadoPeticion>
        </section>
      </template>
    </EstadoPeticion>
  </section>
</template>

<style scoped>
.cabecera-detalle { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.cabecera-detalle h1 { margin: 0; }
.datos { display: grid; gap: 0.5rem; margin: 0 0 1rem; }
.datos dt { font-size: 0.85rem; color: var(--texto-suave); }
.datos dd { margin: 0; font-weight: 600; }
.alerta { background: var(--error-fondo); color: var(--error); border-radius: 8px; padding: 0.7rem 0.9rem; margin: 1rem 0; }
.edicion { margin-top: 1.5rem; }
section > .rejilla { margin-top: 1rem; }
</style>
