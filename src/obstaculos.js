// obstaculos.js — catálogo, spawn, colisión AABB y reciclado.
//
// Todo obstáculo cae en una de dos clases, para que la lectura sea inmediata
// con dos botones:
//   BAJO  (se salta):    valla municipal, cajones de feria, puesto de
//                        empanadas, banco de plaza.
//   ALTO  (se agacha):   cartel colgante, guirnalda de banderines, toldo.
//
// Qué tipos aparecen y en qué combinaciones lo decide dificultad.js; acá
// sólo se construyen las mallas y se resuelve la física.
//
// La colisión es una AABB simple: el jugador está siempre en x=0, así que
// alcanza con comparar superposición en Z y en Y. Las medidas de colisión
// salen de OBSTACULOS.TIPOS, no de la geometría: la caja de choque es la
// fuente de verdad y la malla se dibuja para coincidir con ella.

import * as THREE from 'three';
import { PALETA, OBSTACULOS, JUGADOR } from './config.js';
import { fusionarPiezas, caja } from './geometria.js';

// ---------------------------------------------------------------------------
// Constructores de geometría, uno por tipo. Cada uno devuelve una lista de
// piezas para fusionar (o una función que arma un Group, para los que
// necesitan textura).
// ---------------------------------------------------------------------------

// BAJO — valla municipal a rayas naranja y blanco.
function piezasValla() {
  const { ANCHO, ALTO } = OBSTACULOS.TIPOS.valla;
  const piezas = [
    caja(0.1, ALTO, 0.1, -ANCHO / 2 + 0.1, ALTO / 2, 0, PALETA.CARTEL_POSTE),
    caja(0.1, ALTO, 0.1, ANCHO / 2 - 0.1, ALTO / 2, 0, PALETA.CARTEL_POSTE),
  ];
  const segmentos = 5;
  const anchoSeg = (ANCHO - 0.2) / segmentos;
  for (const y of [ALTO * 0.45, ALTO * 0.85]) {
    for (let s = 0; s < segmentos; s++) {
      const x = -ANCHO / 2 + 0.1 + anchoSeg * (s + 0.5);
      piezas.push(
        caja(anchoSeg, 0.16, 0.06, x, y, 0, s % 2 === 0 ? PALETA.VALLA_NARANJA : PALETA.VALLA_BLANCO),
      );
    }
  }
  return piezas;
}

// BAJO — cajones de feria apilados, con fruta asomando.
function piezasCajones() {
  const { ANCHO, ALTO, PROFUNDO } = OBSTACULOS.TIPOS.cajones;
  const piezas = [];
  // Dos cajones abajo y uno encima, corridos para que no sea un bloque.
  const cajones = [
    { x: -ANCHO / 4, y: 0, alto: ALTO * 0.62 },
    { x: ANCHO / 4, y: 0, alto: ALTO * 0.62 },
    { x: 0, y: ALTO * 0.62, alto: ALTO * 0.38 },
  ];
  for (const c of cajones) {
    const ancho = ANCHO / 2 - 0.08;
    // Cuerpo del cajón y listones más claros al frente.
    piezas.push(caja(ancho, c.alto, PROFUNDO, c.x, c.y + c.alto / 2, 0, PALETA.MADERA));
    piezas.push(
      caja(ancho + 0.04, c.alto * 0.22, 0.06, c.x, c.y + c.alto * 0.75, PROFUNDO / 2, PALETA.MADERA_CLARA),
    );
    piezas.push(
      caja(ancho + 0.04, c.alto * 0.22, 0.06, c.x, c.y + c.alto * 0.25, PROFUNDO / 2, PALETA.MADERA_CLARA),
    );
  }
  // Fruta asomando del cajón de arriba, sin pasar la altura de colisión.
  for (let i = 0; i < 4; i++) {
    const fruta = new THREE.SphereGeometry(0.09, 6, 5);
    fruta.translate(-0.3 + i * 0.2, ALTO - 0.05, (i % 2) * 0.12 - 0.06);
    piezas.push({ geometria: fruta, color: i % 2 === 0 ? PALETA.FRUTA_A : PALETA.FRUTA_B });
  }
  return piezas;
}

