// player.js — los personajes jugables: Migue y Chanbachi (el perrobot
// municipal). Salto, agachada, hitbox y animación procedural.
//
// Los .glb no traen animaciones ni esqueleto, así que la carrera se simula:
// zancada con rebote y balanceo cuya frecuencia escala con la velocidad,
// cabeceo sutil, squash & stretch en salto y aterrizaje, y una agachada con
// ensanche e inclinación de barrida (plan B previsto en el documento).
//
// La hitbox es una caja propia idéntica para ambos personajes (elegir es
// gusto, no ventaja) y más chica que el modelo: perdonar se siente mejor.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { JUGADOR, SALTO, AGACHADA, PALETA, POWERUPS } from './config.js';
import { fusionarPiezas } from './geometria.js';
import { piezasPatineta } from './powerups.js';

// Placeholder por si un .glb no carga (nunca romper la escena por un asset).
function crearPlaceholder(altura) {
  const geometria = new THREE.CapsuleGeometry(0.35, altura - 0.7, 4, 8);
  const material = new THREE.MeshStandardMaterial({ color: 0x2277cc, roughness: 1 });
  const capsula = new THREE.Mesh(geometria, material);
  capsula.position.y = altura / 2;
  capsula.castShadow = true;
  const grupo = new THREE.Group();
  grupo.add(capsula);
  return grupo;
}

async function cargarModelo(archivo, altura) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(archivo);

  if (gltf.animations.length > 0) {
    console.info(`${archivo} trae animaciones:`, gltf.animations.map((a) => a.name));
  }

  const modelo = gltf.scene;

  // Escalar a la altura objetivo y apoyar los pies en y=0.
  const caja = new THREE.Box3().setFromObject(modelo);
  const tamano = caja.getSize(new THREE.Vector3());
  modelo.scale.setScalar(altura / tamano.y);
  caja.setFromObject(modelo);
  modelo.position.y -= caja.min.y;

  // Los modelos miran a +Z; la carrera va hacia -Z.
  modelo.rotation.y = Math.PI;

  modelo.traverse((nodo) => {
    if (nodo.isMesh) {
      nodo.castShadow = true;
      if (nodo.material) nodo.material.side = THREE.FrontSide;
    }
  });

  return modelo;
}

