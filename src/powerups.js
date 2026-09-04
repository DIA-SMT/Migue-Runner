// powerups.js — los dos premios que se juntan en la pista.
//
//   PATINETA  → escudo + puntos dobles. Al chocar o errar una pregunta se
//               pierde la patineta en lugar de una vida.
//   EMPANADA  → inmunidad total por unos segundos.
//
// Aparecen cada bastante (decenas de segundos), nunca encima de un
// obstáculo y nunca sobre un portal de trivia. Los dos flotan a una altura
// que se alcanza corriendo: son premios, no desafíos de precisión.
//
// Se distinguen a propósito del puesto de empanadas, que es un obstáculo:
// éstos flotan, giran y brillan con el bloom; el puesto está en el piso, es
// de madera y no se mueve.

import * as THREE from 'three';
import { PALETA, POWERUPS } from './config.js';
import { fusionarPiezas, caja } from './geometria.js';

// --- Geometría de la patineta: tabla, ejes y cuatro ruedas ---
// Se usa tanto para el objeto que flota en la pista como para la que
// aparece bajo los pies del personaje.
export function piezasPatineta() {
  const LARGO = 0.86;
  const ANCHO = 0.3;
  const piezas = [
    // Tabla, con las puntas apenas levantadas
    caja(ANCHO, 0.05, LARGO * 0.74, 0, 0.1, 0, PALETA.PATINETA_TABLA),
    caja(ANCHO * 0.92, 0.05, LARGO * 0.16, 0, 0.125, -LARGO * 0.44, PALETA.PATINETA_TABLA),
    caja(ANCHO * 0.92, 0.05, LARGO * 0.16, 0, 0.125, LARGO * 0.44, PALETA.PATINETA_TABLA),
    // Lija más oscura arriba
    caja(ANCHO * 0.88, 0.012, LARGO * 0.7, 0, 0.128, 0, PALETA.PATINETA_LIJA),
    // Ejes
    caja(ANCHO * 1.05, 0.035, 0.05, 0, 0.062, -LARGO * 0.28, PALETA.HIERRO),
    caja(ANCHO * 1.05, 0.035, 0.05, 0, 0.062, LARGO * 0.28, PALETA.HIERRO),
  ];
  // Ruedas
  for (const x of [-ANCHO / 2, ANCHO / 2]) {
    for (const z of [-LARGO * 0.28, LARGO * 0.28]) {
      const rueda = new THREE.CylinderGeometry(0.055, 0.055, 0.05, 8);
      rueda.rotateZ(Math.PI / 2);
      rueda.translate(x, 0.055, z);
      piezas.push({ geometria: rueda, color: PALETA.PATINETA_RUEDA });
    }
  }
  return piezas;
}

// --- Geometría de la empanada: elipsoide con el repulgue en el borde ---
export function piezasEmpanada() {
  const piezas = [];
  const cuerpo = new THREE.SphereGeometry(0.26, 12, 9);
  cuerpo.scale(1, 0.66, 0.8);
  piezas.push({ geometria: cuerpo, color: PALETA.EMPANADA });

  // El repulgue va por el borde CURVO, en el plano de la silueta. Sin
  // rotarlo: un TorusGeometry nace en el plano XY, que es justo el que se
  // ve de frente. Se le aplica la misma escala que al cuerpo para que siga
  // el contorno del elipsoide en vez de cruzarlo por el medio.
  const repulgue = new THREE.TorusGeometry(0.265, 0.038, 6, 18, Math.PI);
  repulgue.scale(1, 0.66, 0.8);
  repulgue.rotateZ(-0.12); // apenas ladeado, para que no se vea simétrico
  piezas.push({ geometria: repulgue, color: PALETA.EMPANADA_TOSTADA });
  return piezas;
}

