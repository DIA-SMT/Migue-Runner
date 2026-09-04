// player.js — Migue: carga del modelo, salto, agachada e hitbox.
//
// El .glb optimizado no trae animaciones ni esqueleto, así que la carrera se
// simula con bobbing procedural y la agachada con un achatamiento de escala
// (plan B previsto en el documento de contexto).
//
// La hitbox es una caja propia más chica que el modelo: perdonar al jugador
// se siente mejor que castigarlo.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { JUGADOR, SALTO, AGACHADA } from './config.js';

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

  // contenedor: recibe la escala de la agachada (el modelo interno queda intacto).
  // raiz: recibe salto + bobbing + balanceo.
  const contenedor = new THREE.Group();
  contenedor.add(modelo);
  const raiz = new THREE.Group();
  raiz.add(contenedor);
  raiz.rotation.x = JUGADOR.INCLINACION;
  escena.add(raiz);

  // ----- Estado físico -----
  let saltoY = 0; // altura del salto (sin contar el bobbing)
  let velocidadY = 0;
  let agachadoDeseado = false; // el botón está apretado
  let agachadoDesde = -Infinity; // reloj interno de la agachada (mínimo 0.4 s)
  let relojInterno = 0;
  let tiempoBob = 0;

  const enAire = () => saltoY > 0.001 || velocidadY > 0;
  const agachadoActivo = () =>
    !enAire() && (agachadoDeseado || relojInterno - agachadoDesde < AGACHADA.MIN_S);

  return {
    objeto: raiz,

    saltar() {
      if (enAire() || agachadoActivo()) return false;
      velocidadY = SALTO.VELOCIDAD_INICIAL;
      return true;
    },

    // Se llama con true al apretar y false al soltar; el mínimo de 0.4 s
    // se garantiza internamente.
    agacharse(apretado) {
      if (apretado && !enAire()) {
        agachadoDeseado = true;
        agachadoDesde = relojInterno;
      } else if (!apretado) {
        agachadoDeseado = false;
      }
    },

    enAire,
    estaAgachado: agachadoActivo,

    // Alto actual de la hitbox y base (para el AABB de colisiones).
    hitbox() {
      return {
        yMin: saltoY,
        yMax: saltoY + (agachadoActivo() ? JUGADOR.HITBOX.ALTO_AGACHADO : JUGADOR.HITBOX.ALTO),
        profundo: JUGADOR.HITBOX.PROFUNDO,
      };
    },

    reiniciar() {
      saltoY = 0;
      velocidadY = 0;
      agachadoDeseado = false;
      agachadoDesde = -Infinity;
      contenedor.scale.y = 1;
      raiz.position.y = 0;
      raiz.visible = true;
    },

    // modo: 'correr' (partida) o 'idle' (pantalla de atracción)
    actualizar(dt, modo = 'correr') {
      relojInterno += dt;

      // Física del salto
      if (enAire()) {
        velocidadY -= SALTO.GRAVEDAD * dt;
        saltoY += velocidadY * dt;
        if (saltoY <= 0) {
          saltoY = 0;
          velocidadY = 0;
        }
      }

      // Agachada: interpolar la escala del contenedor
      const escalaObjetivo = agachadoActivo() ? AGACHADA.ESCALA_Y : 1;
      contenedor.scale.y +=
        (escalaObjetivo - contenedor.scale.y) * Math.min(1, AGACHADA.VELOCIDAD_TRANSICION * dt);

      // Bobbing (solo con los pies en el suelo)
      let bob = 0;
      if (!enAire()) {
        if (modo === 'correr') {
          tiempoBob += dt;
          const fase = tiempoBob * JUGADOR.BOB_FRECUENCIA;
          bob = Math.abs(Math.sin(fase)) * JUGADOR.BOB_AMPLITUD;
          raiz.rotation.z = Math.sin(fase) * JUGADOR.BOB_BALANCEO;
        } else {
          tiempoBob += dt;
          bob = Math.abs(Math.sin(tiempoBob * JUGADOR.IDLE_FRECUENCIA)) * JUGADOR.IDLE_AMPLITUD;
          raiz.rotation.z = 0;
        }
      } else {
        raiz.rotation.z = 0;
      }

      raiz.position.y = saltoY + bob;
    },
  };
}
