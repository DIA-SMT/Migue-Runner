// world.js — el ambiente tucumano: cielo, sol, cerros, lomas, cañaverales,
// suelo con sendero y nubes. Expone crearMundo(), que arma todo y devuelve
// un objeto con actualizar(dt) para animar el scroll.
//
// Dirección de arte: colores planos estilizados, sin mapas de textura salvo
// los degradés/franjas del cielo y el suelo (generados en canvas, siguen
// siendo colores planos). Los elementos de fondo llevan toneMapped:false
// para que el ACES del renderer no lave la paleta.
// Presupuesto: menos de 60 draw calls en total.

import * as THREE from 'three';
import { PALETA, MUNDO } from './config.js';

// Convierte un token de paleta a THREE.Color.
const color = (hex) => new THREE.Color(hex);
const hexCss = (hex) => '#' + color(hex).getHexString();

// ---------------------------------------------------------------------------
// Cielo: domo con degradé vertical (cielo alto → horizonte cálido).
// ---------------------------------------------------------------------------
function crearCielo() {
  const lienzo = document.createElement('canvas');
  lienzo.width = 4;
  lienzo.height = 256;
  const ctx = lienzo.getContext('2d');
  // El degradé se concentra cerca del horizonte: la cámara mira casi
  // horizontal, así que el azul tiene que dominar la mayor parte del domo.
  const degrade = ctx.createLinearGradient(0, 0, 0, 256);
  degrade.addColorStop(0.0, hexCss(PALETA.CIELO_ALTO));
  degrade.addColorStop(0.6, '#' + color(PALETA.CIELO_ALTO).lerp(color(PALETA.CIELO_BAJO), 0.18).getHexString());
  degrade.addColorStop(0.85, '#' + color(PALETA.CIELO_ALTO).lerp(color(PALETA.CIELO_BAJO), 0.6).getHexString());
  degrade.addColorStop(1.0, hexCss(PALETA.CIELO_BAJO));
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, 4, 256);

  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;

  // Esfera invertida gigante; el degradé se mapea de polo a ecuador.
  const geometria = new THREE.SphereGeometry(480, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const material = new THREE.MeshBasicMaterial({
    map: textura,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
    toneMapped: false,
  });
  const domo = new THREE.Mesh(geometria, material);
  domo.renderOrder = -10;
  return domo;
}

// ---------------------------------------------------------------------------
// Sol: disco pleno cerca del horizonte. toneMapped:false y color fuera de
// rango [0,1] para que el bloom lo haga brillar (guiño al sol del isologo).
// ---------------------------------------------------------------------------
function crearSol() {
  const material = new THREE.MeshBasicMaterial({
    color: color(PALETA.SOL).multiplyScalar(1.7),
    fog: false,
    toneMapped: false,
  });
  const sol = new THREE.Mesh(new THREE.CircleGeometry(22, 32), material);
  sol.position.set(-70, 58, -430);
  return sol;
}

// ---------------------------------------------------------------------------
// Cerros de fondo: dos capas de siluetas estáticas (están "más allá" de la
// niebla, por eso fog:false y colores ya atenuados). Perfil dentado fijo,
// inspirado en el Aconquija.
// ---------------------------------------------------------------------------
function crearCapaCerros(picos, colorCapa, altura, y, z) {
  const forma = new THREE.Shape();
  const ancho = 900;
  forma.moveTo(-ancho / 2, 0);
  const n = picos.length;
  for (let i = 0; i < n; i++) {
    const x = -ancho / 2 + (ancho * (i + 0.5)) / n;
    forma.lineTo(x, picos[i] * altura);
  }
  forma.lineTo(ancho / 2, 0);
  forma.closePath();

  const geometria = new THREE.ShapeGeometry(forma);
  const material = new THREE.MeshBasicMaterial({ color: colorCapa, fog: false, toneMapped: false });
  const capa = new THREE.Mesh(geometria, material);
  capa.position.set(0, y, z);
  return capa;
}

