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
//  - Se enciende una viñeta de confort: un cono oscuro alrededor de la
//    cabeza que recorta la visión periférica. Reduce bastante el mareo del
//    movimiento automático, que es el riesgo real de un runner en VR.

import * as THREE from 'three';
import { XR } from './config.js';

// Viñeta de confort: una esfera invertida con un agujero al frente. Al
// tapar la periferia, el flujo óptico del movimiento deja de empujar al
// sistema vestibular.
function crearVinetaConfort() {
  const geometria = new THREE.SphereGeometry(
    XR.VINETA_RADIO,
    24,
    16,
    0,
    Math.PI * 2,
    XR.VINETA_ANGULO,
    Math.PI - XR.VINETA_ANGULO * 2,
  );
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.BackSide,
    transparent: true,
    opacity: XR.VINETA_OPACIDAD,
    depthWrite: false,
  });
  const vineta = new THREE.Mesh(geometria, material);
  // Acostada: el agujero mira hacia adelante, no hacia arriba.
  vineta.rotation.x = Math.PI / 2;
  vineta.renderOrder = 90;
  return vineta;
}

// `al Entrar` / `alSalir` los usa main.js para cambiar de HUD y de modo de
// render. `rig` es el grupo que representa el cuerpo del jugador.
export function crearXR({ renderer, rig, alEntrar, alSalir }) {
  let soportado = false;
  let boton = null;

  const vineta = crearVinetaConfort();
  vineta.visible = false;
  rig.add(vineta);

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

  renderer.xr.addEventListener('sessionstart', () => {
    renderer.xr.setReferenceSpaceType('local-floor');
    // El jugador queda donde estaba la cámara en pantalla plana: detrás y
    // apenas arriba de Migue. La altura la aporta su propio cuerpo, así que
    // el rig va al piso.
    rig.position.set(0, 0, XR.RIG_Z);
    vineta.visible = XR.VINETA_ACTIVA;
    pintarBoton('Salir de VR', true);
    alEntrar?.();
  });

  renderer.xr.addEventListener('sessionend', () => {
    rig.position.set(0, 0, 0);
    vineta.visible = false;
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
  };
}
