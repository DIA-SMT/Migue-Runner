// coleccionables.js — los soles de la ciudad (guiño al sol del isologo
// municipal). Suman puntos y le dan sentido al salto más allá de esquivar.
//
// Dos patrones, ambos jugables con los mismos dos botones:
//  - ARCO: parábola que sigue la trayectoria del salto. Hay que saltar en
//    el momento justo para llevárselos todos.
//  - LÍNEA BAJA: recta a la altura del pecho. Se juntan corriendo normal,
//    pero se pierden si vas agachado: pequeño costo por abusar de la agachada.
//
// Un solo InstancedMesh con pool fijo: cero draw calls extra, cero
// asignaciones en caliente.

import * as THREE from 'three';
import { PALETA, COLECCIONABLES } from './config.js';

// `zonaOcupada(z, margen)` la provee main.js y consulta los obstáculos: un
// arco de soles a la altura del salto dentro de un cartel colgante sería una
// trampa, no un desafío. Si la zona está ocupada, el grupo se reintenta.
export function crearColeccionables(escena, { zonaOcupada = () => false } = {}) {
  // Un octaedro achatado lee como "sol" estilizado y cuesta 8 triángulos.
  const geometria = new THREE.OctahedronGeometry(COLECCIONABLES.RADIO, 0);
  const material = new THREE.MeshBasicMaterial({
    // Fuera de rango: florece con el bloom y se ve desde lejos.
    color: new THREE.Color(PALETA.SOL).multiplyScalar(1.6),
    toneMapped: false,
  });
  const malla = new THREE.InstancedMesh(geometria, material, COLECCIONABLES.POOL);
  malla.frustumCulled = false;
  escena.add(malla);

  const soles = Array.from({ length: COLECCIONABLES.POOL }, () => ({
    activo: false,
    x: 0,
    y: 0,
    z: 0,
  }));

  // Objetos reutilizados: nada se asigna dentro del bucle principal.
  const matriz = new THREE.Matrix4();
  const rotacion = new THREE.Euler();
  const escalaUno = new THREE.Vector3(1, 1, 1);
  let giro = 0;
  let proximoEn = 1.5;

  function escribirInstancias() {
    for (let i = 0; i < soles.length; i++) {
      const s = soles[i];
      if (!s.activo) {
        matriz.makeScale(0, 0, 0); // escondido
      } else {
        rotacion.set(0, giro, 0.35);
        matriz.makeRotationFromEuler(rotacion);
        matriz.scale(escalaUno);
        matriz.setPosition(s.x, s.y, s.z);
      }
      malla.setMatrixAt(i, matriz);
    }
    malla.instanceMatrix.needsUpdate = true;
  }

  function activar(x, y, z) {
    const libre = soles.find((s) => !s.activo);
    if (!libre) return; // pool lleno: se saltea, nunca se crece en caliente
    libre.activo = true;
    libre.x = x;
    libre.y = y;
    libre.z = z;
  }

  // Suelta un grupo entero a partir de `zInicial`.
  function spawnearGrupo(zInicial) {
    if (Math.random() < COLECCIONABLES.PROBABILIDAD_ARCO) {
      const n = COLECCIONABLES.ARCO_CANTIDAD;
      for (let i = 0; i < n; i++) {
        // Parábola: base en las puntas, altura máxima en el medio.
        const t = i / (n - 1);
        const y =
          COLECCIONABLES.ARCO_BASE +
          (COLECCIONABLES.ARCO_ALTURA - COLECCIONABLES.ARCO_BASE) * Math.sin(t * Math.PI);
        activar(0, y, zInicial - i * COLECCIONABLES.ARCO_SEPARACION);
      }
    } else {
      for (let i = 0; i < COLECCIONABLES.LINEA_CANTIDAD; i++) {
        activar(0, COLECCIONABLES.LINEA_ALTURA, zInicial - i * COLECCIONABLES.LINEA_SEPARACION);
      }
    }
  }

  return {
    reiniciar() {
      for (const s of soles) s.activo = false;
      proximoEn = 1.5;
      escribirInstancias();
    },

    // Igual que los obstáculos: se despeja lo que caería sobre un portal.
    despejarCerca(zCentro, margen) {
      for (const s of soles) {
        if (s.activo && Math.abs(s.z - zCentro) < margen) s.activo = false;
      }
    },

    // Devuelve cuántos soles se juntaron este cuadro.
    actualizar(dt, velocidad, jugador) {
      giro += dt * COLECCIONABLES.GIRO;
      let juntados = 0;

      const hb = jugador.hitbox();
      for (const s of soles) {
        if (!s.activo) continue;
        s.z += velocidad * dt;

        if (s.z > COLECCIONABLES.Z_FUERA) {
          s.activo = false;
          continue;
        }

        // Captura: el jugador está fijo en x=0, así que alcanza con
        // comparar Z contra el radio de toma y Y contra la hitbox.
        if (Math.abs(s.z) < COLECCIONABLES.RADIO_TOMA) {
          const solAbajo = s.y - COLECCIONABLES.RADIO;
          const solArriba = s.y + COLECCIONABLES.RADIO;
          if (solAbajo < hb.yMax && solArriba > hb.yMin) {
            s.activo = false;
            juntados++;
          }
        }
      }

      proximoEn -= dt;
      if (proximoEn <= 0) {
        // El grupo entero ocupa un tramo de Z; se mira todo el tramo más un
        // colchón, para que no quede pegado a un obstáculo.
        const largoGrupo = COLECCIONABLES.ARCO_CANTIDAD * COLECCIONABLES.ARCO_SEPARACION;
        const centro = COLECCIONABLES.Z_SPAWN - largoGrupo / 2;
        if (zonaOcupada(centro, largoGrupo / 2 + 4)) {
          proximoEn = 0.4; // reintento corto: probamos un poco más adelante
        } else {
          spawnearGrupo(COLECCIONABLES.Z_SPAWN);
          proximoEn =
            COLECCIONABLES.INTERVALO_MIN_S +
            Math.random() * (COLECCIONABLES.INTERVALO_MAX_S - COLECCIONABLES.INTERVALO_MIN_S);
        }
      }

      escribirInstancias();
      return juntados;
    },
  };
}
