<script setup>
import { reactive, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import CampoFormulario from '../components/CampoFormulario.vue';
import { useSesion } from '../composables/useSesion.js';
import { useAccion } from '../composables/useAccion.js';
import { useAvisos } from '../composables/useAvisos.js';
import { validarCredenciales } from '../services/reglas.js';

const router = useRouter();
const { registrar } = useSesion();
const { avisar } = useAvisos();
const datos = reactive({ nombre: '', email: '', password: '' });
const intentado = ref(false);
const { enviando, error, ejecutar } = useAccion(registrar);

const erroresServidor = ref({});
watch(error, (e) => { erroresServidor.value = e?.erroresPorCampo ?? {}; });
const errores = computed(() => ({ ...erroresServidor.value, ...(intentado.value ? validarCredenciales(datos, { registro: true }) : {}) }));

async function enviar() {
  intentado.value = true;
  if (Object.keys(validarCredenciales(datos, { registro: true })).length) return;
  const r = await ejecutar({ nombre: datos.nombre.trim(), email: datos.email.trim(), password: datos.password });
  if (r.ok) {
    avisar('Cuenta creada. ¡Ya puede reservar!', 'exito');
    router.replace({ name: 'reserva-nueva' });
  }
}
</script>

<template>
  <section class="angosto" aria-labelledby="titulo">
    <h1 id="titulo">Crear cuenta</h1>
    <form class="tarjeta formulario" novalidate @submit.prevent="enviar">
      <p v-if="error && !Object.keys(error.erroresPorCampo).length" class="error-general" role="alert">{{ error.message }}</p>
      <CampoFormulario v-slot="c" id="nombre" etiqueta="Nombre del representante" :error="errores.nombre">
        <input :id="c.id" v-model="datos.nombre" autocomplete="name" required :aria-invalid="c.invalid" :aria-describedby="c.describedby" />
      </CampoFormulario>
      <CampoFormulario v-slot="c" id="email" etiqueta="Correo" :error="errores.email">
        <input :id="c.id" v-model="datos.email" type="email" autocomplete="email" required :aria-invalid="c.invalid" :aria-describedby="c.describedby" />
      </CampoFormulario>
      <CampoFormulario v-slot="c" id="password" etiqueta="Contraseña" ayuda="Mínimo 8 caracteres, con letras y números." :error="errores.password">
        <input :id="c.id" v-model="datos.password" type="password" autocomplete="new-password" required :aria-invalid="c.invalid" :aria-describedby="c.describedby" />
      </CampoFormulario>
      <button class="boton" type="submit" :disabled="enviando">{{ enviando ? 'Creando…' : 'Crear cuenta' }}</button>
      <p class="texto-suave">¿Ya tiene cuenta? <RouterLink to="/ingresar">Inicie sesión</RouterLink>.</p>
    </form>
  </section>
</template>

<style scoped>
.angosto { max-width: 28rem; margin-inline: auto; }
.formulario { display: grid; gap: 1rem; }
.formulario p { margin: 0; }
.error-general { background: var(--error-fondo); color: var(--error); padding: 0.6rem 0.8rem; border-radius: 8px; font-weight: 600; }
</style>
