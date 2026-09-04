// main.js — bootstrap y orquestación del juego.
//
// Estados: ATRACCION (espera con Migue en idle) → JUGANDO (carrera con
// obstáculos y trivia) → RESULTADO (puntaje, vuelve solo a los 15 s).
// La calibración del puntero (Fase 2) se suma cuando esté el dispositivo;
// mientras tanto: Espacio/⬆ salta, Shift/⬇ agacha.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PALETA, MUNDO, CAMARA, LUCES, POST, RENDER, JUEGO, TRIVIA, OBSTACULOS } from './config.js';
import { crearMundo } from './world.js';
import { crearMigue } from './player.js';
import { crearEntrada } from './input.js';
import { crearObstaculos } from './obstaculos.js';
import { crearPortal } from './portals.js';
import { cargarPreguntas } from './quiz.js';
import { crearHud } from './hud.js';
import { crearEstados } from './states.js';

// ---------------------------------------------------------------------------
// Renderer, escena, cámara, luces, post
// ---------------------------------------------------------------------------
const app = document.querySelector('#app');

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.MAX_PIXEL_RATIO));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
// Sin tone mapping: la dirección de arte es de colores planos y el ACES
// lava la paleta (el OutputPass lo aplicaría a todo el frame por igual).
renderer.toneMapping = THREE.NoToneMapping;
app.appendChild(renderer.domElement);

const escena = new THREE.Scene();

const camara = new THREE.PerspectiveCamera(CAMARA.FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
camara.position.set(CAMARA.POSICION.x, CAMARA.POSICION.y, CAMARA.POSICION.z);
camara.lookAt(CAMARA.MIRA.x, CAMARA.MIRA.y, CAMARA.MIRA.z);

const luzCalida = new THREE.DirectionalLight(PALETA.LUZ_CALIDA, LUCES.CALIDA_INTENSIDAD);
luzCalida.position.set(7, 12, 5);
luzCalida.castShadow = true;
luzCalida.shadow.mapSize.set(1024, 1024);
luzCalida.shadow.camera.left = -14;
luzCalida.shadow.camera.right = 14;
luzCalida.shadow.camera.top = 14;
luzCalida.shadow.camera.bottom = -14;
luzCalida.shadow.camera.far = 40;
luzCalida.shadow.bias = -0.002;
escena.add(luzCalida);

const luzFria = new THREE.AmbientLight(PALETA.LUZ_FRIA, LUCES.FRIA_INTENSIDAD);
escena.add(luzFria);

const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
  samples: RENDER.MSAA_MUESTRAS,
  type: THREE.HalfFloatType,
});
const composer = new EffectComposer(renderer, renderTarget);
composer.addPass(new RenderPass(escena, camara));
composer.addPass(
  new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    POST.BLOOM_FUERZA,
    POST.BLOOM_RADIO,
    POST.BLOOM_UMBRAL,
  ),
);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------
// Contenido y sistemas
// ---------------------------------------------------------------------------
const mundo = crearMundo(escena);
const entrada = crearEntrada();
const hud = crearHud();
const obstaculos = crearObstaculos(escena);
const portal = crearPortal(escena);

let migue = null;
crearMigue(escena).then((resultado) => {
  migue = resultado;
  document.querySelector('#cargando')?.remove();
});

let quiz = null;
cargarPreguntas().then((resultado) => {
  quiz = resultado;
});

// ---------------------------------------------------------------------------
// Estado de la partida
// ---------------------------------------------------------------------------
const partida = {
  velocidad: MUNDO.VELOCIDAD_INICIAL,
  puntaje: 0,
  vidas: JUEGO.VIDAS,
  racha: 0,
  aciertos: 0,
  totalPreguntas: 0,
  distancia: 0,
  tiempo: 0,
  invulnerable: 0, // segundos restantes de invulnerabilidad tras un golpe
  proximaTrivia: TRIVIA.INTERVALO_S * 0.6, // la primera pregunta llega antes
  feedbackTimer: 0,
  preguntaPendiente: null,
};

function perderVida() {
  if (partida.invulnerable > 0) return;
  partida.vidas--;
  partida.invulnerable = OBSTACULOS.INVULNERABLE_S;
  hud.actualizarVidas(partida.vidas);
  if (partida.vidas <= 0) estados.cambiar('RESULTADO');
}

function resolverCruce(cruce) {
  hud.ocultarPregunta();
  partida.totalPreguntas++;
  const { pregunta, eleccion } = cruce;

  if (eleccion === null) {
    partida.racha = 0;
    hud.mostrarFeedback('neutro', 'Sin respuesta: ¡saltá o agachate al cruzar el portal!', '');
  } else if (eleccion === pregunta.correcta) {
    partida.aciertos++;
    partida.racha++;
    partida.puntaje += TRIVIA.PUNTOS_ACIERTO + TRIVIA.BONO_RACHA * (partida.racha - 1);
    hud.mostrarFeedback('ok', '¡Correcto!', pregunta.dato ?? '');
  } else {
    partida.racha = 0;
    const correcta = pregunta.correcta === 'arriba' ? pregunta.opcionArriba : pregunta.opcionAbajo;
    hud.mostrarFeedback('error', `Era: ${correcta}`, pregunta.dato ?? '');
    perderVida();
  }
  hud.actualizarRacha(partida.racha);
  partida.feedbackTimer = TRIVIA.DATO_S;
}

