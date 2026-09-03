// vite.config.js — configuración mínima de Vite.
import { defineConfig } from 'vite';

export default defineConfig({
  // El puerto puede venir asignado por el entorno (preview del asistente);
  // por defecto usa el estándar de Vite.
  server: {
    port: Number(process.env.PORT) || 5173,
  },
});
