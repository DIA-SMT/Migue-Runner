// config.js — TODAS las constantes de tuneo del juego viven acá.
// Regla del proyecto: ningún número que afecte la jugabilidad va inline en otro módulo.

export const ENTRADA = {
  // Tiempo mínimo entre dos pulsaciones válidas del mismo botón.
  // Los punteros presentadores emiten auto-repeat si se mantiene apretado.
  DEBOUNCE_MS: 150,

  // Clave de localStorage donde se persiste la calibración del puntero.
  CLAVE_STORAGE: 'migue.controles',

  // Teclado físico como respaldo, en paralelo al puntero calibrado.
  RESPALDO_TECLADO: {
    saltar: 'Space',
    agacharse: 'ShiftLeft',
  },

  // Recalibración: tecla física, o mantener ambos botones del puntero.
  RECALIBRAR_TECLA: 'KeyC',
  RECALIBRAR_MANTENER_MS: 3000,
};

export const DIAGNOSTICO = {
  // Cantidad de eventos que se muestran en el historial de la página de test.
  MAX_EVENTOS_HISTORIAL: 12,
};
