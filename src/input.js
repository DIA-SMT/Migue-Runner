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

import { ENTRADA, GAMEPAD as ENTRADA_GAMEPAD } from './config.js';

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
      // Un toque sobre un control de la interfaz (hoy el botón de VR) no es
      // una acción de juego. Sin esto, tocar ese botón haría saltar al
      // personaje además de abrir la sesión.
      if (evento.target?.closest?.('button, a, input')) return;
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

  // ---------- Mandos (Oculus Quest y joysticks) ----------
  // La Gamepad API no emite eventos de botón: hay que consultar el estado
  // en cada cuadro, así que revisarGamepad() se llama desde el bucle
  // principal. Se mantiene el estado anterior para detectar el flanco
  // (apretar y soltar) en vez de disparar en cada frame que esté apretado.
  //
  // En el navegador del Quest, además, apuntar con el mando y apretar el
  // gatillo ya genera un pointerdown en el punto donde se apunta, así que
  // los controles táctiles de dos zonas funcionan sin esto. Los botones son
  // la alternativa cómoda: no hay que apuntar a ningún lado.
  let saltarGamepadAntes = false;
  let agacharGamepadAntes = false;

  // Al conectarse un mando se marca <html class="hay-mando"> para que la
  // pantalla de espera muestre los botones del mando en vez de las teclas.
  // En el visor del Quest los mandos aparecen recién al primer movimiento,
  // así que esto puede activarse después de cargar la página.
  window.addEventListener('gamepadconnected', () => {
    document.documentElement.classList.add('hay-mando');
  });

  function revisarGamepad() {
    if (bloqueado()) return;
    const mandos = navigator.getGamepads?.() ?? [];
    let saltarAhora = false;
    let agacharAhora = false;

    for (const mando of mandos) {
      if (!mando) continue;
      for (const i of ENTRADA_GAMEPAD.BOTONES_SALTAR) {
        if (mando.buttons[i]?.pressed) saltarAhora = true;
      }
      for (const i of ENTRADA_GAMEPAD.BOTONES_AGACHARSE) {
        if (mando.buttons[i]?.pressed) agacharAhora = true;
      }
      // Palanca: arriba salta, abajo agacha. El eje viene invertido
      // (negativo hacia arriba) en el mapeo estándar.
      const eje = mando.axes[ENTRADA_GAMEPAD.EJE_VERTICAL] ?? 0;
      if (eje < -ENTRADA_GAMEPAD.UMBRAL_EJE) saltarAhora = true;
      if (eje > ENTRADA_GAMEPAD.UMBRAL_EJE) agacharAhora = true;
    }

    // Flanco de subida: se dispara al apretar, no mientras está apretado.
    if (saltarAhora && !saltarGamepadAntes) disparar('saltar');
    if (agacharAhora && !agacharGamepadAntes) disparar('agacharse');
    // Flanco de bajada de la agachada: hay que soltarla explícitamente.
    if (!agacharAhora && agacharGamepadAntes) soltarAgacharse();

    saltarGamepadAntes = saltarAhora;
    agacharGamepadAntes = agacharAhora;
  }

  return {
    // on('saltar' | 'agacharse' | 'soltarAgacharse' | 'cualquiera' |
    //    'calibrar', cb)
    on(evento, cb) {
      oyentes[evento].add(cb);
    },
    estaAgachadoApretado: () => agachadoApretado,
    // Se llama después de calibrar, para tomar los códigos nuevos.
    recargarMapa,
    // La Gamepad API se consulta por polling: esto va en el bucle principal.
    // Sirve para joysticks en el navegador, NO para los mandos dentro de
    // una sesión de VR (ahí no aparecen en navigator.getGamepads()); de
    // esos se encarga xr.js llamando a `accion()`.
    revisarGamepad,

    // Entrada desde otra fuente (hoy los mandos del visor). Entra por el
    // mismo bus que el teclado y el táctil, con el mismo debounce, así que
    // el ruteo por estado del juego no necesita saber de dónde vino.
    accion(cual) {
      if (bloqueado()) return;
      if (cual === 'soltarAgacharse') soltarAgacharse();
      else disparar(cual);
    },
  };
}
