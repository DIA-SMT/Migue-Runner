// inspector.js — página de trabajo TEMPORAL para revisar el arte de los
// obstáculos uno al lado del otro, con su caja de colisión dibujada encima.
// No es parte del juego; se borra cuando el arte esté aprobado.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PALETA, OBSTACULOS, JUGADOR, SALTO, POWERUPS } from './config.js';
import { PIEZAS_POR_TIPO } from './obstaculos.js';
import { piezasPatineta, piezasEmpanada } from './powerups.js';
import { fusionarPiezas } from './geometria.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const escena = new THREE.Scene();
escena.background = new THREE.Color(PALETA.CIELO_ALTO);

const camara = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
// El foco arranca donde diga ?x= en la URL, para poder mirar un obstáculo
// puntual de la fila sin arrastrar la cámara a mano.
const foco = Number(new URLSearchParams(location.search).get('x') ?? 0);
const zoom = Number(new URLSearchParams(location.search).get('z') ?? 46);
camara.position.set(foco, 5, zoom);

const controles = new OrbitControls(camara, renderer.domElement);
controles.target.set(foco, 1, 0);

escena.add(new THREE.DirectionalLight(PALETA.LUZ_CALIDA, 0.95).translateX(7).translateY(12).translateZ(5));
escena.add(new THREE.AmbientLight(PALETA.LUZ_FRIA, 0.55));

// Suelo de referencia
const suelo = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 20),
  new THREE.MeshStandardMaterial({ color: PALETA.BALDOSA, roughness: 1 }),
);
suelo.rotation.x = -Math.PI / 2;
escena.add(suelo);

// Se usan las mismas piezas que el juego, así lo que se ve acá es
// exactamente lo que aparece en la partida.
const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
const tipos = Object.keys(OBSTACULOS.TIPOS);
const etiquetas = document.querySelector('#etiquetas');
const puntosEtiqueta = [];

let x = -((tipos.length - 1) * 5) / 2;
for (const tipo of tipos) {
  const t = OBSTACULOS.TIPOS[tipo];
  const malla = new THREE.Mesh(fusionarPiezas(PIEZAS_POR_TIPO[tipo]()), material);
  malla.position.set(x, 0, 0);
  escena.add(malla);

  // Caja de colisión en wireframe: verde si es bajo, rojo si es alto.
  const esBajo = t.clase === 'bajo';
  const yMin = esBajo ? 0 : t.ALTO_LIBRE;
  const yMax = esBajo ? t.ALTO : t.ALTO_LIBRE + t.PANEL_ALTO + 0.5;
  const alto = yMax - yMin;
  const cajaColision = new THREE.Mesh(
    new THREE.BoxGeometry(t.ANCHO, alto, t.PROFUNDO),
    new THREE.MeshBasicMaterial({
      color: esBajo ? 0x00ff00 : 0xff0000,
      wireframe: true,
    }),
  );
  cajaColision.position.set(x, yMin + alto / 2, 0);
  escena.add(cajaColision);

  puntosEtiqueta.push({ x, tipo, clase: t.clase });
  x += 5;
}

// Power-ups, a continuación de los obstáculos y a su altura de vuelo real.
for (const [tipo, piezas, altura] of [
  ['patineta', piezasPatineta(), POWERUPS.PATINETA.ALTURA],
  ['empanada', piezasEmpanada(), POWERUPS.EMPANADA.ALTURA],
]) {
  const malla = new THREE.Mesh(fusionarPiezas(piezas), material);
  malla.position.set(x, altura, 0);
  escena.add(malla);
  puntosEtiqueta.push({ x, tipo, clase: 'power-up' });
  x += 5;
}

// Líneas de referencia: altura del salto y techo de la hitbox agachada.
const alturaSalto = SALTO.VELOCIDAD_INICIAL ** 2 / (2 * SALTO.GRAVEDAD);
for (const [y, color, nombre] of [
  [alturaSalto, 0x0000ff, 'pies en el pico del salto'],
  [JUGADOR.HITBOX.ALTO_AGACHADO, 0xff00ff, 'techo agachado'],
  [JUGADOR.HITBOX.ALTO, 0x000000, 'techo de pie'],
]) {
  const linea = new THREE.Mesh(
    new THREE.BoxGeometry(70, 0.02, 0.02),
    new THREE.MeshBasicMaterial({ color }),
  );
  linea.position.set(0, y, 0);
  escena.add(linea);
  void nombre;
}

function pintarEtiquetas() {
  etiquetas.innerHTML = puntosEtiqueta
    .map(({ x: px, tipo, clase }) => {
      const v = new THREE.Vector3(px, -0.2, 0).project(camara);
      const sx = ((v.x + 1) / 2) * window.innerWidth;
      const sy = ((-v.y + 1) / 2) * window.innerHeight;
      return `<span style="left:${sx}px; top:${sy}px">${tipo} (${clase})</span>`;
    })
    .join('');
}

function cuadro() {
  controles.update();
  pintarEtiquetas();
  renderer.render(escena, camara);
  requestAnimationFrame(cuadro);
}
cuadro();

window.addEventListener('resize', () => {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
