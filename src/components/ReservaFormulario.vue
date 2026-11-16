<script setup>
import { reactive, ref, computed, watch, nextTick } from 'vue';
import CampoFormulario from './CampoFormulario.vue';
import { validarReserva, DURACIONES, hoyLocal, precio } from '../services/reglas.js';

/**
 * Formulario de reserva (crear o reprogramar). Trabaja sobre una COPIA local
 * de `inicial`; el resultado sale por el evento `enviar`. No conoce la API.
 */
const props = defineProps({
  servicios: { type: Array, required: true },
  inicial: { type: Object, default: () => ({}) },
  enviando: { type: Boolean, default: false },
  deshabilitado: { type: Boolean, default: false },
  erroresServidor: { type: Object, default: () => ({}) },
  modoEdicion: { type: Boolean, default: false },
  textoBoton: { type: String, default: 'Reservar' },
});
const emit = defineEmits(['enviar', 'cancelar']);

const vacio = () => ({ servicioId: '', estudianteNombre: '', fecha: '', horaInicio: '15:00', duracionMin: 60, notas: '' });
const datos = reactive(vacio());
const erroresApi = ref({});
const intentado = ref(false);
const formulario = ref(null);

watch(() => props.inicial, (v) => Object.assign(datos, vacio(), v), { immediate: true, deep: true });
watch(() => props.erroresServidor, (v) => { erroresApi.value = { ...v }; });

const erroresCliente = computed(() => (intentado.value ? validarReserva(datos) : {}));
const errores = computed(() => ({ ...erroresApi.value, ...erroresCliente.value }));
const servicioElegido = computed(() => props.servicios.find((s) => s.id === Number(datos.servicioId)));
const listaErrores = computed(() => Object.values(errores.value));

/** Al editar un campo se borra el error que el servidor dio para ese campo. */
const alEditar = (campo) => {
  if (erroresApi.value[campo]) erroresApi.value = { ...erroresApi.value, [campo]: undefined };
};

async function enviar() {
  intentado.value = true;
  if (Object.keys(validarReserva(datos)).length) {
    await nextTick();
    formulario.value?.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  const salida = {
    servicioId: Number(datos.servicioId),
    estudianteNombre: datos.estudianteNombre.trim(),
    fecha: datos.fecha,
    horaInicio: datos.horaInicio,
    duracionMin: Number(datos.duracionMin),
    ...(datos.notas.trim() ? { notas: datos.notas.trim() } : {}),
  };
  emit('enviar', salida);
}
</script>

<template>
  <form ref="formulario" class="tarjeta formulario" novalidate @submit.prevent="enviar">
    <div v-if="intentado && listaErrores.length" class="resumen" role="alert">
      Revise {{ listaErrores.length === 1 ? 'el campo marcado' : `los ${listaErrores.length} campos marcados` }}.
    </div>

    <fieldset :disabled="enviando || deshabilitado" class="rejilla rejilla--2">
      <legend class="visualmente-oculto">Datos de la reserva</legend>

      <CampoFormulario v-slot="c" id="servicio" etiqueta="Servicio" :error="errores.servicioId"
        :ayuda="servicioElegido ? `${precio(servicioElegido.precioCentavos)} por hora · cupo ${servicioElegido.cupo}` : ''">
        <select :id="c.id" v-model="datos.servicioId" :disabled="modoEdicion" :aria-invalid="c.invalid" :aria-describedby="c.describedby"
          required @change="alEditar('servicioId')">
          <option value="" disabled>Elija un servicio</option>
          <option v-for="s in servicios" :key="s.id" :value="s.id">{{ s.nombre }}</option>
        </select>
      </CampoFormulario>

      <CampoFormulario v-slot="c" id="estudiante" etiqueta="Nombre del estudiante" :error="errores.estudianteNombre">
        <input :id="c.id" v-model="datos.estudianteNombre" autocomplete="off" maxlength="80" required
          :aria-invalid="c.invalid" :aria-describedby="c.describedby" @input="alEditar('estudianteNombre')" />
      </CampoFormulario>

      <CampoFormulario v-slot="c" id="fecha" etiqueta="Fecha" ayuda="Lunes a sábado" :error="errores.fecha">
        <input :id="c.id" v-model="datos.fecha" type="date" :min="hoyLocal()" required
          :aria-invalid="c.invalid" :aria-describedby="c.describedby" @input="alEditar('fecha')" />
      </CampoFormulario>

      <CampoFormulario v-slot="c" id="hora" etiqueta="Hora de inicio" ayuda="Entre 08:00 y 20:00" :error="errores.horaInicio">
        <input :id="c.id" v-model="datos.horaInicio" type="time" min="08:00" max="19:00" step="900" required
          :aria-invalid="c.invalid" :aria-describedby="c.describedby" @input="alEditar('horaInicio')" />
      </CampoFormulario>

      <CampoFormulario v-slot="c" id="duracion" etiqueta="Duración" :error="errores.duracionMin">
        <select :id="c.id" v-model.number="datos.duracionMin" :aria-invalid="c.invalid" :aria-describedby="c.describedby"
          @change="alEditar('duracionMin')">
          <option v-for="d in DURACIONES" :key="d" :value="d">{{ d }} minutos</option>
        </select>
      </CampoFormulario>

      <CampoFormulario v-slot="c" id="notas" etiqueta="Notas (opcional)" :error="errores.notas">
        <textarea :id="c.id" v-model="datos.notas" maxlength="500" :aria-invalid="c.invalid" :aria-describedby="c.describedby"
          @input="alEditar('notas')"></textarea>
      </CampoFormulario>
    </fieldset>

    <div class="fila-acciones">
      <button type="submit" class="boton" :disabled="enviando || deshabilitado">
        {{ enviando ? 'Enviando…' : textoBoton }}
      </button>
      <button v-if="modoEdicion" type="button" class="boton boton--secundario" :disabled="enviando" @click="$emit('cancelar')">Descartar</button>
    </div>
  </form>
</template>

<style scoped>
.formulario { display: grid; gap: 1rem; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
.resumen { background: var(--error-fondo); color: var(--error); border-radius: 8px; padding: 0.6rem 0.8rem; font-weight: 600; }
</style>
