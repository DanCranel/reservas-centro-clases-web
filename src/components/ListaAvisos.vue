<script setup>
import { useAvisos } from '../composables/useAvisos.js';
const { avisos, quitar } = useAvisos();
</script>

<template>
  <div class="avisos" role="status" aria-live="polite">
    <TransitionGroup name="aviso">
      <div v-for="a in avisos" :key="a.id" class="aviso" :class="`aviso--${a.tipo}`">
        <span>{{ a.texto }}</span>
        <button type="button" class="aviso__cerrar" @click="quitar(a.id)">
          <span aria-hidden="true">×</span><span class="visualmente-oculto">Cerrar aviso</span>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.avisos { position: fixed; right: 1rem; bottom: 1rem; z-index: 45; display: grid; gap: 0.5rem; width: min(24rem, calc(100% - 2rem)); }
.aviso { display: flex; gap: 0.5rem; align-items: flex-start; justify-content: space-between; padding: 0.7rem 0.8rem; border-radius: 8px; background: #fff; border-left: 5px solid var(--azul); box-shadow: 0 4px 14px rgb(16 24 40 / 0.18); }
.aviso--exito { border-left-color: var(--ok); }
.aviso--error { border-left-color: var(--error); }
.aviso__cerrar { min-width: 32px; min-height: 32px; border: 0; background: transparent; font-size: 1.2rem; cursor: pointer; }
.aviso-enter-active, .aviso-leave-active { transition: all 0.2s ease; }
.aviso-enter-from, .aviso-leave-to { opacity: 0; transform: translateY(8px); }
</style>
