<script setup>
import { onMounted } from 'vue';
import EstadoPeticion from '../components/EstadoPeticion.vue';
import ServicioTarjeta from '../components/ServicioTarjeta.vue';
import { usePeticion } from '../composables/usePeticion.js';
import { useSesion } from '../composables/useSesion.js';
import { serviciosApi } from '../services/api/index.js';

const { usuario } = useSesion();
const { datos: servicios, estado, error, ejecutar } = usePeticion(serviciosApi.listar);
onMounted(ejecutar);
</script>

<template>
  <section aria-labelledby="titulo">
    <h1 id="titulo">Servicios del centro</h1>
    <p class="texto-suave">Clases de lunes a sábado, de 08:00 a 20:00, en Paute.</p>
    <EstadoPeticion :estado="estado" :error="error" texto-cargando="Cargando servicios…"
      texto-vacio="Por ahora no hay servicios disponibles." @reintentar="ejecutar">
      <ul class="rejilla rejilla--2 rejilla--3 lista" role="list">
        <li v-for="s in servicios" :key="s.id">
          <ServicioTarjeta :servicio="s" :puede-reservar="Boolean(usuario)" />
        </li>
      </ul>
    </EstadoPeticion>
  </section>
</template>

<style scoped>
.lista { list-style: none; margin: 0; padding: 0; }
.lista li { display: grid; }
</style>
