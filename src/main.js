// main.js — bootstrap y orquestación del juego.
//
// Estados: ATRACCION (espera, los dos personajes en idle) → JUGANDO (carrera
// con obstáculos, soles y trivia) → RESULTADO (puntaje y récord, vuelve solo
// a los 15 s). La calibración del puntero (Fase 2) se abre a mano con la
// tecla C o manteniendo los dos botones 3 segundos.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  PALETA,
  MUNDO,
  CAMARA,
  LUCES,
  POST,
  RENDER,
  JUEGO,
  TRIVIA,
  OBSTACULOS,
  FRASES,
  COLECCIONABLES,
  JUICE,
} from './config.js';
import { crearMundo } from './world.js';
import { crearPersonajes } from './player.js';
import { crearEntrada } from './input.js';
import { crearAudio } from './audio.js';
import { crearObstaculos } from './obstaculos.js';
import { crearDificultad } from './dificultad.js';
import { crearColeccionables } from './coleccionables.js';
import { crearParticulas } from './particulas.js';
import { crearPortal } from './portals.js';
import { cargarPreguntas } from './quiz.js';
import { crearHud } from './hud.js';
import { crearCalibracion } from './calibracion.js';
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
const hud = crearHud();
const audio = crearAudio();
const dificultad = crearDificultad();
const obstaculos = crearObstaculos(escena, dificultad);
const particulas = crearParticulas(escena);
const portal = crearPortal(escena);

// La calibración se adueña de la entrada mientras está abierta. Se declara
// antes de crearla para poder pasarle la consulta a la entrada.
let calibracion = null;
const entrada = crearEntrada({ bloqueado: () => calibracion?.estaActiva() ?? false });

calibracion = crearCalibracion({
  // Al terminar de calibrar, la entrada toma los códigos nuevos en caliente.
  alGuardar(capturas) {
    entrada.recargarMapa();
    console.info('Puntero calibrado:', capturas);
  },
});

// Los soles no aparecen encima de un obstáculo: un arco a la altura del
// salto dentro de un cartel colgante sería una trampa, no un desafío.
const coleccionables = crearColeccionables(escena, {
  zonaOcupada: (z, margen) => obstaculos.hayCerca(z, margen),
});

let jugador = null;
crearPersonajes(escena).then((resultado) => {
  jugador = resultado;
  document.querySelector('#cargando')?.remove();
});

let quiz = null;
cargarPreguntas().then((resultado) => {
  quiz = resultado;
});

// ---------------------------------------------------------------------------
// Récord local. No es ranking online: es el mejor puntaje de esta máquina,
// para que la gente del stand compita entre sí.
// ---------------------------------------------------------------------------
function leerRecord() {
  try {
    return Number(localStorage.getItem(JUEGO.CLAVE_RECORD)) || 0;
  } catch {
    return 0; // localStorage bloqueado (modo privado): se juega sin récord
  }
}

function guardarRecord(valor) {
  try {
    localStorage.setItem(JUEGO.CLAVE_RECORD, String(valor));
  } catch {
    // Sin persistencia: no es motivo para romper la partida.
  }
}

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
  soles: 0,
  distancia: 0,
  tiempo: 0,
  invulnerable: 0, // segundos restantes de invulnerabilidad tras un golpe
  proximaTrivia: TRIVIA.INTERVALO_S * 0.6, // la primera pregunta llega antes
  feedbackTimer: 0,
  esquivados: 0, // obstáculos superados (para los festejos)
  proximoFestejo: FRASES.CADA_ESQUIVADOS,
  recordAnterior: 0,
  esRecord: false,
};

// Sacudida de cámara: se pide con `sacudir()` y se apaga sola.
let sacudida = 0;
function sacudir(intensidad) {
  sacudida = Math.max(sacudida, intensidad);
}

function fraseAlAzar() {
  return FRASES.LISTA[Math.floor(Math.random() * FRASES.LISTA.length)];
}

// Altura aproximada del torso del personaje, para nacer las partículas ahí.
const ALTURA_IMPACTO = 0.9;