function crearCerros() {
  const grupo = new THREE.Group();
  // Perfiles fijos (no aleatorios: que el fondo sea estable entre partidas).
  const lejos = [0.35, 0.7, 0.5, 0.95, 0.6, 1.0, 0.55, 0.8, 0.4, 0.75, 0.5, 0.3];
  const cerca = [0.5, 0.3, 0.75, 0.45, 0.85, 0.4, 0.65, 0.9, 0.5, 0.7, 0.35, 0.55];
  const capaLejos = crearCapaCerros(lejos, PALETA.CERRO_LEJOS, 85, 0, -440);
  const capaCerca = crearCapaCerros(cerca, PALETA.CERRO_MEDIO, 55, 0, -400);
  capaCerca.position.x = 40; // desfasada para que no coincidan los picos
  grupo.add(capaLejos, capaCerca);
  return grupo;
}

// ---------------------------------------------------------------------------
// Lomas intermedias: medias esferas achatadas verdes a los costados, que sí
// avanzan (a media velocidad: es la capa de parallax en movimiento).
// ---------------------------------------------------------------------------
function crearLomas() {
  const geometria = new THREE.SphereGeometry(1, 14, 9);
  const material = new THREE.MeshStandardMaterial({ color: PALETA.CERRO_CERCA, roughness: 1 });
  const lomas = new THREE.InstancedMesh(geometria, material, MUNDO.LOMAS_CANTIDAD);

  // Distribución fija pseudoaleatoria (semilla manual, sin Math.random para
  // que la escena sea reproducible).
  const datos = [];
  for (let i = 0; i < MUNDO.LOMAS_CANTIDAD; i++) {
    const frac = i / MUNDO.LOMAS_CANTIDAD;
    const lado = i % 2 === 0 ? -1 : 1;
    const ruido = ((i * 7919) % 100) / 100; // determinista
    datos.push({
      x: lado * (MUNDO.LOMAS_X_MIN + ruido * (MUNDO.LOMAS_X_MAX - MUNDO.LOMAS_X_MIN)),
      z: -MUNDO.LOMAS_LARGO_CICLO * frac,
      radio: 12 + ruido * 16,
      alto: 3.5 + ruido * 4,
    });
  }

  const matriz = new THREE.Matrix4();
  const actualizarInstancias = () => {
    datos.forEach((d, i) => {
      matriz.makeScale(d.radio, d.alto, d.radio);
      // Media esfera hundida: solo asoma la cúpula, como loma suave.
      matriz.setPosition(d.x, -d.alto * 0.35, d.z);
      lomas.setMatrixAt(i, matriz);
    });
    lomas.instanceMatrix.needsUpdate = true;
  };
  actualizarInstancias();

  return {
    malla: lomas,
    actualizar(dt, velocidad) {
      for (const d of datos) {
        d.z += velocidad * MUNDO.LOMAS_FACTOR_VELOCIDAD * dt;
        // Al pasar la cámara, vuelve al fondo del ciclo.
        if (d.z > 30) d.z -= MUNDO.LOMAS_LARGO_CICLO;
      }
      actualizarInstancias();
    },
  };
}

// ---------------------------------------------------------------------------
// Suelo: dos mallas. El campo (verde, con surcos sutiles) y encima el
// sendero angosto de tierra. Cada uno scrollea con el offset de su textura.
// ---------------------------------------------------------------------------
function crearTexturaScroll(dibujar, repetirLargo) {
  const lienzo = document.createElement('canvas');
  lienzo.width = 128;
  lienzo.height = 256;
  dibujar(lienzo.getContext('2d'), lienzo.width, lienzo.height);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(1, repetirLargo);
  return textura;
}

