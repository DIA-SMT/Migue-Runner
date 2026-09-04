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

// `bloqueado` es una función que devuelve true cuando otra pantalla se
// adueñó de la entrada (hoy: la calibración). No se confía en
// stopPropagation para eso: si el evento se despacha sobre `window` mismo
// —como hacen los tests— todos sus listeners corren igual, así que el
// bloqueo tiene que ser una consulta explícita.
export function crearEntrada({ bloqueado = () => false } = {}) {
  // code → 'saltar' | 'agacharse'
  const mapa = new Map();

  // Recarga el mapa: teclado de respaldo + calibración del puntero si existe.
  // Se llama al arrancar y cada vez que se recalibra.
  function recargarMapa() {
    mapa.clear();
    for (const codigo of ENTRADA.RESPALDO_TECLADO.saltar) mapa.set(codigo, 'saltar');
    for (const codigo of ENTRADA.RESPALDO_TECLADO.agacharse) mapa.set(codigo, 'agacharse');
    try {
      const guardado = JSON.parse(localStorage.getItem(ENTRADA.CLAVE_STORAGE));
      if (guardado?.saltar) mapa.set(guardado.saltar, 'saltar');
      if (guardado?.agacharse) mapa.set(guardado.agacharse, 'agacharse');
    } catch {
      // localStorage vacío o corrupto: seguimos solo con el teclado.
    }
  }
  recargarMapa();

  const oyentes = {
    saltar: new Set(),
    agacharse: new Set(), // al APRETAR agacharse
    soltarAgacharse: new Set(), // al SOLTAR agacharse
    cualquiera: new Set(), // cualquier acción (para "apretá un botón")
    calibrar: new Set(), // pedido de abrir la pantalla de calibración
  };

  const ultimaPulsacion = { saltar: 0, agacharse: 0 };
  let agachadoApretado = false;
  let saltarApretado = false;
  let temporizadorAmbos = null;

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

  function pedirCalibrar() {
    cancelarVigilanciaAmbos();
    for (const cb of oyentes.calibrar) cb();
  }

  // Recalibrar sin teclado: mantener los DOS botones del puntero 3 segundos.
  // Es la única forma de abrir la calibración en un stand sin teclado.
  function vigilarAmbos() {
    if (temporizadorAmbos !== null) return;
    if (!(saltarApretado && agachadoApretado)) return;
    temporizadorAmbos = setTimeout(pedirCalibrar, ENTRADA.RECALIBRAR_MANTENER_MS);
  }

  function cancelarVigilanciaAmbos() {
    if (temporizadorAmbos !== null) {
      clearTimeout(temporizadorAmbos);
      temporizadorAmbos = null;
    }
  }

  // ---------- Teclado (puntero USB o teclado físico) ----------
  window.addEventListener('keydown', (evento) => {
    if (bloqueado()) return;

    // Tecla de recalibración (teclado físico, para desarrollo y montaje).
    if (evento.code === ENTRADA.RECALIBRAR_TECLA) {
      evento.preventDefault();
      if (!evento.repeat) pedirCalibrar();
      return;
    }

    const accion = mapa.get(evento.code);
    if (!accion) return;
    evento.preventDefault();
    if (evento.repeat) return; // auto-repeat del puntero o del teclado
    if (accion === 'saltar') saltarApretado = true;
    disparar(accion);
    vigilarAmbos();
  });

  window.addEventListener('keyup', (evento) => {
    const accion = mapa.get(evento.code);
    if (!accion) return;
    evento.preventDefault();
    // El keyup se procesa siempre, incluso bloqueado: si no, una agachada
    // quedaría "apretada" para siempre al abrir la calibración.
    if (accion === 'saltar') saltarApretado = false;
    if (accion === 'agacharse') soltarAgacharse();
    cancelarVigilanciaAmbos();
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
      if (bloqueado()) return;
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
    // on('saltar' | 'agacharse' | 'soltarAgacharse' | 'cualquiera' |
    //    'calibrar', cb)
    on(evento, cb) {
      oyentes[evento].add(cb);
    },
    estaAgachadoApretado: () => agachadoApretado,
    // Se llama después de calibrar, para tomar los códigos nuevos.
    recargarMapa,
  };
}
