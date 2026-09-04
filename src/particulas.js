// particulas.js — chispas de colores planos para el feedback de impacto.
//
// Un único InstancedMesh con un pool fijo: nunca se crean objetos en caliente
// (el presupuesto es 60 fps en gráficos integrados, y el GC en medio de una
// partida se nota). Las partículas muertas se esconden con escala 0.

import * as THREE from 'three';
import { JUICE } from './config.js';

export function crearParticulas(escena) {
  const geometria = new THREE.PlaneGeometry(JUICE.PARTICULA_TAMANO, JUICE.PARTICULA_TAMANO);
  // OJO: nada de `vertexColors: true` acá. El color por instancia viaja en
  // `instanceColor`, y activar vertexColors haría que el shader busque un
  // atributo `color` en la geometría que no existe → partículas negras.
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff, // base blanca: el instanceColor la tiñe
    toneMapped: false, // los colores fuera de rango florecen con el bloom
    side: THREE.DoubleSide,
  });
  const malla = new THREE.InstancedMesh(geometria, material, JUICE.PARTICULAS_POOL);
  malla.frustumCulled = false;
  malla.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(JUICE.PARTICULAS_POOL * 3),
    3,
  );
  escena.add(malla);

  // Estado de cada partícula del pool.
  const particulas = Array.from({ length: JUICE.PARTICULAS_POOL }, () => ({
    vida: 0,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
  }));

  const matriz = new THREE.Matrix4();
  const color = new THREE.Color();
  let siguiente = 0; // índice circular: la partícula más vieja se recicla

  function escribirInstancias() {
    for (let i = 0; i < particulas.length; i++) {
      const p = particulas[i];
      if (p.vida <= 0) {
        matriz.makeScale(0, 0, 0);
      } else {
        // Se achica al morir: desaparece sin necesidad de alpha por instancia.
        const escala = p.vida / JUICE.PARTICULA_VIDA_S;
        matriz.makeScale(escala, escala, escala);
        matriz.setPosition(p.x, p.y, p.z);
      }
      malla.setMatrixAt(i, matriz);
    }
    malla.instanceMatrix.needsUpdate = true;
  }

  return {
    // Estallido en (x, y, z) con `cantidad` chispas del color dado.
    // `impulso` sesga el estallido hacia el jugador (z positivo).
    estallar(x, y, z, cantidad, colorHex, impulso = 0) {
      color.set(colorHex);
      for (let n = 0; n < cantidad; n++) {
        const p = particulas[siguiente];
        const i = siguiente;
        siguiente = (siguiente + 1) % particulas.length;

        // Dirección al azar en una semiesfera hacia arriba.
        const angulo = Math.random() * Math.PI * 2;
        const altura = 0.3 + Math.random() * 0.9;
        const radial = Math.random() * JUICE.PARTICULA_VELOCIDAD;

        p.vida = JUICE.PARTICULA_VIDA_S * (0.7 + Math.random() * 0.6);
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = Math.cos(angulo) * radial;
        p.vy = altura * JUICE.PARTICULA_VELOCIDAD;
        p.vz = Math.sin(angulo) * radial * 0.5 + impulso;

        // Color con brillo variable, fuera de rango para que florezca.
        const brillo = 1.1 + Math.random() * 0.5;
        malla.instanceColor.setXYZ(i, color.r * brillo, color.g * brillo, color.b * brillo);
      }
      malla.instanceColor.needsUpdate = true;
    },

    limpiar() {
      for (const p of particulas) p.vida = 0;
      escribirInstancias();
    },

    // Las partículas viajan con el mundo: se van hacia atrás con el scroll.
    actualizar(dt, velocidadMundo = 0) {
      let hayVivas = false;
      for (const p of particulas) {
        if (p.vida <= 0) continue;
        hayVivas = true;
        p.vida -= dt;
        p.vy -= JUICE.PARTICULA_GRAVEDAD * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += (p.vz + velocidadMundo) * dt;
        if (p.y < 0) {
          p.y = 0;
          p.vy *= -0.35; // rebote seco contra la vereda
        }
      }
      // Solo se reescriben las matrices si algo se movió este cuadro.
      if (hayVivas) escribirInstancias();
    },
  };
}
