// input.js — entrada de dos acciones: saltar y agacharse.
//
// Tres fuentes conviven, todas mapeando a las mismas dos acciones:
//  - Teclado físico de respaldo (Espacio/⬆ saltar, Shift/⬇ agacharse).
//  - Calibración guardada del puntero USB en localStorage, si existe
//    (la pantalla de calibración de la Fase 2 va a escribir esa clave).
//  - Pantalla táctil (mobile/tablet): la mitad de ARRIBA de la pantalla
//    salta, la mitad de ABAJO agacha. Es el mismo criterio que ya usan
//    los portales de trivia, así que no hace falta explicar nada nuevo:
//    dos zonas grandes equivalen a los dos botones del puntero físico.
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

  function disparar(accion) {
    const ahora = performance.now();
    if (ahora - ultimaPulsacion[accion] < ENTRADA.DEBOUNCE_MS) return;
    ultimaPulsacion[accion] = ahora;

    if (accion === 'agacharse') agachadoApretado = true;
    for (const cb of oyentes[accion]) cb();
    for (const cb of oyentes.cualquiera) cb(accion);
  }

  function soltarAgacharse() {
    agachadoApretado = false;
    for (const cb of oyentes.soltarAgacharse) cb();
  }

  // ---------- Teclado (puntero USB o teclado físico) ----------
  window.addEventListener('keydown', (evento) => {
    const accion = mapa.get(evento.code);
    if (!accion) return;
    evento.preventDefault();
    if (evento.repeat) return; // auto-repeat del puntero o del teclado
    disparar(accion);
  });

  window.addEventListener('keyup', (evento) => {
    const accion = mapa.get(evento.code);
    if (!accion) return;
    evento.preventDefault();
    if (accion === 'agacharse') soltarAgacharse();
  });

  // ---------- Pantalla táctil ----------
  // Se marca <html class="es-tactil"> para que el HUD muestre los hints
  // táctiles en vez de los de teclado (ver estilos.css).
  const esTactil = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (esTactil) document.documentElement.classList.add('es-tactil');

  // Pointer Events cubre touch, mouse y lápiz con la misma API: un click de
  // mouse también sirve para probar en escritorio sin tocar el teclado.
  // Se guarda qué acción disparó cada puntero para soltar la agachada
  // aunque el dedo se mueva de zona antes de levantarse.
  const punterosActivos = new Map(); // pointerId → 'saltar' | 'agacharse'

  window.addEventListener(
    'pointerdown',
    (evento) => {
      if (evento.pointerType === 'mouse' && evento.button !== 0) return;
      const accion = evento.clientY < window.innerHeight / 2 ? 'saltar' : 'agacharse';
      punterosActivos.set(evento.pointerId, accion);
      disparar(accion);
    },
    { passive: true },
  );

  function liberarPuntero(evento) {
    const accion = punterosActivos.get(evento.pointerId);
    punterosActivos.delete(evento.pointerId);
    if (accion === 'agacharse') soltarAgacharse();
  }
  window.addEventListener('pointerup', liberarPuntero, { passive: true });
  window.addEventListener('pointercancel', liberarPuntero, { passive: true });

  return {
    // on('saltar' | 'agacharse' | 'soltarAgacharse' | 'cualquiera', cb)
    on(evento, cb) {
      oyentes[evento].add(cb);
    },
    estaAgachadoApretado: () => agachadoApretado,
  };
}
