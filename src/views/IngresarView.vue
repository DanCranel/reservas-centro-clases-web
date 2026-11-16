<script setup>
import { reactive, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CampoFormulario from '../components/CampoFormulario.vue';
import { useSesion } from '../composables/useSesion.js';
import { useAccion } from '../composables/useAccion.js';
import { useAvisos } from '../composables/useAvisos.js';
import { validarCredenciales } from '../services/reglas.js';

const ruta = useRoute();
const router = useRouter();
const { ingresar } = useSesion();
const { avisar } = useAvisos();
const datos = reactive({ email: '', password: '' });
const intentado = ref(false);
const { enviando, error, ejecutar } = useAccion(ingresar);
const errores = computed(() => (intentado.value ? validarCredenciales(datos) : {}));

/** Solo se permite volver a rutas internas (evita redirecciones abiertas). */
const destino = () => (typeof ruta.query.volver === 'string' && ruta.query.volver.startsWith('/') && !ruta.query.volver.startsWith('//') ? ruta.query.volver : '/reservas');

async function enviar() {
  intentado.value = true;
  if (Object.keys(errores.value).length) return;
  const r = await ejecutar({ email: datos.email.trim(), password: datos.password });
  if (r.ok) {
    avisar(`Bienvenida/o, ${r.valor.nombre}.`, 'exito');
    router.replace(destino());
  }
}
</script>

<template>
  <section class="angosto" aria-labelledby="titulo">
    <h1 id="titulo">Iniciar sesión</h1>
    <form class="tarjeta formulario" novalidate @submit.prevent="enviar">
      <p v-if="error" class="error-general" role="alert">{{ error.message }}</p>
      <CampoFormulario v-slot="c" id="email" etiqueta="Correo" :error="errores.email">
        <input :id="c.id" v-model="datos.email" type="email" autocomplete="email" required
          :aria-invalid="c.invalid" :aria-describedby="c.describedby" />
      </CampoFormulario>
      <CampoFormulario v-slot="c" id="password" etiqueta="Contraseña" :error="errores.password">
        <input :id="c.id" v-model="datos.password" type="password" autocomplete="current-password" required
          :aria-invalid="c.invalid" :aria-describedby="c.describedby" />
      </CampoFormulario>
      <button class="boton" type="submit" :disabled="enviando">{{ enviando ? 'Ingresando…' : 'Ingresar' }}</button>
      <p class="texto-suave">¿No tiene cuenta? <RouterLink to="/registro">Créela aquí</RouterLink>.</p>
    </form>
    <p class="texto-suave demo">Cuentas de prueba: <code>maria@correo.com</code> / <code>Maria123!</code> · <code>admin@tejiendoredes.ec</code> / <code>Admin123!</code></p>
  </section>
</template>

<style scoped>
.angosto { max-width: 28rem; margin-inline: auto; }
.formulario { display: grid; gap: 1rem; }
.formulario p { margin: 0; }
.error-general { background: var(--error-fondo); color: var(--error); padding: 0.6rem 0.8rem; border-radius: 8px; font-weight: 600; }
.demo { font-size: 0.9rem; }
</style>