// BAJO — puesto de empanadas: tabla con mantel, canasta y empanadas.
// Todo queda por debajo de la altura de colisión, así lo que se ve es lo
// que golpea.
function piezasEmpanadas() {
  const { ANCHO, ALTO, PROFUNDO } = OBSTACULOS.TIPOS.empanadas;
  const alturaMesa = ALTO * 0.62;
  const piezas = [
    // Patas
    caja(0.09, alturaMesa, 0.09, -ANCHO / 2 + 0.14, alturaMesa / 2, -PROFUNDO / 2 + 0.1, PALETA.MADERA),
    caja(0.09, alturaMesa, 0.09, ANCHO / 2 - 0.14, alturaMesa / 2, -PROFUNDO / 2 + 0.1, PALETA.MADERA),
    caja(0.09, alturaMesa, 0.09, -ANCHO / 2 + 0.14, alturaMesa / 2, PROFUNDO / 2 - 0.1, PALETA.MADERA),
    caja(0.09, alturaMesa, 0.09, ANCHO / 2 - 0.14, alturaMesa / 2, PROFUNDO / 2 - 0.1, PALETA.MADERA),
    // Tabla
    caja(ANCHO, 0.07, PROFUNDO, 0, alturaMesa, 0, PALETA.MADERA_CLARA),
    // Mantel colgando al frente
    caja(ANCHO + 0.04, alturaMesa * 0.55, 0.05, 0, alturaMesa * 0.72, PROFUNDO / 2, PALETA.MANTEL),
  ];

  // Canasta al medio
  const canasta = new THREE.CylinderGeometry(0.34, 0.28, ALTO - alturaMesa - 0.09, 10, 1, true);
  canasta.translate(0, alturaMesa + (ALTO - alturaMesa - 0.09) / 2 + 0.04, 0);
  piezas.push({ geometria: canasta, color: PALETA.CANASTA });

  // Empanadas: elipsoides achatados con un reborde más tostado. Se apoyan
  // en la canasta y en la tabla, sin pasar ALTO.
  const posiciones = [
    { x: 0, z: 0, y: ALTO - 0.07 },
    { x: -0.18, z: 0.1, y: ALTO - 0.1 },
    { x: 0.18, z: -0.08, y: ALTO - 0.1 },
    { x: -ANCHO / 2 + 0.4, z: 0.05, y: alturaMesa + 0.09 },
    { x: ANCHO / 2 - 0.4, z: -0.05, y: alturaMesa + 0.09 },
    { x: ANCHO / 2 - 0.72, z: 0.12, y: alturaMesa + 0.09 },
  ];
  for (const [i, p] of posiciones.entries()) {
    const cuerpo = new THREE.SphereGeometry(0.14, 8, 6);
    cuerpo.scale(1, 0.62, 0.78);
    cuerpo.rotateY(i * 0.7);
    cuerpo.translate(p.x, p.y, p.z);
    piezas.push({ geometria: cuerpo, color: PALETA.EMPANADA });
    // Repulgue por el borde curvo. Un TorusGeometry nace en el plano XY,
    // que es el que se ve de frente: no hay que rotarlo hacia el costado o
    // queda cruzando la empanada por el medio.
    const repulgue = new THREE.TorusGeometry(0.14, 0.022, 4, 10, Math.PI);
    repulgue.scale(1, 0.62, 0.78); // sigue la forma del cuerpo
    repulgue.rotateZ(-0.12);
    repulgue.translate(p.x, p.y + 0.01, p.z);
    piezas.push({ geometria: repulgue, color: PALETA.EMPANADA_TOSTADA });
  }
  return piezas;
}

