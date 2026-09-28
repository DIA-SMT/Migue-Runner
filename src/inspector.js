// inspector.js — página de trabajo TEMPORAL para revisar el arte de los
// obstáculos uno al lado del otro, con su caja de colisión dibujada encima.
// No es parte del juego; se borra cuando el arte esté aprobado.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PALETA, OBSTACULOS, JUGADOR, SALTO, POWERUPS, XR } from './config.js';
import { PIEZAS_POR_TIPO } from './obstaculos.js';
import { piezasPatineta, piezasEmpanada } from './powerups.js';
import { fusionarPiezas } from './geometria.js';
import { crearHud3d } from './hud3d.js';
import { crearPlaca3d } from './panel3d.js';

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

  // Caja de colisión en wireframe: verde si es bajo, rojo si es alto,
  // celeste si se esquiva de costado.
  const esBajo = t.clase === 'bajo';
  const esCostado = t.clase === 'costado';
  const yMin = esBajo ? 0 : esCostado ? t.ALTO_BASE : t.ALTO_LIBRE;
  const yMax = esBajo ? t.ALTO : esCostado ? t.ALTO_TOPE : t.ALTO_LIBRE + t.PANEL_ALTO + 0.5;
  const alto = yMax - yMin;
  const cajaColision = new THREE.Mesh(
    new THREE.BoxGeometry(t.ANCHO, alto, t.PROFUNDO),
    new THREE.MeshBasicMaterial({
      color: esBajo ? 0x00ff00 : esCostado ? 0x4fa3d1 : 0xff0000,
      wireframe: true,
    }),
  );
  // Los de costado no están centrados en x=0: ese corrimiento ES el
  // obstáculo, así que dibujarlos centrados escondería justo lo que hay que
  // revisar (dónde queda el hueco por el que hay que pasar).
  const centro = esCostado ? t.DESDE_X + t.ANCHO / 2 : 0;
  cajaColision.position.set(x + centro, yMin + alto / 2, 0);
  escena.add(cajaColision);

  // Y para los de costado, el hueco libre: por acá tiene que entrar Migue.
  if (esCostado) {
    const hueco = new THREE.Mesh(
      new THREE.BoxGeometry(JUGADOR.HITBOX.ANCHO, JUGADOR.HITBOX.ALTO, JUGADOR.HITBOX.PROFUNDO),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, wireframe: true }),
    );
    // Pegado al borde libre, que es donde queda el jugador desviado al máximo.
    hueco.position.set(x - JUGADOR.DESVIO_MAX, JUGADOR.HITBOX.ALTO / 2, 0);
    escena.add(hueco);
  }

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

// Con ?hud=1 se monta el HUD de realidad virtual en un rig, con datos de
// ejemplo, para revisar los paneles sin necesidad de un visor.
if (new URLSearchParams(location.search).get('hud') === '1') {
  const rig = new THREE.Group();
  escena.add(rig);
  const hud3d = crearHud3d(rig);
  const partida = {
    puntaje: 1234, vidas: 2, soles: 7, racha: 3, aciertos: 4, totalPreguntas: 6,
    distancia: 850, tiempo: 62, patineta: true, inmunidad: 2.4, esRecord: true,
  };
  const pantalla = new URLSearchParams(location.search).get('pantalla') ?? 'juego';
  hud3d.activar(true);
  if (pantalla === 'atraccion') {
    hud3d.mostrarAtraccion();
  } else if (pantalla === 'resultado') {
    hud3d.mostrarResultado(partida);
  } else {
    hud3d.mostrarJuego();
    hud3d.actualizarVidas(2);
    hud3d.actualizarPuntaje(1234);
    hud3d.actualizarSoles(7);
    hud3d.actualizarRacha(3);
    hud3d.actualizarNivel('Hora pico en el centro');
    hud3d.actualizarEstados(partida);
    hud3d.mostrarPregunta('¿En qué año se fundó San Miguel de Tucumán?');
    hud3d.mostrarFrase('¡Buena changoooo!');
  }
  // Con &diag=1 se agrega también el panel de diagnóstico de VR, para
  // revisar que entre y se lea sin necesidad del visor.
  if (new URLSearchParams(location.search).get('diag') === '1') {
    const c = XR.DIAG;
    const placa = crearPlaca3d({
      ancho: c.ancho,
      alto: c.alto,
      pixelesPorUnidad: XR.PIXELES_POR_METRO,
    });
    placa.malla.position.set(c.x, c.y, c.z);
    placa.malla.rotation.y = c.giro;
    placa.malla.visible = true;
    rig.add(placa.malla);
    placa.escribir(
      [
        { texto: 'DIAGNÓSTICO', color: '#4FA3D1', escala: 0.32 },
        { texto: 'mandos: 2   fps: 72', escala: 0.28, peso: 700 },
        { texto: 'gatillo SI   grip SI', escala: 0.28, peso: 700 },
        { texto: 'botones: 4,5', escala: 0.26, peso: 500 },
        { texto: 'ejes: 0.0,0.0,0.0,-0.9', escala: 0.26, peso: 500 },
        { texto: 'giro del cuerpo: -137°', escala: 0.26, peso: 500 },
        { texto: 'sin errores de JS', color: '#7fd6a4', escala: 0.26, peso: 700 },
      ],
      { borde: 'ninguno', alineado: 'izquierda' },
    );
  }

  // La cámara se pone donde estaría la cabeza del jugador, mirando al
  // frente, para ver los paneles como los vería en el visor. ?z= permite
  // echarse un poco atrás y ver el conjunto de una.
  camara.position.set(0, 1.6, Number(new URLSearchParams(location.search).get('z') ?? 0));
  controles.target.set(0, 1.8, -3.6);
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