export async function crearPersonajes(escena) {
  const [migue, chanbachi] = await Promise.all([
    cargarModelo('models/migue.glb', JUGADOR.ALTURA_MIGUE).catch((e) => {
      console.error('No se pudo cargar migue.glb; se usa placeholder.', e);
      return crearPlaceholder(JUGADOR.ALTURA_MIGUE);
    }),
    cargarModelo('models/chanbachi.glb', JUGADOR.ALTURA_CHANBACHI).catch((e) => {
      console.error('No se pudo cargar chanbachi.glb; se usa placeholder.', e);
      return crearPlaceholder(JUGADOR.ALTURA_CHANBACHI);
    }),
  ]);

  // contenedor: recibe squash & stretch y la escala de la agachada.
  // raiz: recibe salto + bobbing + balanceo + inclinación.
  const contenedor = new THREE.Group();
  contenedor.add(migue, chanbachi);
  const raiz = new THREE.Group();
  raiz.add(contenedor);
  raiz.rotation.x = JUGADOR.INCLINACION;
  escena.add(raiz);

  // Patineta bajo los pies. Va en la raíz (no en el contenedor) para que la
  // agachada no la achate junto con el personaje. Es sólo visual: la hitbox
  // no cambia al llevarla, así que los mismos obstáculos se franquean igual.
  const patineta = new THREE.Mesh(
    fusionarPiezas(piezasPatineta()),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }),
  );
  patineta.castShadow = true;
  patineta.visible = false;
  raiz.add(patineta);

  // Halo de inmunidad de la empanada: anillo dorado que pulsa a los pies.
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.07, 6, 20),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(PALETA.HALO_INMUNE).multiplyScalar(1.8), // florece con el bloom
      toneMapped: false,
    }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.1;
  halo.visible = false;
  raiz.add(halo);

  const modelos = { migue, chanbachi };
  let elegido = 'migue';
  let enPatineta = false;
  let inmune = false;

  // ----- Estado físico -----
  let saltoY = 0;
  let velocidadY = 0;
  let agachadoDeseado = false;
  let agachadoDesde = -Infinity;
  let relojInterno = 0;
  let tiempoBob = 0;
  let squashRestante = 0; // temporizador del aplastamiento de aterrizaje

  const enAire = () => saltoY > 0.001 || velocidadY > 0;
  const agachadoActivo = () =>
    !enAire() && (agachadoDeseado || relojInterno - agachadoDesde < AGACHADA.MIN_S);

  // En la pantalla de atracción se muestran los dos, lado a lado.
  function modoAtraccion() {
    migue.visible = true;
    chanbachi.visible = true;
    migue.position.x = -0.75;
    chanbachi.position.x = 0.75;
  }

  function modoJuego() {
    for (const nombre of Object.keys(modelos)) {
      modelos[nombre].visible = nombre === elegido;
      modelos[nombre].position.x = 0;
    }
  }

  // La patineta levanta al personaje la altura de la tabla, para que no se
  // vea hundido en ella.
  function acomodarPorPatineta() {
    patineta.visible = enPatineta;
    contenedor.position.y = enPatineta ? POWERUPS.PATINETA.ALTURA_TABLA : 0;
  }

  modoAtraccion();

  return {
    objeto: raiz,

    // 'migue' | 'chanbachi'
    seleccionar(nombre) {
      if (modelos[nombre]) elegido = nombre;
    },
    elegido: () => elegido,
    modoAtraccion,

    // --- Power-ups (sólo estado visual; los efectos de juego los aplica
    // main.js, y la hitbox no cambia en ningún caso) ---
    ponerPatineta(valor) {
      enPatineta = valor;
      acomodarPorPatineta();
    },
    tienePatineta: () => enPatineta,

    ponerInmune(valor) {
      inmune = valor;
      halo.visible = valor;
    },

    saltar() {
      if (enAire() || agachadoActivo()) return false;
      velocidadY = SALTO.VELOCIDAD_INICIAL;
      return true;
    },

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
      squashRestante = 0;
      enPatineta = false;
      inmune = false;
      contenedor.scale.set(1, 1, 1);
      raiz.position.y = 0;
      raiz.rotation.set(JUGADOR.INCLINACION, 0, 0);
      raiz.visible = true;
      halo.visible = false;
      acomodarPorPatineta();
      modoJuego();
    },

    // modo: 'correr' (partida) o 'idle' (atracción); velocidad escala el paso.
    actualizar(dt, modo = 'correr', velocidad = 8) {
      relojInterno += dt;

      // ---- Física del salto ----
      const estabaEnAire = enAire();
      if (estabaEnAire) {
        velocidadY -= SALTO.GRAVEDAD * dt;
        saltoY += velocidadY * dt;
        if (saltoY <= 0) {
          saltoY = 0;
          velocidadY = 0;
          squashRestante = JUGADOR.ATERRIZAJE_S; // ¡tocó el suelo!
        }
      }
      if (squashRestante > 0) squashRestante -= dt;

      // ---- Pose objetivo (escala e inclinación) ----
      const agachado = agachadoActivo();
      let escalaYObjetivo = 1;
      let escalaXZObjetivo = 1;
      let inclinacionObjetivo = JUGADOR.INCLINACION;

      if (agachado) {
        escalaYObjetivo = AGACHADA.ESCALA_Y;
        escalaXZObjetivo = AGACHADA.ENSANCHE;
        inclinacionObjetivo = JUGADOR.INCLINACION + AGACHADA.INCLINACION_EXTRA;
      } else if (enAire()) {
        // Estirado subiendo, neutro cayendo; lean según velocidad vertical.
        escalaYObjetivo = velocidadY > 0 ? JUGADOR.SALTO_ESTIRAMIENTO : 1;
        escalaXZObjetivo = velocidadY > 0 ? 0.96 : 1;
        inclinacionObjetivo = JUGADOR.INCLINACION - velocidadY * JUGADOR.SALTO_LEAN;
      } else if (squashRestante > 0) {
        // Aplastamiento breve al aterrizar
        escalaYObjetivo = JUGADOR.ATERRIZAJE_SQUASH;
        escalaXZObjetivo = 1.08;
      }

      const k = Math.min(1, AGACHADA.VELOCIDAD_TRANSICION * dt);
      contenedor.scale.y += (escalaYObjetivo - contenedor.scale.y) * k;
      contenedor.scale.x += (escalaXZObjetivo - contenedor.scale.x) * k;
      contenedor.scale.z += (escalaXZObjetivo - contenedor.scale.z) * k;

      // ---- Zancada / idle ----
      let bob = 0;
      let balanceo = 0;
      let cabeceo = 0;
      if (!enAire()) {
        if (modo === 'correr' && !agachado) {
          if (enPatineta) {
            // En patineta los pies van fijos a la tabla: no hay zancada,
            // sólo un balanceo suave de andar rodando.
            tiempoBob += dt * 3.2;
            balanceo = Math.sin(tiempoBob) * JUGADOR.BOB_BALANCEO * 0.7;
          } else {
            const frecuencia =
              JUGADOR.BOB_FRECUENCIA_BASE + JUGADOR.BOB_FRECUENCIA_POR_VELOCIDAD * velocidad;
            tiempoBob += dt * frecuencia;
            bob = Math.abs(Math.sin(tiempoBob)) * JUGADOR.BOB_AMPLITUD;
            balanceo = Math.sin(tiempoBob) * JUGADOR.BOB_BALANCEO;
            cabeceo = Math.sin(tiempoBob * 2) * JUGADOR.BOB_CABECEO;
          }
        } else if (modo === 'idle') {
          tiempoBob += dt * JUGADOR.IDLE_FRECUENCIA;
          bob = Math.abs(Math.sin(tiempoBob)) * JUGADOR.IDLE_AMPLITUD;
        }
      }

      raiz.position.y = saltoY + bob;
      raiz.rotation.z = balanceo;
      raiz.rotation.x += (inclinacionObjetivo + cabeceo - raiz.rotation.x) * Math.min(1, 14 * dt);

      // La patineta acompaña el salto pero no la agachada, y gira apenas
      // con el balanceo para que no se vea rígida.
      if (enPatineta) patineta.rotation.z = -balanceo * 0.5;

      // El halo pulsa mientras dura la inmunidad.
      if (inmune) {
        const p = 1 + Math.sin(relojInterno * Math.PI * 2 * POWERUPS.EMPANADA.PULSO_HZ) * 0.12;
        halo.scale.set(p, p, p);
      }
    },
  };
}
