// xr.js — sesión de realidad virtual inmersiva (WebXR) para el Oculus Quest.
//
// TODO acá es aditivo: si el navegador no soporta VR inmersiva, este módulo
// no hace nada y el juego sigue exactamente igual que siempre. El botón de
// entrada sólo se crea cuando `isSessionSupported('immersive-vr')` da true,
// así que en la notebook del stand no aparece.
//
// Lo que cambia DENTRO de la sesión, y por qué:
//
//  - El HUD pasa a paneles 3D (hud3d.js): en una sesión inmersiva el DOM no
//    se renderiza.
//  - Se apaga el bloom. El EffectComposer de three.js no soporta XR (hay
//    que renderizar a los framebuffers que provee el dispositivo, uno por
//    ojo), así que en VR se dibuja directo.
//  - Se apaga la sacudida de cámara. Mover el punto de vista sin que la
//    persona lo haya movido es una de las causas más directas de malestar.
//  - Se enciende una viñeta de confort pegada a la CABEZA (ver abajo).
//  - Se recentra la escena según hacia dónde esté mirando la persona.

import * as THREE from 'three';
import { XR } from './config.js';

// --- Viñeta de confort ---
//
// Va como hija de la CÁMARA, no del rig. Es la corrección de un bug que
// se vio en el visor: antes era una esfera centrada en el rig, y el rig
// está al nivel del PISO. Con la cabeza a 1,6 m de altura, la banda oscura
// de esa esfera cruzaba el campo visual en diagonal en vez de rodearlo —
// se veía "todo cruzado".
//
// Ahora es un plano con degradado radial pegado delante de los ojos:
// transparente en el centro, opaco en los bordes. Al tapar la periferia,
// el flujo óptico del movimiento deja de empujar al sistema vestibular.
function crearVinetaConfort() {
  const lienzo = document.createElement('canvas');
  lienzo.width = 256;
  lienzo.height = 256;
  const ctx = lienzo.getContext('2d');
  const centro = 128;
  const degrade = ctx.createRadialGradient(
    centro,
    centro,
    centro * XR.VINETA_CENTRO_LIBRE,
    centro,
    centro,
    centro,
  );
  degrade.addColorStop(0, 'rgba(0,0,0,0)');
  degrade.addColorStop(1, `rgba(0,0,0,${XR.VINETA_OPACIDAD})`);
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, 256, 256);

  const textura = new THREE.CanvasTexture(lienzo);
  const lado = XR.VINETA_DISTANCIA * XR.VINETA_LADO;
  const vineta = new THREE.Mesh(
    new THREE.PlaneGeometry(lado, lado),
    new THREE.MeshBasicMaterial({
      map: textura,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  vineta.position.z = -XR.VINETA_DISTANCIA;
  // Detrás del HUD (renderOrder 100) pero delante del mundo.
  vineta.renderOrder = 95;
  vineta.frustumCulled = false;
  return vineta;
}

// Gira el rig para que la persona quede mirando hacia la calle (-Z), sin
// importar hacia dónde estuviera mirando al ponerse el visor.
//
// WebXR orienta el espacio 'local-floor' según la pose inicial del casco:
// si alguien entra mirando a la pared de al lado, ve la peatonal de
// costado. Esto se exporta aparte para poder testear la matemática sin
// visor, que es lo único verificable de este módulo desde una notebook.
export function recentrarRig(rig, camara) {
  const direccion = new THREE.Vector3();
  camara.getWorldDirection(direccion);
  direccion.y = 0;
  if (direccion.lengthSq() < 1e-6) return; // mirando al piso o al cielo
  direccion.normalize();

  // Ángulo con signo entre la mirada actual y el eje -Z, alrededor de Y.
  // El producto vectorial da el sentido del giro y el escalar el coseno.
  const objetivo = new THREE.Vector3(0, 0, -1);
  const cruz = direccion.x * objetivo.z - direccion.z * objetivo.x;
  const punto = direccion.x * objetivo.x + direccion.z * objetivo.z;
  const desvio = Math.atan2(cruz, punto);

  // Se RESTA, no se suma. La cámara va adentro del rig, así que girar el
  // rig gira también la mirada: sumar el desvío lo duplicaba en vez de
  // corregirlo (a 45° del objetivo quedaba a 90°). Restarlo lo cancela.
  rig.rotation.y -= desvio;
}

// `alEntrar` / `alSalir` los usa main.js para cambiar de HUD y de modo de
// render. `rig` es el grupo que representa el cuerpo del jugador.
// `acciones` conecta los mandos del visor con la entrada del juego.
export function crearXR({ renderer, camara, rig, alEntrar, alSalir, acciones = {} }) {
  let soportado = false;
  let boton = null;
  let recentrarPendiente = false;

  const vineta = crearVinetaConfort();
  vineta.visible = false;
  // Hija de la cámara: acompaña la cabeza, que es lo que una viñeta de
  // confort necesita para funcionar.
  camara.add(vineta);

  function pintarBoton(texto, habilitado) {
    if (!boton) return;
    boton.textContent = texto;
    boton.disabled = !habilitado;
  }

  async function entrar() {
    try {
      const sesion = await navigator.xr.requestSession('immersive-vr', {
        // 'local-floor' pone el origen en el piso real, así que la persona
        // queda parada en la peatonal a su altura verdadera.
        optionalFeatures: ['local-floor', 'bounded-floor'],
      });
      await renderer.xr.setSession(sesion);
    } catch (error) {
      console.error('No se pudo entrar en VR.', error);
      pintarBoton('VR no disponible', false);
    }
  }

  // --- Mandos del visor ---
  //
  // OJO: dentro de una sesión inmersiva, navigator.getGamepads() NO
  // devuelve los mandos del Quest. Ese fue el bug por el que no se podía
  // apretar nada: la Gamepad API sólo los ve en el navegador 2D. Dentro de
  // la sesión hay que usar los eventos de la propia sesión y, para los
  // botones que no tienen evento propio, session.inputSources[].gamepad.
  function conectarMandos(sesion) {
    // 'select' es el gatillo y 'squeeze' el grip, en los dos mandos.
    sesion.addEventListener('selectstart', () => acciones.saltar?.());
    sesion.addEventListener('squeezestart', () => acciones.agacharse?.());
    sesion.addEventListener('squeezeend', () => acciones.soltarAgacharse?.());
  }

  // Botones A/B/X/Y y palancas: no emiten eventos de sesión, así que se
  // consultan por cuadro. Se detecta el flanco para que mantener apretado
  // dispare una sola vez.
  let saltarAntes = false;
  let agacharAntes = false;

  function revisarMandos() {
    const sesion = renderer.xr.getSession();
    if (!sesion) return;

    let saltar = false;
    let agachar = false;
    for (const fuente of sesion.inputSources) {
      const mando = fuente.gamepad;
      if (!mando) continue;
      // Mapeo 'xr-standard': 4 = A/X, 5 = B/Y. El gatillo (0) y el grip (1)
      // ya llegan por evento, así que acá se cubren los botones de pulgar.
      for (const i of XR.BOTONES_SALTAR) if (mando.buttons[i]?.pressed) saltar = true;
      for (const i of XR.BOTONES_AGACHARSE) if (mando.buttons[i]?.pressed) agachar = true;
      const eje = mando.axes[XR.EJE_VERTICAL] ?? 0;
      if (eje < -XR.UMBRAL_EJE) saltar = true;
      if (eje > XR.UMBRAL_EJE) agachar = true;
    }

    if (saltar && !saltarAntes) acciones.saltar?.();
    if (agachar && !agacharAntes) acciones.agacharse?.();
    if (!agachar && agacharAntes) acciones.soltarAgacharse?.();
    saltarAntes = saltar;
    agacharAntes = agachar;
  }

  renderer.xr.addEventListener('sessionstart', () => {
    renderer.xr.setReferenceSpaceType('local-floor');
    // El jugador queda donde estaba la cámara en pantalla plana: detrás y
    // apenas arriba de Migue. La altura la aporta su propio cuerpo, así que
    // el rig va al piso.
    rig.position.set(0, 0, XR.RIG_Z);
    rig.rotation.set(0, 0, 0);
    // El recentrado se hace en el bucle, no acá: recién en el primer cuadro
    // de la sesión hay una pose de cabeza real para medir.
    recentrarPendiente = true;
    vineta.visible = XR.VINETA_ACTIVA;
    pintarBoton('Salir de VR', true);
    conectarMandos(renderer.xr.getSession());
    alEntrar?.();
  });

  renderer.xr.addEventListener('sessionend', () => {
    rig.position.set(0, 0, 0);
    rig.rotation.set(0, 0, 0);
    vineta.visible = false;
    saltarAntes = false;
    agacharAntes = false;
    pintarBoton('Entrar en VR', true);
    alSalir?.();
  });

  // --- Detección de soporte y botón ---
  // El botón se agrega al DOM sólo si hay VR de verdad. Así el stand y el
  // celular no ven nada nuevo.
  async function inicializar() {
    if (!navigator.xr?.isSessionSupported) return;
    try {
      soportado = await navigator.xr.isSessionSupported('immersive-vr');
    } catch {
      soportado = false;
    }
    if (!soportado) return;

    boton = document.createElement('button');
    boton.id = 'boton-vr';
    boton.textContent = 'Entrar en VR';
    boton.addEventListener('click', () => {
      if (renderer.xr.isPresenting) renderer.xr.getSession()?.end();
      else entrar();
    });
    document.body.appendChild(boton);
    console.info('VR inmersiva disponible: botón agregado.');
  }
  inicializar();

  return {
    estaEnVR: () => renderer.xr.isPresenting,
    esSoportado: () => soportado,

    // Se llama una vez por cuadro desde el bucle principal.
    actualizar() {
      if (!renderer.xr.isPresenting) return;
      if (recentrarPendiente) {
        recentrarPendiente = false;
        recentrarRig(rig, camara);
      }
      revisarMandos();
    },

    // Para volver a orientar la escena a mano si alguien se corrió de lugar.
    recentrar() {
      recentrarPendiente = true;
    },
  };
}