export function crearPowerups(escena, { zonaOcupada = () => false } = {}) {
  // Los dos brillan: color fuera de rango para que florezcan con el bloom y
  // se lean como premio desde lejos.
  const materialPatineta = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    emissive: new THREE.Color(PALETA.PATINETA_TABLA).multiplyScalar(0.35),
  });
  const materialEmpanada = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    emissive: new THREE.Color(PALETA.EMPANADA).multiplyScalar(0.45),
  });

  const definiciones = {
    patineta: {
      geometria: fusionarPiezas(piezasPatineta()),
      material: materialPatineta,
      altura: POWERUPS.PATINETA.ALTURA,
      config: POWERUPS.PATINETA,
    },
    empanada: {
      geometria: fusionarPiezas(piezasEmpanada()),
      material: materialEmpanada,
      altura: POWERUPS.EMPANADA.ALTURA,
      config: POWERUPS.EMPANADA,
    },
  };

  // Pool por tipo, con geometría compartida.
  const pool = [];
  const proximoEn = {};
  for (const [tipo, def] of Object.entries(definiciones)) {
    for (let i = 0; i < POWERUPS.POOL; i++) {
      const malla = new THREE.Mesh(def.geometria, def.material);
      malla.visible = false;
      malla.position.set(0, def.altura, POWERUPS.Z_SPAWN);
      malla.castShadow = true;
      escena.add(malla);
      pool.push({ tipo, malla, activo: false });
    }
    proximoEn[tipo] = intervaloDe(tipo);
  }

  function intervaloDe(tipo) {
    const c = definiciones[tipo].config;
    return c.INTERVALO_MIN_S + Math.random() * (c.INTERVALO_MAX_S - c.INTERVALO_MIN_S);
  }

  let giro = 0;

  function activar(tipo) {
    const libre = pool.find((p) => p.tipo === tipo && !p.activo);
    if (!libre) return false;
    libre.activo = true;
    libre.malla.visible = true;
    libre.malla.position.set(0, definiciones[tipo].altura, POWERUPS.Z_SPAWN);
    return true;
  }

  return {
    reiniciar() {
      for (const p of pool) {
        p.activo = false;
        p.malla.visible = false;
      }
      for (const tipo of Object.keys(definiciones)) {
        // Al arrancar no aparecen de inmediato: primero que el jugador
        // entienda el juego base.
        proximoEn[tipo] = intervaloDe(tipo) * 0.6;
      }
      giro = 0;
    },

    // Igual que los soles: se despeja lo que caería sobre un portal.
    despejarCerca(zCentro, margen) {
      for (const p of pool) {
        if (p.activo && Math.abs(p.malla.position.z - zCentro) < margen) {
          p.activo = false;
          p.malla.visible = false;
        }
      }
    },

    // Devuelve la lista de tipos juntados este cuadro (normalmente vacía).
    actualizar(dt, velocidad, jugador) {
      giro += dt * POWERUPS.GIRO;
      const juntados = [];
      const hb = jugador.hitbox();

      for (const p of pool) {
        if (!p.activo) continue;
        p.malla.position.z += velocidad * dt;
        p.malla.rotation.y = giro;
        // Flotan con un vaivén suave para que se distingan del decorado.
        p.malla.position.y =
          definiciones[p.tipo].altura + Math.sin(giro * 2 + p.malla.position.z) * 0.06;

        if (p.malla.position.z > POWERUPS.Z_FUERA) {
          p.activo = false;
          p.malla.visible = false;
          continue;
        }

        if (Math.abs(p.malla.position.z) < POWERUPS.RADIO_TOMA) {
          const y = p.malla.position.y;
          if (y - 0.3 < hb.yMax && y + 0.3 > hb.yMin) {
            p.activo = false;
            p.malla.visible = false;
            juntados.push(p.tipo);
          }
        }
      }

      // Spawns, uno por tipo con su propio reloj.
      for (const tipo of Object.keys(definiciones)) {
        proximoEn[tipo] -= dt;
        if (proximoEn[tipo] > 0) continue;
        // No aparecer encima de un obstáculo: sería un premio inalcanzable.
        if (zonaOcupada(POWERUPS.Z_SPAWN, 6)) {
          proximoEn[tipo] = 0.5; // reintento corto
          continue;
        }
        activar(tipo);
        proximoEn[tipo] = intervaloDe(tipo);
      }

      return juntados;
    },
  };
}