function perderVida() {
  if (partida.invulnerable > 0) return;
  partida.vidas--;
  partida.invulnerable = OBSTACULOS.INVULNERABLE_S;
  hud.actualizarVidas(partida.vidas);
  hud.destellarDano();
  audio.golpe();
  sacudir(JUICE.SACUDIDA_GOLPE);
  particulas.estallar(0, ALTURA_IMPACTO, 0, JUICE.PARTICULAS_GOLPE, PALETA.VALLA_NARANJA, 2);
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
    hud.mostrarFrase(fraseAlAzar());
    audio.acierto();
    sacudir(JUICE.SACUDIDA_ACIERTO);
    particulas.estallar(0, ALTURA_IMPACTO, 0, JUICE.PARTICULAS_GOLPE, PALETA.SOL, 1);
  } else {
    partida.racha = 0;
    const correcta = pregunta.correcta === 'arriba' ? pregunta.opcionArriba : pregunta.opcionAbajo;
    hud.mostrarFeedback('error', `Era: ${correcta}`, pregunta.dato ?? '');
    perderVida();
  }
  hud.actualizarRacha(partida.racha);
  partida.feedbackTimer = TRIVIA.DATO_S;

  // Que nada te llegue mientras leés el dato: sin spawns nuevos y despeje
  // de lo que ya venía demasiado cerca.
  obstaculos.suprimir(TRIVIA.DESPEJE_POST_CRUCE_S);
  const despeje = partida.velocidad * TRIVIA.DESPEJE_POST_CRUCE_S;
  obstaculos.despejarCerca(-despeje / 2, despeje / 2 + 2);
}