// ---------------------------------------------------------------------------
// Máquina de estados
// ---------------------------------------------------------------------------
const estados = crearEstados({
  ATRACCION: {
    entrar() {
      hud.mostrarAtraccion();
      migue?.reiniciar();
      portal.descartar();
      obstaculos.reiniciar();
    },
    actualizar(dt) {
      mundo.actualizar(dt, MUNDO.VELOCIDAD_ATRACCION);
      migue?.actualizar(dt, 'idle');
    },
  },

  JUGANDO: {
    entrar() {
      Object.assign(partida, {
        velocidad: MUNDO.VELOCIDAD_INICIAL,
        puntaje: 0,
        vidas: JUEGO.VIDAS,
        racha: 0,
        aciertos: 0,
        totalPreguntas: 0,
        distancia: 0,
        tiempo: 0,
        invulnerable: 0,
        proximaTrivia: TRIVIA.INTERVALO_S * 0.6,
        feedbackTimer: 0,
        preguntaPendiente: null,
      });
      migue?.reiniciar();
      obstaculos.reiniciar(true);
      portal.descartar();
      hud.mostrarJuego();
      hud.actualizarVidas(partida.vidas);
      hud.actualizarRacha(0);
    },
    actualizar(dt) {
      // Velocidad y distancia
      partida.velocidad = Math.min(MUNDO.VELOCIDAD_MAX, partida.velocidad + MUNDO.ACELERACION * dt);
      partida.tiempo += dt;
      partida.distancia += partida.velocidad * dt;
      partida.puntaje += partida.velocidad * dt * JUEGO.PUNTOS_POR_METRO;

      mundo.actualizar(dt, partida.velocidad);
      migue?.actualizar(dt, 'correr');

      // Invulnerabilidad post-golpe: parpadeo
      if (partida.invulnerable > 0) {
        partida.invulnerable -= dt;
        if (migue) migue.objeto.visible = Math.floor(partida.invulnerable * 10) % 2 === 0;
        if (partida.invulnerable <= 0 && migue) migue.objeto.visible = true;
      }

      // Obstáculos
      if (migue) {
        const eventos = obstaculos.actualizar(dt, partida.velocidad, migue);
        if (eventos.colision) perderVida();
      }

      // Trivia: programación del portal
      partida.proximaTrivia -= dt;
      if (partida.proximaTrivia <= 0 && quiz && !portal.estaActivo()) {
        const pregunta = quiz.proxima();
        hud.mostrarPregunta(pregunta.enunciado);
        const distanciaPortal = partida.velocidad * TRIVIA.AVISO_S;
        portal.lanzar(pregunta, distanciaPortal);
        obstaculos.suprimir(TRIVIA.AVISO_S + TRIVIA.SUPRESION_OBSTACULOS_S);
        obstaculos.despejarCerca(-distanciaPortal, partida.velocidad * 1.5);
        partida.proximaTrivia = TRIVIA.INTERVALO_S;
      }

      // Trivia: cruce del portal
      if (migue) {
        const cruce = portal.actualizar(dt, partida.velocidad, migue);
        if (cruce) resolverCruce(cruce);
      }

      // Feedback temporal
      if (partida.feedbackTimer > 0) {
        partida.feedbackTimer -= dt;
        if (partida.feedbackTimer <= 0) hud.ocultarFeedback();
      }

      hud.actualizarPuntaje(partida.puntaje);
    },
    salir() {
      if (migue) migue.objeto.visible = true;
    },
  },

  RESULTADO: {
    entrar() {
      resultadoTemporizador = JUEGO.RESULTADO_VOLVER_S;
      resultadoBloqueo = JUEGO.RESULTADO_BLOQUEO_S;
      hud.mostrarResultado(partida);
      portal.descartar();
    },
    actualizar(dt) {
      mundo.actualizar(dt, MUNDO.VELOCIDAD_ATRACCION);
      migue?.actualizar(dt, 'idle');
      resultadoBloqueo -= dt;
      resultadoTemporizador -= dt;
      // Vuelve solo a la atracción: stand desatendido.
      if (resultadoTemporizador <= 0) estados.cambiar('ATRACCION');
    },
  },
});

// Timers del estado RESULTADO (a nivel módulo para que los lea la entrada).
let resultadoTemporizador = 0;
let resultadoBloqueo = 0;

// ---------------------------------------------------------------------------
// Ruteo de la entrada según el estado
// ---------------------------------------------------------------------------
entrada.on('saltar', () => {
  if (estados.actual === 'JUGANDO') migue?.saltar();
});
entrada.on('agacharse', () => {
  if (estados.actual === 'JUGANDO') migue?.agacharse(true);
});
entrada.on('soltarAgacharse', () => {
  migue?.agacharse(false);
});
entrada.on('cualquiera', () => {
  if (estados.actual === 'ATRACCION') {
    estados.cambiar('JUGANDO');
  } else if (estados.actual === 'RESULTADO' && resultadoBloqueo <= 0) {
    // Tras un breve bloqueo (para no saltear el puntaje sin querer),
    // cualquier botón arranca una partida nueva.
    estados.cambiar('JUGANDO');
  }
});

estados.cambiar('ATRACCION');

// ---------------------------------------------------------------------------
// Bucle principal
// ---------------------------------------------------------------------------
const reloj = new THREE.Clock();

function cuadro() {
  const dt = Math.min(reloj.getDelta(), 0.05);
  estados.actualizar(dt);
  composer.render();
  requestAnimationFrame(cuadro);
}
requestAnimationFrame(cuadro);

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
