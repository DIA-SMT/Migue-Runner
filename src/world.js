// world.js — el centro de San Miguel de Tucumán: peatonal de baldosas,
// casas coloniales de colores pasteles, la Casa Histórica, la Catedral,
// lapachos en flor y faroles, con los cerros del Aconquija de fondo.
//
// Dirección de arte: colores planos estilizados. Cada banda de edificios es
// UNA malla fusionada con color por vértice (ver geometria.js): draw calls
// contados con los dedos. Los fondos llevan fog:false y colores pre-atenuados
// porque están "más allá" de la niebla.

import * as THREE from 'three';
import { PALETA, MUNDO } from './config.js';
import { fusionarPiezas, caja } from './geometria.js';

const color = (hex) => new THREE.Color(hex);
const hexCss = (hex) => '#' + color(hex).getHexString();

// Generador pseudoaleatorio determinista: el decorado es estable entre partidas.
function crearRnd(semilla) {
  let s = semilla % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ---------------------------------------------------------------------------
// Cielo, sol, cerros, nubes (fondo compartido con la versión rural)
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
  const lejos = [0.35, 0.7, 0.5, 0.95, 0.6, 1.0, 0.55, 0.8, 0.4, 0.75, 0.5, 0.3];
  const cerca = [0.5, 0.3, 0.75, 0.45, 0.85, 0.4, 0.65, 0.9, 0.5, 0.7, 0.35, 0.55];
  const capaLejos = crearCapaCerros(lejos, PALETA.CERRO_LEJOS, 85, 0, -440);
  const capaCerca = crearCapaCerros(cerca, PALETA.CERRO_MEDIO, 55, 0, -400);
  capaCerca.position.x = 40;
  grupo.add(capaLejos, capaCerca);
  return grupo;
}

function crearLomas() {
  const geometria = new THREE.SphereGeometry(1, 14, 9);
  const material = new THREE.MeshStandardMaterial({ color: PALETA.CERRO_CERCA, roughness: 1 });
  const lomas = new THREE.InstancedMesh(geometria, material, MUNDO.LOMAS_CANTIDAD);

  const datos = [];
  for (let i = 0; i < MUNDO.LOMAS_CANTIDAD; i++) {
    const frac = i / MUNDO.LOMAS_CANTIDAD;
    const lado = i % 2 === 0 ? -1 : 1;
    const ruido = ((i * 7919) % 100) / 100;
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
        if (d.z > 30) d.z -= MUNDO.LOMAS_LARGO_CICLO;
      }
      actualizarInstancias();
    },
  };
}

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
// Suelo: base urbana neutra + peatonal de baldosas con guarda roja central.
// ---------------------------------------------------------------------------
function crearSuelo() {
  const tileLargo = 12; // unidades de mundo por repetición de textura

  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(MUNDO.SUELO_ANCHO, MUNDO.SUELO_LARGO),
    new THREE.MeshStandardMaterial({ color: PALETA.BASE_URBANA, roughness: 1 }),
  );
  base.rotation.x = -Math.PI / 2;
  base.position.z = -MUNDO.SUELO_LARGO / 2 + 40;
  base.receiveShadow = true;

  // Baldosas de la peatonal
  const lienzo = document.createElement('canvas');
  lienzo.width = 256;
  lienzo.height = 256;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = hexCss(PALETA.BALDOSA);
  ctx.fillRect(0, 0, 256, 256);
  // Guarda roja central (dos baldosas de ancho)
  ctx.fillStyle = hexCss(PALETA.BALDOSA_GUARDA);
  ctx.fillRect(108, 0, 40, 256);
  // Juntas entre baldosas
  ctx.strokeStyle = hexCss(PALETA.BALDOSA_LINEA);
  ctx.lineWidth = 3;
  for (let x = 0; x <= 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(1, MUNDO.SUELO_LARGO / tileLargo);

  const peatonal = new THREE.Mesh(
    new THREE.PlaneGeometry(MUNDO.PEATONAL_ANCHO, MUNDO.SUELO_LARGO),
    new THREE.MeshStandardMaterial({ map: textura, roughness: 1 }),
  );
  peatonal.rotation.x = -Math.PI / 2;
  peatonal.position.set(0, 0.01, -MUNDO.SUELO_LARGO / 2 + 40);
  peatonal.receiveShadow = true;

  return {
    mallas: [base, peatonal],
    actualizar(dt, velocidad) {
      textura.offset.y -= (velocidad * dt) / tileLargo;
    },
  };
}

