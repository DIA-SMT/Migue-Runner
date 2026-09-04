// vite.config.js — configuración mínima de Vite.
import { defineConfig } from 'vite';

export default defineConfig({
  // El puerto puede venir asignado por el entorno (preview del asistente);
  // por defecto usa el estándar de Vite.
  server: {
    port: Number(process.env.PORT) || 5173,
  },

  // Dos páginas: el juego y el diagnóstico de teclas de la Fase 1.
  build: {
    rollupOptions: {
      input: {
        principal: 'index.html',
        testEntrada: 'test-entrada.html',
      },
    },
  },
});
