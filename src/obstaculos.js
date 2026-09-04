// obstaculos.js — spawn, movimiento, colisión AABB y reciclado de obstáculos.
//
// Dos tipos, uno por acción, para lectura inmediata:
//  - BAJO: valla municipal a rayas (se salta)
//  - ALTO: cartel colgante entre postes (se pasa agachado)
//
// La colisión es una AABB simple: el jugador está siempre en x=0, así que
// alcanza con comparar superposición en Z y en Y.

import * as THREE from 'three';
import { PALETA, OBSTACULOS, JUGADOR } from './config.js';
import { fusionarPiezas, caja } from './geometria.js';

function crearMallaValla(material) {
  const { ANCHO, ALTO } = OBSTACULOS.VALLA;
  const piezas = [
    caja(0.1, ALTO, 0.1, -ANCHO / 2 + 0.1, ALTO / 2, 0, PALETA.CARTEL_POSTE),
    caja(0.1, ALTO, 0.1, ANCHO / 2 - 0.1, ALTO / 2, 0, PALETA.CARTEL_POSTE),
  ];
  // Dos tablones a rayas naranja/blanco
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
  const malla = new THREE.Mesh(fusionarPiezas(piezas), material);
  malla.castShadow = true;
  return malla;
}

function crearMallaCartel(material) {
  const { ALTO_LIBRE, PANEL_ALTO, ANCHO } = OBSTACULOS.CARTEL;
  const topePanel = ALTO_LIBRE + PANEL_ALTO;
  const piezas = [
    // Postes y travesaño
    caja(0.12, topePanel + 0.5, 0.12, -ANCHO / 2, (topePanel + 0.5) / 2, 0, PALETA.CARTEL_POSTE),
    caja(0.12, topePanel + 0.5, 0.12, ANCHO / 2, (topePanel + 0.5) / 2, 0, PALETA.CARTEL_POSTE),
    caja(ANCHO + 0.3, 0.14, 0.14, 0, topePanel + 0.4, 0, PALETA.CARTEL_POSTE),
  ];
  const estructura = new THREE.Mesh(fusionarPiezas(piezas), material);
  estructura.castShadow = true;

  // Panel colgante con texto (canvas compartido entre todos los carteles)
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

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO - 0.4, PANEL_ALTO),
    new THREE.MeshBasicMaterial({ map: textura, side: THREE.DoubleSide }),
  );
  panel.position.y = ALTO_LIBRE + PANEL_ALTO / 2;
  panel.castShadow = true;

  const grupo = new THREE.Group();
  grupo.add(estructura, panel);
  return grupo;
}

export function crearObstaculos(escena) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });

  // Pool fijo: se reciclan, nunca se crean en caliente.
  const pool = [];
  for (let i = 0; i < 3; i++) {
    pool.push({ tipo: 'valla', malla: crearMallaValla(material), activo: false, superado: false });
    pool.push({ tipo: 'cartel', malla: crearMallaCartel(material), activo: false, superado: false });
  }
  for (const o of pool) {
    o.malla.visible = false;
    o.malla.position.z = OBSTACULOS.Z_SPAWN;
    escena.add(o.malla);
  }

  let proximoEn = 2; // segundos hasta el próximo spawn
  let supresion = 0; // ventana sin spawns (alrededor de los portales)

  function spawnear(z = OBSTACULOS.Z_SPAWN) {
    const inactivos = pool.filter((o) => !o.activo);
    if (inactivos.length === 0) return;
    const elegido = inactivos[Math.floor(Math.random() * inactivos.length)];
    elegido.activo = true;
    elegido.superado = false;
    elegido.malla.visible = true;
    elegido.malla.position.z = z;
  }

  return {
    // prepoblar: al arrancar partida se siembran obstáculos a lo largo de la
    // pista para que el primero no tarde 20 segundos en llegar (el más
    // cercano queda igual lejos del mínimo de reacción). En la pantalla de
    // atracción se resetea sin sembrar: la calle queda limpia.
    reiniciar(prepoblar = false) {
      for (const o of pool) {
        o.activo = false;
        o.malla.visible = false;
        o.malla.position.z = OBSTACULOS.Z_SPAWN;
      }
      if (prepoblar) {
        for (const z of [-55, -95, -135]) spawnear(z);
      }
      proximoEn = 2.5;
      supresion = 0;
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

    // Bloquea spawns nuevos durante `segundos` (los activos siguen andando).
    suprimir(segundos) {
      supresion = Math.max(supresion, segundos);
    },

    // Devuelve eventos del cuadro: { colision, esquivados }
    actualizar(dt, velocidad, jugador) {
      let colision = false;
      let esquivados = 0;

      for (const o of pool) {
        if (!o.activo) continue;
        o.malla.position.z += velocidad * dt;
        const z = o.malla.position.z;

        // ¿Quedó atrás? contarlo como esquivado y reciclar
        if (z > OBSTACULOS.Z_FUERA) {
          o.activo = false;
          o.malla.visible = false;
          continue;
        }
        if (!o.superado && z > JUGADOR.HITBOX.PROFUNDO) {
          o.superado = true;
          esquivados++;
        }

        // Colisión AABB (jugador fijo en z=0, x=0)
        const mitadProfundo = (o.tipo === 'valla' ? OBSTACULOS.VALLA.PROFUNDO : OBSTACULOS.CARTEL.PROFUNDO) / 2;
        const hb = jugador.hitbox();
        const solapaZ = Math.abs(z) < mitadProfundo + hb.profundo / 2;
        if (!solapaZ || o.superado) continue;

        const [oyMin, oyMax] =
          o.tipo === 'valla'
            ? [0, OBSTACULOS.VALLA.ALTO]
            : [OBSTACULOS.CARTEL.ALTO_LIBRE, OBSTACULOS.CARTEL.ALTO_LIBRE + OBSTACULOS.CARTEL.PANEL_ALTO + 0.4];
        if (hb.yMin < oyMax && hb.yMax > oyMin) {
          colision = true;
          o.superado = true; // un solo golpe por obstáculo
        }
      }

      // Spawns
      supresion = Math.max(0, supresion - dt);
      proximoEn -= dt;
      if (proximoEn <= 0 && supresion <= 0) {
        spawnear();
        proximoEn =
          OBSTACULOS.INTERVALO_MIN_S + Math.random() * (OBSTACULOS.INTERVALO_MAX_S - OBSTACULOS.INTERVALO_MIN_S);
        // Garantía de distancia mínima de reacción
        proximoEn = Math.max(proximoEn, OBSTACULOS.REACCION_MIN_S);
      }

      return { colision, esquivados };
    },
  };
}
