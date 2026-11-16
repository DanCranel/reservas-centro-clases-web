<script setup>
/**
 * Muestra uno de los estados de una petición: cargando, error, vacío o éxito.
 * El contenido de éxito llega por el slot por defecto; el de vacío por el slot "vacio".
 */
defineProps({
  estado: { type: String, required: true, validator: (v) => ['inactivo', 'cargando', 'exito', 'vacio', 'error'].includes(v) },
  error: { type: Object, default: null },
  textoCargando: { type: String, default: 'Cargando…' },
  textoVacio: { type: String, default: 'No hay datos para mostrar.' },
});
defineEmits(['reintentar']);
</script>

<template>
  <div class="estado-peticion" :aria-busy="estado === 'cargando'">
    <p v-if="estado === 'cargando'" class="estado estado--cargando" role="status">
      <span class="giro" aria-hidden="true"></span>{{ textoCargando }}
    </p>
    <div v-else-if="estado === 'error'" class="estado estado--error" role="alert">
      <p><strong>No se pudo cargar.</strong> {{ error?.message }}</p>
      <button type="button" class="boton boton--secundario boton--pequeno" @click="$emit('reintentar')">Reintentar</button>
    </div>
    <div v-else-if="estado === 'vacio'" class="estado estado--vacio">
      <slot name="vacio"><p>{{ textoVacio }}</p></slot>
    </div>
    <slot v-else-if="estado === 'exito'" />
  </div>
</template>

<style scoped>
.estado { padding: 1rem; border-radius: var(--radio); border: 1px dashed var(--borde); background: var(--superficie); }
.estado p { margin: 0 0 0.5rem; }
.estado--error { border: 1px solid #e3aaa6; background: var(--error-fondo); }
.estado--cargando { display: flex; align-items: center; gap: 0.6rem; }
.giro { width: 1.1rem; height: 1.1rem; border-radius: 50%; border: 3px solid var(--borde); border-top-color: var(--azul); animation: girar 0.8s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }
</style>