// BAJO — banco de plaza: tablones de madera y patas de hierro.
function piezasBanco() {
  const { ANCHO, ALTO, PROFUNDO } = OBSTACULOS.TIPOS.banco;
  const piezas = [
    // Patas de hierro
    caja(0.12, ALTO * 0.62, PROFUNDO * 0.8, -ANCHO / 2 + 0.18, (ALTO * 0.62) / 2, 0, PALETA.HIERRO),
    caja(0.12, ALTO * 0.62, PROFUNDO * 0.8, ANCHO / 2 - 0.18, (ALTO * 0.62) / 2, 0, PALETA.HIERRO),
  ];
  // Asiento: tres tablones
  for (let i = 0; i < 3; i++) {
    piezas.push(
      caja(ANCHO, 0.07, PROFUNDO / 3.4, 0, ALTO * 0.62, (i - 1) * (PROFUNDO / 3), PALETA.MADERA_CLARA),
    );
  }
  // Respaldo: dos tablones inclinados hacia atrás
  for (let i = 0; i < 2; i++) {
    const tabla = new THREE.BoxGeometry(ANCHO, 0.07, PROFUNDO / 3.6);
    tabla.rotateX(-0.35);
    tabla.translate(0, ALTO * 0.72 + i * 0.14, -PROFUNDO / 2 + 0.04);
    piezas.push({ geometria: tabla, color: PALETA.MADERA });
  }
  // Soportes del respaldo
  for (const x of [-ANCHO / 2 + 0.18, ANCHO / 2 - 0.18]) {
    const soporte = new THREE.BoxGeometry(0.1, ALTO * 0.42, 0.09);
    soporte.rotateX(-0.35);
    soporte.translate(x, ALTO * 0.78, -PROFUNDO / 2 + 0.05);
    piezas.push({ geometria: soporte, color: PALETA.HIERRO });
  }
  return piezas;
}

// ALTO — guirnalda de banderines patrios entre dos postes.
function piezasBanderines() {
  const { ANCHO, ALTO_LIBRE, PANEL_ALTO } = OBSTACULOS.TIPOS.banderines;
  const tope = ALTO_LIBRE + PANEL_ALTO;
  const piezas = [
    caja(0.1, tope + 0.35, 0.1, -ANCHO / 2, (tope + 0.35) / 2, 0, PALETA.CARTEL_POSTE),
    caja(0.1, tope + 0.35, 0.1, ANCHO / 2, (tope + 0.35) / 2, 0, PALETA.CARTEL_POSTE),
    // Cuerda de la que cuelgan
    caja(ANCHO, 0.05, 0.05, 0, tope + 0.1, 0, PALETA.MADERA),
  ];
  // Banderines: conos de 3 lados apuntando abajo. Sólidos, así que se ven
  // bien de los dos lados sin necesidad de DoubleSide.
  const cantidad = 9;
  for (let i = 0; i < cantidad; i++) {
    const x = -ANCHO / 2 + 0.25 + (i * (ANCHO - 0.5)) / (cantidad - 1);
    const banderin = new THREE.ConeGeometry(0.2, PANEL_ALTO, 3);
    banderin.rotateX(Math.PI); // punta hacia abajo
    banderin.rotateY(Math.PI / 2);
    banderin.translate(x, tope + 0.08 - PANEL_ALTO / 2, 0);
    piezas.push({ geometria: banderin, color: i % 2 === 0 ? PALETA.BANDERIN_A : PALETA.BANDERIN_B });
  }
  return piezas;
}

// ALTO — toldo de comercio a rayas, inclinado sobre la vereda.
function piezasToldo() {
  const { ANCHO, ALTO_LIBRE, PANEL_ALTO, PROFUNDO } = OBSTACULOS.TIPOS.toldo;
  const tope = ALTO_LIBRE + PANEL_ALTO;
  const piezas = [
    caja(0.12, tope + 0.3, 0.12, -ANCHO / 2, (tope + 0.3) / 2, 0, PALETA.HIERRO),
    caja(0.12, tope + 0.3, 0.12, ANCHO / 2, (tope + 0.3) / 2, 0, PALETA.HIERRO),
  ];
  // Lona: franjas verticales alternadas, inclinadas hacia el jugador.
  const franjas = 8;
  const anchoFranja = ANCHO / franjas;
  for (let i = 0; i < franjas; i++) {
    const lona = new THREE.BoxGeometry(anchoFranja, PANEL_ALTO * 1.05, 0.07);
    lona.rotateX(0.42); // caída del toldo
    lona.translate(-ANCHO / 2 + anchoFranja * (i + 0.5), ALTO_LIBRE + PANEL_ALTO / 2, PROFUNDO / 3);
    piezas.push({ geometria: lona, color: i % 2 === 0 ? PALETA.TOLDO_A : PALETA.TOLDO_B });
  }
  // Volante inferior del toldo, festoneado
  for (let i = 0; i < franjas; i++) {
    piezas.push(
      caja(
        anchoFranja * 0.9,
        0.12,
        0.06,
        -ANCHO / 2 + anchoFranja * (i + 0.5),
        ALTO_LIBRE + 0.06,
        PROFUNDO / 1.9,
        i % 2 === 0 ? PALETA.TOLDO_B : PALETA.TOLDO_A,
      ),
    );
  }
  return piezas;
}