// ---------------------------------------------------------------------------
// Hitos: Casa Histórica y Catedral, como listas de piezas para fusionar.
// `lado` es -1 (izquierda) o 1 (derecha); `z` es el centro del frente.
// ---------------------------------------------------------------------------
const F = () => MUNDO.EDIFICIO_FRENTE_X;

function piezasCasaHistorica(lado, z) {
  const x = (d) => lado * (F() + d); // d: distancia desde la línea de fachada
  const piezas = [
    // Cuerpo blanco colonial, bajo y ancho
    caja(6, 3.4, 14, x(3), 1.7, z, PALETA.BLANCO_COLONIAL),
    // Techo de tejas a dos niveles
    caja(6.6, 0.4, 14.6, x(3), 3.6, z, PALETA.TEJA),
    caja(5.4, 0.3, 13.4, x(3), 3.95, z, PALETA.TEJA),
    // Portal de piedra con remate curvo estilizado
    caja(0.5, 2.9, 2.6, x(-0.15), 1.45, z, PALETA.PIEDRA_PORTAL),
    caja(0.5, 0.55, 3.3, x(-0.12), 3.1, z, PALETA.PIEDRA_PORTAL),
    caja(0.5, 0.35, 1.6, x(-0.1), 3.55, z, PALETA.PIEDRA_PORTAL),
    // Puerta verde de dos hojas
    caja(0.25, 2.3, 1.5, x(-0.35), 1.15, z, PALETA.VERDE_COLONIAL),
  ];
  // Ventanas verdes con reja a los lados del portal
  for (const dz of [-5.3, -3.2, 3.2, 5.3]) {
    piezas.push(caja(0.18, 1.8, 1.2, x(-0.08), 1.6, z + dz, PALETA.VERDE_COLONIAL));
  }
  return piezas;
}

