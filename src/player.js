// player.js — Migue. Carga el .glb optimizado (public/models/migue.glb) y,
// como el modelo no trae animaciones ni esqueleto, simula la carrera con
// bobbing procedural: rebote vertical, balanceo lateral y una inclinación
// fija hacia adelante (plan B previsto en el documento de contexto).
//
// La hitbox (fase de obstáculos) será una caja propia, NO la bounding box
// del modelo; acá solo se resuelve la parte visual.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { JUGADOR } from './config.js';

// Placeholder por si el .glb no carga (nunca romper la escena por un asset).
function crearPlaceholder() {
  const geometria = new THREE.CapsuleGeometry(0.35, JUGADOR.ALTURA - 0.7, 4, 8);
  const material = new THREE.MeshStandardMaterial({ color: 0x2277cc, roughness: 1 });
  const capsula = new THREE.Mesh(geometria, material);
  capsula.position.y = JUGADOR.ALTURA / 2;
  capsula.castShadow = true;
  const grupo = new THREE.Group();
  grupo.add(capsula);
  return grupo;
}

async function cargarModelo() {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync('models/migue.glb');

  // El documento pide verificar qué animaciones trae; se deja constancia.
  if (gltf.animations.length > 0) {
    console.info('migue.glb trae animaciones:', gltf.animations.map((a) => a.name));
  } else {
    console.info('migue.glb sin animaciones: se usa bobbing procedural.');
  }

  const modelo = gltf.scene;

  // Escalar a la altura objetivo y apoyar los pies en y=0.
  const caja = new THREE.Box3().setFromObject(modelo);
  const tamano = caja.getSize(new THREE.Vector3());
  const escala = JUGADOR.ALTURA / tamano.y;
  modelo.scale.setScalar(escala);
  caja.setFromObject(modelo);
  modelo.position.y -= caja.min.y;

  // El modelo mira a +Z; la carrera va hacia -Z.
  modelo.rotation.y = Math.PI;

  modelo.traverse((nodo) => {
    if (nodo.isMesh) {
      nodo.castShadow = true;
      // El shading viene horneado como emissive (unlit); igual conviene
      // desactivar el doble lado para ahorrar rasterizado.
      if (nodo.material) nodo.material.side = THREE.FrontSide;
    }
  });

  return modelo;
}

export async function crearMigue(escena) {
  let modelo;
  try {
    modelo = await cargarModelo();
  } catch (error) {
    console.error('No se pudo cargar models/migue.glb; se usa placeholder.', error);
    modelo = crearPlaceholder();
  }

  // Grupo raíz: el bobbing anima al grupo, así el modelo interno queda intacto.
  const raiz = new THREE.Group();
  raiz.add(modelo);
  raiz.position.set(0, 0, 0);
  raiz.rotation.x = JUGADOR.INCLINACION;
  escena.add(raiz);

  let tiempo = 0;

  return {
    objeto: raiz,
    actualizar(dt) {
      tiempo += dt;
      const fase = tiempo * JUGADOR.BOB_FRECUENCIA;
      // |sin| da dos apoyos por ciclo, como una zancada.
      raiz.position.y = Math.abs(Math.sin(fase)) * JUGADOR.BOB_AMPLITUD;
      raiz.rotation.z = Math.sin(fase) * JUGADOR.BOB_BALANCEO;
    },
  };
}