// ALTO — cartel colgante entre postes. Es el único con textura, así que se
// arma como Group: estructura fusionada + panel con el nombre de la ciudad.
function crearTexturaCartel() {
  const lienzo = document.createElement('canvas');
  lienzo.width = 512;
  lienzo.height = 160;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#0F4C81';
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#C8A951';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.fillStyle = '#F7F9FB';
  ctx.font = '700 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SAN MIGUEL', 256, 80);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

function piezasCartel() {
  const { ANCHO, ALTO_LIBRE, PANEL_ALTO } = OBSTACULOS.TIPOS.cartel;
  const tope = ALTO_LIBRE + PANEL_ALTO;
  return [
    caja(0.12, tope + 0.5, 0.12, -ANCHO / 2, (tope + 0.5) / 2, 0, PALETA.CARTEL_POSTE),
    caja(0.12, tope + 0.5, 0.12, ANCHO / 2, (tope + 0.5) / 2, 0, PALETA.CARTEL_POSTE),
    caja(ANCHO + 0.3, 0.14, 0.14, 0, tope + 0.4, 0, PALETA.CARTEL_POSTE),
  ];
}

// Catálogo de geometría, público para que se pueda inspeccionar el arte de
// cada obstáculo por separado sin levantar una partida.
// COSTADO — naranjo de vereda volcado sobre la peatonal. Ocupa un solo lado
// de arriba abajo: no se salta ni se agacha, hay que correr el cuerpo.
//
// Se construye SIEMPRE apoyado sobre el lado derecho; activar() lo gira
// media vuelta cuando toca el izquierdo.
//
// El follaje va desde 1.1 y el cantero llega hasta 0.9 a propósito: la caja
// de colisión es un solo rectángulo de 0.25 a 2.6, así que si el medio
// quedara visualmente vacío se chocaría contra el aire. Así cada pose del
// jugador (parado, saltando, agachado) se topa con algo que se ve.
function piezasRama() {
  const { ANCHO, DESDE_X, ALTO_BASE, ALTO_TOPE } = OBSTACULOS.TIPOS.rama;
  const xInterno = DESDE_X; // borde que mira al lado libre
  const xExterno = DESDE_X + ANCHO; // borde de la vereda, donde va el tronco
  const centro = (xInterno + xExterno) / 2;
  const piezas = [];

  // Cantero de mampostería: tapa la franja baja y explica por qué hay un
  // árbol en el medio de la peatonal.
  piezas.push(caja(ANCHO, 0.55, 0.5, centro, ALTO_BASE + 0.27, 0, PALETA.CANTERO));
  piezas.push(caja(ANCHO + 0.08, 0.1, 0.56, centro, ALTO_BASE + 0.55, 0, PALETA.PIEDRA_PORTAL));
  // Tierra
  piezas.push(caja(ANCHO - 0.25, 0.08, 0.36, centro, ALTO_BASE + 0.58, 0, PALETA.NARANJO_TRONCO));

  // Tronco: sale del cantero y se vuelca hacia el lado libre.
  const tronco = new THREE.CylinderGeometry(0.16, 0.22, 1.5, 7);
  tronco.rotateZ(0.26); // volcado hacia la peatonal
  tronco.translate(xExterno - 0.35, ALTO_BASE + 1.3, 0);
  piezas.push({ geometria: tronco, color: PALETA.NARANJO_TRONCO });

  // Rama gruesa que cruza hacia adentro, que es lo que hay que esquivar.
  const rama = new THREE.CylinderGeometry(0.09, 0.14, ANCHO * 0.85, 6);
  rama.rotateZ(Math.PI / 2 - 0.22);
  rama.translate(centro - 0.15, 1.75, 0);
  piezas.push({ geometria: rama, color: PALETA.NARANJO_TRONCO });

  // Copa: masas de hojas facetadas. Se reparten cubriendo todo el ancho,
  // con la más baja colgando sobre el borde interno.
  const masas = [
    { x: xExterno - 0.45, y: 2.15, r: 0.62 },
    { x: centro, y: 2.0, r: 0.58 },
    { x: xInterno + 0.45, y: 1.72, r: 0.52 },
    { x: xInterno + 0.2, y: 1.28, r: 0.36 },
    { x: xExterno - 0.2, y: 1.45, r: 0.42 },
  ];
  masas.forEach((m, i) => {
    const hoja = new THREE.IcosahedronGeometry(m.r, 0);
    hoja.scale(1, 0.82, 0.7);
    hoja.translate(m.x, m.y, 0);
    piezas.push({
      geometria: hoja,
      color: i % 2 === 0 ? PALETA.NARANJO_HOJA : PALETA.NARANJO_HOJA_CLARA,
    });
  });

  // Naranjas: son lo que hace reconocible al árbol de un vistazo, así que
  // van sobre el borde de las masas, no adentro.
  const frutas = [
    [xInterno + 0.34, 1.5],
    [centro - 0.3, 1.66],
    [centro + 0.35, 2.45],
    [xExterno - 0.5, 1.72],
    [xExterno - 0.25, 2.5],
    [xInterno + 0.55, 2.02],
  ];
  for (const [x, y] of frutas) {
    const naranja = new THREE.IcosahedronGeometry(0.11, 0);
    naranja.translate(x, y, 0.16);
    piezas.push({ geometria: naranja, color: PALETA.NARANJA_FRUTA });
  }

  // Remate alto, para que la copa llegue hasta ALTO_TOPE y nadie crea que
  // se puede pasar por arriba saltando.
  const copa = new THREE.IcosahedronGeometry(0.5, 0);
  copa.scale(1.5, 0.7, 0.7);
  copa.translate(centro + 0.1, ALTO_TOPE - 0.35, 0);
  piezas.push({ geometria: copa, color: PALETA.NARANJO_HOJA });

  return piezas;
}