function crearSuelo() {
  const tileLargo = 16; // unidades de mundo por repetición de textura

  // Campo verde con surcos horizontales sutiles
  const texturaCampo = crearTexturaScroll((ctx, w, h) => {
    ctx.fillStyle = hexCss(PALETA.CAMPO);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let y = 0; y < h; y += 32) ctx.fillRect(0, y, w, 9);
  }, MUNDO.SUELO_LARGO / tileLargo);

  const campo = new THREE.Mesh(
    new THREE.PlaneGeometry(MUNDO.SUELO_ANCHO, MUNDO.SUELO_LARGO),
    new THREE.MeshStandardMaterial({ map: texturaCampo, roughness: 1 }),
  );
  campo.rotation.x = -Math.PI / 2;
  campo.position.z = -MUNDO.SUELO_LARGO / 2 + 40;
  campo.receiveShadow = true;

  // Sendero de tierra: angosto, con bordes oscuros y piedritas deterministas
  const texturaSendero = crearTexturaScroll((ctx, w, h) => {
    ctx.fillStyle = hexCss(PALETA.TIERRA_OSCURA);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = hexCss(PALETA.TIERRA);
    ctx.fillRect(w * 0.08, 0, w * 0.84, h);
    ctx.fillStyle = 'rgba(0,0,0,0.09)';
    for (let i = 0; i < 18; i++) {
      const px = w * 0.1 + ((i * 733) % Math.floor(w * 0.8));
      const py = (i * 977) % h;
      ctx.fillRect(px, py, 6, 3);
    }
  }, MUNDO.SUELO_LARGO / tileLargo);

  const sendero = new THREE.Mesh(
    new THREE.PlaneGeometry(MUNDO.SENDERO_ANCHO, MUNDO.SUELO_LARGO),
    new THREE.MeshStandardMaterial({ map: texturaSendero, roughness: 1 }),
  );
  sendero.rotation.x = -Math.PI / 2;
  sendero.position.set(0, 0.01, -MUNDO.SUELO_LARGO / 2 + 40); // apenas sobre el campo
  sendero.receiveShadow = true;

  return {
    mallas: [campo, sendero],
    actualizar(dt, velocidad) {
      // El mundo avanza hacia el jugador: la textura corre hacia +v.
      const avance = (velocidad * dt) / tileLargo;
      texturaCampo.offset.y -= avance;
      texturaSendero.offset.y -= avance;
    },
  };
}

// ---------------------------------------------------------------------------
// Cañaverales: matas de caña de azúcar instanciadas (tres tallos + hojas,
// fusionados en una sola geometría). Dos bandas por lado que se turnan
// (leapfrog) al reciclarse.
// ---------------------------------------------------------------------------
function crearGeometriaMata() {
  const geometrias = [];

  // Tres tallos apenas abiertos en abanico
  const inclinaciones = [-0.14, 0.02, 0.16];
  for (let t = 0; t < 3; t++) {
    const tallo = new THREE.CylinderGeometry(0.045, 0.06, 1, 5);
    tallo.translate(0, 0.5, 0);
    tallo.rotateZ(inclinaciones[t]);
    tallo.translate((t - 1) * 0.12, 0, (t % 2) * 0.08);
    geometrias.push(tallo);

    // Hojas largas y caídas que salen de lo alto de cada tallo
    for (let i = 0; i < 4; i++) {
      const hoja = new THREE.PlaneGeometry(0.22, 1.1);
      hoja.translate(0, 0.45, 0);
      hoja.rotateX(-1.15 - (i % 2) * 0.5);
      hoja.rotateY((Math.PI * 2 * i) / 4 + t * 0.8);
      hoja.translate((t - 1) * 0.12, 1.0, (t % 2) * 0.08);
      geometrias.push(hoja);
    }
  }

  // Fusión manual: concatenar posiciones y normales de geometrías no indexadas.
  const noIndexadas = geometrias.map((g) => g.toNonIndexed());
  let totalVertices = 0;
  for (const g of noIndexadas) totalVertices += g.attributes.position.count;

  const posicion = new Float32Array(totalVertices * 3);
  const normal = new Float32Array(totalVertices * 3);
  let offset = 0;
  for (const g of noIndexadas) {
    posicion.set(g.attributes.position.array, offset * 3);
    normal.set(g.attributes.normal.array, offset * 3);
    offset += g.attributes.position.count;
  }

  const fusionada = new THREE.BufferGeometry();
  fusionada.setAttribute('position', new THREE.BufferAttribute(posicion, 3));
  fusionada.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  return fusionada;
}

