// input.js — entrada de dos acciones: saltar y agacharse.
//
// Funciona con el teclado físico de respaldo (Espacio/⬆ saltar, Shift/⬇
// agacharse) y, si existe calibración guardada del puntero USB en
// localStorage, suma esos códigos al mapa. La pantalla de calibración
// (Fase 2) va a escribir esa clave cuando tengamos el puntero a mano.
//
// Reglas del documento: preventDefault en códigos mapeados, ignorar
// event.repeat, debounce de 150 ms, escuchar en window.

import { ENTRADA } from './config.js';

export function crearEntrada() {
  // code → 'saltar' | 'agacharse'
  const mapa = new Map();
  for (const codigo of ENTRADA.RESPALDO_TECLADO.saltar) mapa.set(codigo, 'saltar');
  for (const codigo of ENTRADA.RESPALDO_TECLADO.agacharse) mapa.set(codigo, 'agacharse');

  // Calibración del puntero, si ya se hizo alguna vez.
  try {
    const guardado = JSON.parse(localStorage.getItem(ENTRADA.CLAVE_STORAGE));
    if (guardado?.saltar) mapa.set(guardado.saltar, 'saltar');
    if (guardado?.agacharse) mapa.set(guardado.agacharse, 'agacharse');
  } catch {
    // localStorage vacío o corrupto: seguimos solo con el teclado.
  }

  const oyentes = {
    saltar: new Set(),
    agacharse: new Set(), // al APRETAR agacharse
    soltarAgacharse: new Set(), // al SOLTAR agacharse
    cualquiera: new Set(), // cualquier acción (para "apretá un botón")
  };

  const ultimaPulsacion = { saltar: 0, agacharse: 0 };
  let agachadoApretado = false;

  window.addEventListener('keydown', (evento) => {
    const accion = mapa.get(evento.code);
    if (!accion) return;
    evento.preventDefault();
    if (evento.repeat) return; // auto-repeat del puntero o del teclado

    const ahora = performance.now();
    if (ahora - ultimaPulsacion[accion] < ENTRADA.DEBOUNCE_MS) return;
    ultimaPulsacion[accion] = ahora;

    if (accion === 'agacharse') agachadoApretado = true;
    for (const cb of oyentes[accion]) cb();
    for (const cb of oyentes.cualquiera) cb(accion);
  });

  window.addEventListener('keyup', (evento) => {
    const accion = mapa.get(evento.code);
    if (!accion) return;
    evento.preventDefault();
    if (accion === 'agacharse') {
      agachadoApretado = false;
      for (const cb of oyentes.soltarAgacharse) cb();
    }
  });

  return {
    // on('saltar' | 'agacharse' | 'soltarAgacharse' | 'cualquiera', cb)
    on(evento, cb) {
      oyentes[evento].add(cb);
    },
    estaAgachadoApretado: () => agachadoApretado,
  };
}