export const PIEZAS_POR_TIPO = {
  valla: piezasValla,
  cajones: piezasCajones,
  empanadas: piezasEmpanadas,
  banco: piezasBanco,
  cartel: piezasCartel,
  banderines: piezasBanderines,
  toldo: piezasToldo,
  rama: piezasRama,
};

// ---------------------------------------------------------------------------
// Caja de colisión de cada tipo, derivada de config (no de la geometría).
// ---------------------------------------------------------------------------
function cajaColision(tipo) {
  const t = OBSTACULOS.TIPOS[tipo];
  if (t.clase === 'bajo') {
    return { yMin: 0, yMax: t.ALTO, profundo: t.PROFUNDO, zFuera: OBSTACULOS.Z_FUERA_BAJO };
  }
  if (t.clase === 'costado') {
    // Se describe SIEMPRE apoyada sobre el lado derecho. El lado real lo
    // decide activar(), que espeja la caja y la malla de una sola vez: así
    // el catálogo tiene un solo juego de números y no dos que se pueden
    // desincronizar.
    return {
      zFuera: OBSTACULOS.Z_FUERA_ALTO,
      yMin: t.ALTO_BASE,
      yMax: t.ALTO_TOPE,
      xMin: t.DESDE_X,
      xMax: t.DESDE_X + t.ANCHO,
      profundo: t.PROFUNDO,
    };
  }
  return {
    zFuera: OBSTACULOS.Z_FUERA_ALTO,
    // Por arriba se deja de más: el panel y su estructura tapan hasta bien
    // alto, y nadie puede pasar por encima de todos modos.
    yMin: t.ALTO_LIBRE,
    yMax: t.ALTO_LIBRE + t.PANEL_ALTO + 0.5,
    profundo: t.PROFUNDO,
  };
}