function crearBandaCanas(geometria, material, zInicial) {
  const banda = new THREE.InstancedMesh(geometria, material, MUNDO.CANA_POR_BANDA);
  banda.castShadow = true;
  const matriz = new THREE.Matrix4();
  const rotacion = new THREE.Euler();
  const escalaV = new THREE.Vector3();

  for (let i = 0; i < MUNDO.CANA_POR_BANDA; i++) {
    // Pseudoaleatorio determinista por índice
    const r1 = ((i * 4271) % 1000) / 1000;
    const r2 = ((i * 7127) % 1000) / 1000;
    const r3 = ((i * 9973) % 1000) / 1000;
    const lado = i % 2 === 0 ? -1 : 1;
    // Más densidad cerca del sendero, con cola hacia afuera
    const x = lado * (MUNDO.CANA_DISTANCIA_X + r1 * r1 * MUNDO.CANA_ANCHO_BANDA_X);
    const z = -r2 * MUNDO.CANA_LARGO_BANDA;
    const escala = MUNDO.CANA_ALTURA * (0.75 + r3 * 0.5);
    rotacion.set(0, r1 * Math.PI * 2, (r2 - 0.5) * 0.1);
    matriz.makeRotationFromEuler(rotacion);
    escalaV.set(0.9 + r3 * 0.4, escala, 0.9 + r1 * 0.4);
    matriz.scale(escalaV);
    matriz.setPosition(x, 0, z);
    banda.setMatrixAt(i, matriz);
  }
  banda.position.z = zInicial;
  return banda;
}

function crearCanaverales() {
  const geometria = crearGeometriaMata();
  const material = new THREE.MeshStandardMaterial({
    color: PALETA.CANA_HOJA,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const bandaA = crearBandaCanas(geometria, material, 0);
  const bandaB = crearBandaCanas(geometria, material, -MUNDO.CANA_LARGO_BANDA);

  return {
    bandas: [bandaA, bandaB],
    actualizar(dt, velocidad) {
      for (const banda of [bandaA, bandaB]) {
        banda.position.z += velocidad * dt;
        // Cuando la banda entera quedó atrás de la cámara, salta al fondo.
        if (banda.position.z > MUNDO.CANA_LARGO_BANDA + 20) {
          banda.position.z -= MUNDO.CANA_LARGO_BANDA * 2;
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Nubes: esferas achatadas color crema, deriva lateral lenta.
// ---------------------------------------------------------------------------
function crearNubes() {
  const geometria = new THREE.SphereGeometry(1, 10, 6);
  const material = new THREE.MeshBasicMaterial({ color: PALETA.NUBE, fog: false, toneMapped: false });
  const nubes = new THREE.InstancedMesh(geometria, material, MUNDO.NUBES_CANTIDAD);

  const datos = [];
  for (let i = 0; i < MUNDO.NUBES_CANTIDAD; i++) {
    const r = ((i * 6151) % 1000) / 1000;
    datos.push({
      x: -260 + i * (520 / MUNDO.NUBES_CANTIDAD) + r * 40,
      y: 100 + r * 70,
      z: -390 - r * 40,
      ancho: 18 + r * 22,
      alto: 4 + r * 3,
    });
  }

  const matriz = new THREE.Matrix4();
  const actualizarInstancias = () => {
    datos.forEach((d, i) => {
      matriz.makeScale(d.ancho, d.alto, d.alto * 2);
      matriz.setPosition(d.x, d.y, d.z);
      nubes.setMatrixAt(i, matriz);
    });
    nubes.instanceMatrix.needsUpdate = true;
  };
  actualizarInstancias();

  return {
    malla: nubes,
    actualizar(dt) {
      for (const d of datos) {
        d.x += MUNDO.NUBES_DERIVA * dt;
        if (d.x > 280) d.x = -280;
      }
      actualizarInstancias();
    },
  };
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
export function crearMundo(escena) {
  escena.fog = new THREE.FogExp2(PALETA.NIEBLA, MUNDO.NIEBLA_DENSIDAD);

  const suelo = crearSuelo();
  const canaverales = crearCanaverales();
  const lomas = crearLomas();
  const nubes = crearNubes();

  escena.add(
    crearCielo(),
    crearSol(),
    crearCerros(),
    ...suelo.mallas,
    lomas.malla,
    nubes.malla,
    ...canaverales.bandas,
  );

  return {
    actualizar(dt, velocidad = MUNDO.VELOCIDAD) {
      suelo.actualizar(dt, velocidad);
      canaverales.actualizar(dt, velocidad);
      lomas.actualizar(dt, velocidad);
      nubes.actualizar(dt);
    },
  };
}