// ---------------------------------------------------------------------------
// Máquina de estados
// ---------------------------------------------------------------------------
const estados = crearEstados({
  ATRACCION: {
    entrar() {
      hud.mostrarAtraccion();
      hud.actualizarRecordAtraccion(leerRecord());
      jugador?.reiniciar();
      jugador?.modoAtraccion(); // Migue y Chanbachi, lado a lado
      portal.descartar();
      dificultad.reiniciar();
      obstaculos.reiniciar();
      coleccionables.reiniciar();
      particulas.limpiar();
    },
    actualizar(dt) {
      mundo.actualizar(dt, MUNDO.VELOCIDAD_ATRACCION);
      jugador?.actualizar(dt, 'idle');
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
        soles: 0,
        distancia: 0,
        tiempo: 0,
        invulnerable: 0,
        proximaTrivia: TRIVIA.INTERVALO_S * 0.6,
        feedbackTimer: 0,
        esquivados: 0,
        proximoFestejo: FRASES.CADA_ESQUIVADOS,
        recordAnterior: leerRecord(),
        esRecord: false,
      });
      jugador?.reiniciar();
      dificultad.reiniciar();
      obstaculos.reiniciar(true, MUNDO.VELOCIDAD_INICIAL);
      coleccionables.reiniciar();
      particulas.limpiar();
      portal.descartar();
      hud.mostrarJuego();
      hud.actualizarVidas(partida.vidas);
      hud.actualizarSoles(0);
      hud.actualizarRacha(0);
      hud.actualizarNivel(dificultad.nivel.nombre);
      audio.iniciarMusica(); // hay gesto del usuario: el autoplay no molesta
    },
    actualizar(dt) {
      // Velocidad y distancia
      partida.velocidad = Math.min(MUNDO.VELOCIDAD_MAX, partida.velocidad + MUNDO.ACELERACION * dt);
      partida.tiempo += dt;
      partida.distancia += partida.velocidad * dt;
      partida.puntaje += partida.velocidad * dt * JUEGO.PUNTOS_POR_METRO;

      mundo.actualizar(dt, partida.velocidad);
      jugador?.actualizar(dt, 'correr', partida.velocidad);
      particulas.actualizar(dt, partida.velocidad);

      // Dificultad: cada nivel habilita obstáculos y combos nuevos.
      const nivelNuevo = dificultad.revisarAscenso(partida.distancia);
      if (nivelNuevo) {
        hud.actualizarNivel(nivelNuevo.nombre);
        hud.mostrarFrase(nivelNuevo.nombre);
        audio.festejo();
      }

      // Invulnerabilidad post-golpe: parpadeo
      if (partida.invulnerable > 0) {
        partida.invulnerable -= dt;
        if (jugador) jugador.objeto.visible = Math.floor(partida.invulnerable * 10) % 2 === 0;
        if (partida.invulnerable <= 0 && jugador) jugador.objeto.visible = true;
      }

      if (jugador) {
        // Obstáculos
        const eventos = obstaculos.actualizar(dt, partida.velocidad, jugador);
        if (eventos.colision) perderVida();
        partida.esquivados += eventos.esquivados;
        // Festejo argento cada tantos obstáculos superados
        if (partida.esquivados >= partida.proximoFestejo) {
          partida.proximoFestejo += FRASES.CADA_ESQUIVADOS;
          hud.mostrarFrase(fraseAlAzar());
          audio.festejo();
        }

        // Soles de la ciudad
        const juntados = coleccionables.actualizar(dt, partida.velocidad, jugador);
        if (juntados > 0) {
          partida.soles += juntados;
          partida.puntaje += juntados * COLECCIONABLES.VALOR;
          hud.actualizarSoles(partida.soles, true);
          audio.sol();
          particulas.estallar(
            0,
            ALTURA_IMPACTO,
            0,
            JUICE.PARTICULAS_SOL * juntados,
            PALETA.SOL,
            1,
          );
        }
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
        // Los soles tampoco: el portal necesita la pista despejada para que
        // la elección de respuesta sea la única cosa que importe ahí.
        coleccionables.despejarCerca(-distanciaPortal, partida.velocidad * 1.5);
        partida.proximaTrivia = TRIVIA.INTERVALO_S;
      }

      // Trivia: cruce del portal
      if (jugador) {
        const cruce = portal.actualizar(dt, partida.velocidad, jugador);
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
      if (jugador) jugador.objeto.visible = true;
    },
  },

  RESULTADO: {
    entrar() {
      resultadoTemporizador = JUEGO.RESULTADO_VOLVER_S;
      resultadoBloqueo = JUEGO.RESULTADO_BLOQUEO_S;

      // ¿Récord nuevo? Se compara contra el valor leído al empezar.
      const puntajeFinal = Math.floor(partida.puntaje);
      partida.esRecord = puntajeFinal > partida.recordAnterior;
      if (partida.esRecord) guardarRecord(puntajeFinal);

      hud.mostrarResultado(partida);
      portal.descartar();
    },
    actualizar(dt) {
      mundo.actualizar(dt, MUNDO.VELOCIDAD_ATRACCION);
      jugador?.actualizar(dt, 'idle');
      particulas.actualizar(dt, MUNDO.VELOCIDAD_ATRACCION);
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
// En la atracción, los dos botones eligen personaje y arrancan la partida:
// saltar = Migue, agacharse = Chanbachi (dos botones, dos personajes).
entrada.on('saltar', () => {
  if (calibracion.estaActiva()) return;
  if (estados.actual === 'JUGANDO') {
    jugador?.saltar();
  } else if (estados.actual === 'ATRACCION' && jugador) {
    jugador.seleccionar('migue');
    estados.cambiar('JUGANDO');
  }
});
entrada.on('agacharse', () => {
  if (calibracion.estaActiva()) return;
  if (estados.actual === 'JUGANDO') {
    jugador?.agacharse(true);
  } else if (estados.actual === 'ATRACCION' && jugador) {
    jugador.seleccionar('chanbachi');
    estados.cambiar('JUGANDO');
  }
});
entrada.on('soltarAgacharse', () => {
  jugador?.agacharse(false);
});
entrada.on('cualquiera', () => {
  if (calibracion.estaActiva()) return;
  // Tras un breve bloqueo (para no saltear el puntaje sin querer),
  // cualquier botón vuelve a la selección de personaje.
  if (estados.actual === 'RESULTADO' && resultadoBloqueo <= 0) {
    estados.cambiar('ATRACCION');
  }
});
entrada.on('calibrar', () => {
  // Calibrar es una acción de montaje, no de partida: si había una en curso
  // se vuelve a la espera, así nadie pierde vidas mirando la calibración.
  if (estados.actual === 'JUGANDO') estados.cambiar('ATRACCION');
  calibracion.iniciar();
});

estados.cambiar('ATRACCION');

// ---------------------------------------------------------------------------
// Pantalla completa (pulido de stand): tecla F. No se fuerza sola porque
// el navegador la rechaza sin gesto del usuario y sorprendería a quien
// entre desde el celular.
// ---------------------------------------------------------------------------
window.addEventListener('keydown', (evento) => {
  if (evento.code !== 'KeyF' || evento.repeat) return;
  evento.preventDefault();
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
});

// ---------------------------------------------------------------------------
// Bucle principal
// ---------------------------------------------------------------------------
const reloj = new THREE.Clock();
let tiempoTotal = 0;

function aplicarSacudida(dt) {
  // Decaimiento exponencial: el temblor arranca fuerte y se apaga solo.
  sacudida *= Math.exp(-JUICE.SACUDIDA_AMORTIGUACION * dt);
  if (sacudida < 0.001) {
    sacudida = 0;
    camara.position.set(CAMARA.POSICION.x, CAMARA.POSICION.y, CAMARA.POSICION.z);
  } else {
    const fase = tiempoTotal * JUICE.SACUDIDA_FRECUENCIA;
    camara.position.set(
      CAMARA.POSICION.x + Math.sin(fase * 1.7) * sacudida,
      CAMARA.POSICION.y + Math.cos(fase * 2.3) * sacudida,
      CAMARA.POSICION.z,
    );
  }
  camara.lookAt(CAMARA.MIRA.x, CAMARA.MIRA.y, CAMARA.MIRA.z);
}

function cuadro() {
  const dt = Math.min(reloj.getDelta(), 0.05);
  tiempoTotal += dt;
  estados.actualizar(dt);
  aplicarSacudida(dt);
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