export function crearObstaculos(escena, dificultad) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });

  // Geometría compartida por tipo: 12 instancias de valla cuestan 12 Mesh y
  // una sola geometría. Las inactivas quedan invisibles y no se dibujan.
  const geometriaPorTipo = {};
  for (const tipo of Object.keys(OBSTACULOS.TIPOS)) {
    geometriaPorTipo[tipo] = fusionarPiezas(PIEZAS_POR_TIPO[tipo]());
  }
  const texturaCartel = crearTexturaCartel();
  const geometriaPanel = new THREE.PlaneGeometry(
    OBSTACULOS.TIPOS.cartel.ANCHO - 0.4,
    OBSTACULOS.TIPOS.cartel.PANEL_ALTO,
  );
  const materialPanel = new THREE.MeshBasicMaterial({
    map: texturaCartel,
    side: THREE.DoubleSide,
  });

  function construir(tipo) {
    const estructura = new THREE.Mesh(geometriaPorTipo[tipo], material);
    estructura.castShadow = true;
    if (tipo !== 'cartel') return estructura;

    // El cartel suma el panel con el nombre de la ciudad.
    const panel = new THREE.Mesh(geometriaPanel, materialPanel);
    panel.position.y = OBSTACULOS.TIPOS.cartel.ALTO_LIBRE + OBSTACULOS.TIPOS.cartel.PANEL_ALTO / 2;
    panel.castShadow = true;
    const grupo = new THREE.Group();
    grupo.add(estructura, panel);
    return grupo;
  }

  // Pool: POOL_POR_TIPO instancias de cada tipo.
  const pool = [];
  for (const tipo of Object.keys(OBSTACULOS.TIPOS)) {
    const colision = cajaColision(tipo);
    for (let i = 0; i < OBSTACULOS.POOL_POR_TIPO; i++) {
      const malla = construir(tipo);
      malla.visible = false;
      malla.position.z = OBSTACULOS.Z_SPAWN;
      escena.add(malla);
      pool.push({ tipo, colision, malla, activo: false, superado: false });
    }
  }

  let proximoEn = 2;
  let supresion = 0; // ventana sin spawns (alrededor de los portales)

  function activar(tipo, z) {
    const libre = pool.find((o) => o.tipo === tipo && !o.activo);
    if (!libre) return false; // pool del tipo agotado: se saltea
    libre.activo = true;
    libre.superado = false;
    libre.malla.visible = true;
    libre.malla.position.z = z;
    // Los de costado salen a izquierda o derecha, sorteado. La geometría
    // está hecha para el lado derecho y la caja de colisión se espeja con la
    // misma cuenta, así que no pueden quedar mirando a lados distintos.
    //
    // Se GIRA media vuelta en vez de escalar en -1: una escala negativa
    // invierte el sentido de las caras y el modelo se ve del revés, con la
    // luz por dentro. El giro espeja en X sin tocar las normales, y en Z da
    // igual porque la rama es casi plana.
    if (libre.colision.xMin !== undefined) {
      libre.lado = Math.random() < 0.5 ? -1 : 1;
      libre.malla.rotation.y = libre.lado === -1 ? Math.PI : 0;
    }
    return true;
  }

  // Bordes en X de un obstáculo de costado, ya espejados según su lado.
  function bordesX(o) {
    return o.lado === -1
      ? { xMin: -o.colision.xMax, xMax: -o.colision.xMin }
      : { xMin: o.colision.xMin, xMax: o.colision.xMax };
  }

  // Suelta el grupo que decidió dificultad.js. Si el pool no alcanza para
  // el grupo completo no se suelta nada: mejor una pausa que la mitad de un
  // combo, que sería una trampa (el jugador salta esperando el segundo
  // obstáculo y no está, o peor: aparece sólo el segundo).
  function spawnearGrupo(velocidad, zBase = OBSTACULOS.Z_SPAWN) {
    const grupo = dificultad.proximoGrupo(velocidad);
    if (grupo.length === 0) return false;

    // Cuántos hacen falta de cada tipo vs. cuántos hay libres.
    const pedidos = new Map();
    for (const o of grupo) pedidos.set(o.tipo, (pedidos.get(o.tipo) ?? 0) + 1);
    for (const [tipo, cuantos] of pedidos) {
      const libres = pool.filter((p) => p.tipo === tipo && !p.activo).length;
      if (libres < cuantos) return false;
    }

    for (const o of grupo) activar(o.tipo, zBase + o.zOffset);
    return true;
  }

  return {
    // prepoblar: al arrancar partida se siembran obstáculos a lo largo de la
    // pista para que el primero no tarde 20 segundos en llegar (el más
    // cercano queda igual lejos del mínimo de reacción). En la pantalla de
    // atracción se resetea sin sembrar: la calle queda limpia.
    reiniciar(prepoblar = false, velocidad = 8) {
      for (const o of pool) {
        o.activo = false;
        o.malla.visible = false;
        o.malla.position.z = OBSTACULOS.Z_SPAWN;
      }
      if (prepoblar) {
        for (const z of [-55, -95, -135]) spawnearGrupo(velocidad, z);
      }
      proximoEn = 2.5;
      supresion = 0;
    },

    // ¿Hay algún obstáculo activo cerca de esta z? Lo consultan los soles
    // para no aparecer encima de un cartel o una valla.
    hayCerca(zCentro, margen) {
      return pool.some((o) => o.activo && Math.abs(o.malla.position.z - zCentro) < margen);
    },

    // Bloquea spawns nuevos durante `segundos` (los activos siguen andando).
    suprimir(segundos) {
      supresion = Math.max(supresion, segundos);
    },

    // Retira los obstáculos de una clase que estén en vuelo. Se usa al salir
    // de VR: una rama ya soltada quedaría imposible de esquivar, porque en
    // pantalla plana no hay forma de correr el cuerpo.
    despejarClase(clase) {
      for (const o of pool) {
        if (o.activo && OBSTACULOS.TIPOS[o.tipo].clase === clase) {
          o.activo = false;
          o.malla.visible = false;
        }
      }
    },

    // Desactiva los obstáculos que cruzarían demasiado cerca del portal de
    // trivia (el salto/agachada del portal no puede competir con una valla).
    despejarCerca(zCentro, margen) {
      for (const o of pool) {
        if (o.activo && !o.superado && Math.abs(o.malla.position.z - zCentro) < margen) {
          o.activo = false;
          o.malla.visible = false;
        }
      }
    },

    // Devuelve eventos del cuadro: { colision, esquivados }
    actualizar(dt, velocidad, jugador) {
      let colision = false;
      let esquivados = 0;

      const hb = jugador.hitbox();
      for (const o of pool) {
        if (!o.activo) continue;
        o.malla.position.z += velocidad * dt;
        const z = o.malla.position.z;

        // ¿Quedó atrás? contarlo como esquivado y reciclar
        if (z > o.colision.zFuera) {
          o.activo = false;
          o.malla.visible = false;
          continue;
        }
        if (!o.superado && z > JUGADOR.HITBOX.PROFUNDO) {
          o.superado = true;
          esquivados++;
        }

        // Colisión AABB (el jugador está fijo en z=0; en x sólo se mueve en
        // VR, y sólo los obstáculos de costado miran esa coordenada).
        if (o.superado) continue;
        const solapaZ = Math.abs(z) < o.colision.profundo / 2 + hb.profundo / 2;
        if (!solapaZ) continue;

        if (hb.yMin >= o.colision.yMax || hb.yMax <= o.colision.yMin) continue;

        // Los que ocupan toda la vereda no tienen bordes en X: ya chocaron.
        if (o.colision.xMin !== undefined) {
          const b = bordesX(o);
          if (hb.xMin >= b.xMax || hb.xMax <= b.xMin) continue; // se corrió a tiempo
        }

        colision = true;
        o.superado = true; // un solo golpe por obstáculo
      }

      // Spawns
      supresion = Math.max(0, supresion - dt);
      proximoEn -= dt;
      if (proximoEn <= 0 && supresion <= 0) {
        spawnearGrupo(velocidad);
        // El intervalo lo fija el nivel; nunca por debajo de la distancia
        // mínima de reacción que pide el documento.
        proximoEn = Math.max(dificultad.proximoIntervalo(), OBSTACULOS.REACCION_MIN_S);
      }

      return { colision, esquivados };
    },
  };
}
