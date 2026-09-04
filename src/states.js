// states.js — máquina de estados mínima.
//
// Flujo del juego: (CALIBRACION) → ATRACCION → JUGANDO → RESULTADO → ATRACCION.
// La calibración se suma cuando tengamos el puntero (Fase 2); hoy el mapa de
// teclas de respaldo alcanza.

export function crearEstados(definiciones) {
  let actual = null;
  let nombreActual = null;

  return {
    get actual() {
      return nombreActual;
    },

    cambiar(nombre, datos) {
      if (!definiciones[nombre]) throw new Error(`Estado desconocido: ${nombre}`);
      actual?.salir?.();
      nombreActual = nombre;
      actual = definiciones[nombre];
      actual.entrar?.(datos);
    },

    actualizar(dt) {
      actual?.actualizar?.(dt);
    },
  };
}