function piezasCatedral(lado, z) {
  const x = (d) => lado * (F() + d);
  const piezas = [
    // Cuerpo principal
    caja(9, 6.2, 16, x(4.5), 3.1, z, PALETA.CREMA_CATEDRAL),
    // Frontis adelantado
    caja(0.7, 5.6, 9, x(-0.1), 2.8, z, PALETA.CREMA_CATEDRAL),
    // Frontón escalonado (triángulo estilizado)
    caja(0.8, 0.55, 8.2, x(-0.1), 5.9, z, PALETA.CREMA_CATEDRAL),
    caja(0.8, 0.5, 5.6, x(-0.1), 6.4, z, PALETA.CREMA_CATEDRAL),
    caja(0.8, 0.45, 3.0, x(-0.1), 6.85, z, PALETA.CREMA_CATEDRAL),
    // Puerta principal
    caja(0.4, 2.7, 1.9, x(-0.35), 1.35, z, PALETA.PUERTA),
  ];
  // Columnas del frente
  for (const dz of [-3.1, -1.1, 1.1, 3.1]) {
    piezas.push(caja(0.4, 3.6, 0.4, x(-0.5), 1.8, z + dz, PALETA.CORNISA));
  }
  // Torres campanario con cúpula y cruz
  for (const dz of [-6.4, 6.4]) {
    piezas.push(caja(2.7, 8.6, 2.7, x(1.5), 4.3, z + dz, PALETA.CREMA_CATEDRAL));
    piezas.push(caja(3.0, 0.3, 3.0, x(1.5), 8.6, z + dz, PALETA.CORNISA));
    const cupula = new THREE.SphereGeometry(1.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    cupula.translate(x(1.5), 8.75, z + dz);
    piezas.push({ geometria: cupula, color: PALETA.CUPULA });
    piezas.push(caja(0.12, 1.0, 0.12, x(1.5), 10.4, z + dz, PALETA.DORADO));
    piezas.push(caja(0.55, 0.12, 0.12, x(1.5), 10.5, z + dz, PALETA.DORADO));
  }
  // Cúpula central sobre el cuerpo
  const cupulaCentral = new THREE.SphereGeometry(2.2, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2);
  cupulaCentral.translate(x(5.5), 6.2, z);
  piezas.push({ geometria: cupulaCentral, color: PALETA.CUPULA });
  return piezas;
}

// ---------------------------------------------------------------------------
// Casas coloniales genéricas: frente pastel, cornisa, puerta y ventanas.
// ---------------------------------------------------------------------------
function piezasCasa(lado, zCentro, anchoZ, alto, indicePastel) {
  const prof = 7;
  const x = (d) => lado * (F() + d);
  const pastel = PALETA.PASTELES[indicePastel % PALETA.PASTELES.length];
  const piezas = [
    caja(prof, alto, anchoZ, x(prof / 2), alto / 2, zCentro, pastel),
    caja(prof + 0.25, 0.24, anchoZ + 0.25, x(prof / 2), alto + 0.12, zCentro, PALETA.CORNISA),
    // Puerta en planta baja
    caja(0.12, 1.7, 0.95, x(-0.02), 0.85, zCentro, PALETA.PUERTA),
  ];
  // Ventanas: planta baja a los lados de la puerta, pisos altos en grilla
  const pisos = Math.max(1, Math.floor((alto - 1.1) / 1.4));
  const columnas = Math.max(1, Math.floor(anchoZ / 1.9));
  for (let p = 0; p < pisos; p++) {
    const y = p === 0 ? 1.15 : 0.95 + p * 1.4;
    for (let c = 0; c < columnas; c++) {
      const dz = (c - (columnas - 1) / 2) * 1.9;
      // En planta baja, no pisar la puerta
      if (p === 0 && Math.abs(dz) < 1.0) continue;
      piezas.push(caja(0.12, 0.95, 0.62, x(-0.02), y, zCentro + dz, PALETA.VENTANA));
    }
  }
  return piezas;
}

// Farol colonial y lapacho en flor (mobiliario de la peatonal)
function piezasFarol(x, z) {
  const poste = new THREE.CylinderGeometry(0.05, 0.08, 2.7, 6);
  poste.translate(x, 1.35, z);
  return [
    { geometria: poste, color: PALETA.FAROL_POSTE },
    caja(0.28, 0.36, 0.28, x, 2.85, z, PALETA.FAROL_LUZ),
    caja(0.38, 0.09, 0.38, x, 3.08, z, PALETA.FAROL_POSTE),
  ];
}

function piezasLapacho(x, z, escala) {
  const tronco = new THREE.CylinderGeometry(0.1, 0.16, 1.6 * escala, 6);
  tronco.translate(x, 0.8 * escala, z);
  const copa = new THREE.SphereGeometry(1, 10, 7);
  copa.scale(1.7 * escala, 1.35 * escala, 1.7 * escala);
  copa.translate(x, 2.5 * escala, z);
  const copita = new THREE.SphereGeometry(1, 8, 6);
  copita.scale(1.1 * escala, 0.9 * escala, 1.1 * escala);
  copita.translate(x + 0.8 * escala, 3.1 * escala, z + 0.4 * escala);
  return [
    { geometria: tronco, color: PALETA.LAPACHO_TRONCO },
    { geometria: copa, color: PALETA.LAPACHO_FLOR },
    { geometria: copita, color: PALETA.LAPACHO_FLOR },
  ];
}

// ---------------------------------------------------------------------------
// Bandas urbanas: cada banda cubre BANDA_LARGO en Z con casas en ambas
// veredas + faroles + lapachos, y opcionalmente un hito. Todo fusionado.
// ---------------------------------------------------------------------------
function construirBanda(indice, material) {
  const rnd = crearRnd(4241 + indice * 733);
  const piezas = [];
  const L = MUNDO.BANDA_LARGO;

  // Hito de esta banda: Casa Histórica (banda 0, izquierda) o Catedral
  // (banda 1, derecha). Reservamos el hueco para que no lo pisen las casas.
  const hito =
    indice === 0
      ? { lado: -1, z: -L * 0.45, mitad: 8.5, piezas: piezasCasaHistorica(-1, -L * 0.45) }
      : { lado: 1, z: -L * 0.5, mitad: 9.5, piezas: piezasCatedral(1, -L * 0.5) };
  piezas.push(...hito.piezas);

  // Casas en ambas veredas
  for (const lado of [-1, 1]) {
    let z = -3;
    let n = 0;
    while (z > -L + 5) {
      const anchoZ = 4.5 + rnd() * 2.8;
      const zCentro = z - anchoZ / 2;
      const enHueco =
        lado === hito.lado && zCentro + anchoZ / 2 > hito.z - hito.mitad && zCentro - anchoZ / 2 < hito.z + hito.mitad;
      if (!enHueco) {
        const alto = 3 + rnd() * 3.6;
        piezas.push(...piezasCasa(lado, zCentro, anchoZ, alto, Math.floor(rnd() * 6) + n));
      }
      z -= anchoZ + 0.5 + rnd() * 1.2;
      n++;
    }
  }

  // Faroles alternados por vereda y lapachos entre medio
  for (let z = -8; z > -L; z -= MUNDO.FAROL_CADA) {
    piezas.push(...piezasFarol(-4.1, z));
    piezas.push(...piezasFarol(4.1, z - MUNDO.FAROL_CADA / 2));
  }
  for (let z = -16; z > -L; z -= MUNDO.LAPACHO_CADA) {
    const lado = ((z / MUNDO.LAPACHO_CADA) | 0) % 2 === 0 ? -1 : 1;
    piezas.push(...piezasLapacho(lado * 4.35, z, 0.72 + rnd() * 0.28));
  }

  const malla = new THREE.Mesh(fusionarPiezas(piezas), material);
  malla.castShadow = true;
  malla.receiveShadow = true;
  return malla;
}

function crearCiudad() {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const bandaA = construirBanda(0, material);
  const bandaB = construirBanda(1, material);
  bandaA.position.z = 0;
  bandaB.position.z = -MUNDO.BANDA_LARGO;

  return {
    bandas: [bandaA, bandaB],
    actualizar(dt, velocidad) {
      for (const banda of [bandaA, bandaB]) {
        banda.position.z += velocidad * dt;
        if (banda.position.z > MUNDO.BANDA_LARGO + 25) {
          banda.position.z -= MUNDO.BANDA_LARGO * 2;
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
export function crearMundo(escena) {
  escena.fog = new THREE.FogExp2(PALETA.NIEBLA, MUNDO.NIEBLA_DENSIDAD);

  const suelo = crearSuelo();
  const ciudad = crearCiudad();
  const lomas = crearLomas();
  const nubes = crearNubes();

  escena.add(
    crearCielo(),
    crearSol(),
    crearCerros(),
    ...suelo.mallas,
    lomas.malla,
    nubes.malla,
    ...ciudad.bandas,
  );

  return {
    actualizar(dt, velocidad) {
      suelo.actualizar(dt, velocidad);
      ciudad.actualizar(dt, velocidad);
      lomas.actualizar(dt, velocidad);
      nubes.actualizar(dt);
    },
  };
}
