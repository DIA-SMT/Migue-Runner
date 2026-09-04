// portals.js — el portal doble de la trivia.
//
// Un marco celeste con dos paneles: el de ARRIBA se elige saltando, el de
// ABAJO agachándose. El texto de cada opción se dibuja en un canvas propio
// que se reutiliza entre preguntas. Al cruzar el plano del jugador (z=0) se
// evalúa qué estaba haciendo Migue y se emite el resultado.

import * as THREE from 'three';
import { PALETA, TRIVIA } from './config.js';
import { fusionarPiezas, caja } from './geometria.js';

const ANCHO = 4.2;
const PANEL_ANCHO = 3.6;
const PANEL_ALTO = 1.15;
const Y_ARRIBA = 2.3;
const Y_ABAJO = 0.72;

function crearPanel() {
  const lienzo = document.createElement('canvas');
  lienzo.width = 640;
  lienzo.height = 200;
  const ctx = lienzo.getContext('2d');
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;

  const malla = new THREE.Mesh(
    new THREE.PlaneGeometry(PANEL_ANCHO, PANEL_ALTO),
    new THREE.MeshBasicMaterial({ map: textura, transparent: true, side: THREE.DoubleSide }),
  );

  return {
    malla,
    escribir(texto, flecha) {
      ctx.clearRect(0, 0, 640, 200);
      // Placa azul con borde dorado
      ctx.fillStyle = 'rgba(10, 52, 89, 0.92)';
      ctx.beginPath();
      ctx.roundRect(6, 6, 628, 188, 24);
      ctx.fill();
      ctx.strokeStyle = '#C8A951';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.roundRect(6, 6, 628, 188, 24);
      ctx.stroke();
      // Flecha de acción + texto
      ctx.fillStyle = '#F7F9FB';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tamano = texto.length > 16 ? 52 : 64;
      ctx.font = `700 ${tamano}px system-ui, sans-serif`;
      ctx.fillText(`${flecha} ${texto}`, 320, 104);
      textura.needsUpdate = true;
    },
  };
}

export function crearPortal(escena) {
  const grupo = new THREE.Group();

  // Marco celeste con color fuera de rango: el bloom lo hace brillar apenas.
  const colorMarco = new THREE.Color(PALETA.PORTAL_MARCO).multiplyScalar(1.25);
  const marco = new THREE.Mesh(
    fusionarPiezas([
      caja(0.16, 3.6, 0.16, -ANCHO / 2, 1.8, 0, PALETA.PORTAL_MARCO),
      caja(0.16, 3.6, 0.16, ANCHO / 2, 1.8, 0, PALETA.PORTAL_MARCO),
      caja(ANCHO + 0.16, 0.16, 0.16, 0, 3.6, 0, PALETA.PORTAL_MARCO),
    ]),
    new THREE.MeshBasicMaterial({ color: colorMarco, toneMapped: false }),
  );

  const panelArriba = crearPanel();
  panelArriba.malla.position.y = Y_ARRIBA;
  const panelAbajo = crearPanel();
  panelAbajo.malla.position.y = Y_ABAJO;

  grupo.add(marco, panelArriba.malla, panelAbajo.malla);
  grupo.visible = false;
  escena.add(grupo);

  let activo = false;
  let cruzado = false;
  let pregunta = null;

  return {
    estaActivo: () => activo,

    // Coloca el portal a `distancia` unidades por delante del jugador.
    lanzar(nuevaPregunta, distancia) {
      pregunta = nuevaPregunta;
      panelArriba.escribir(pregunta.opcionArriba, '▲');
      panelAbajo.escribir(pregunta.opcionAbajo, '▼');
      grupo.position.z = -distancia;
      grupo.visible = true;
      activo = true;
      cruzado = false;
    },

    descartar() {
      activo = false;
      grupo.visible = false;
    },

    // Devuelve null o el evento de cruce { pregunta, eleccion }.
    // eleccion: 'arriba' | 'abajo' | null (pasó sin elegir)
    actualizar(dt, velocidad, jugador) {
      if (!activo) return null;
      grupo.position.z += velocidad * dt;

      if (!cruzado && grupo.position.z >= 0) {
        cruzado = true;
        let eleccion = null;
        if (jugador.enAire() && jugador.hitbox().yMin > TRIVIA.UMBRAL_AIRE_Y) eleccion = 'arriba';
        else if (jugador.estaAgachado()) eleccion = 'abajo';
        else if (jugador.enAire()) eleccion = 'arriba'; // salto bajo igual cuenta
        return { pregunta, eleccion };
      }

      if (grupo.position.z > 10) {
        activo = false;
        grupo.visible = false;
      }
      return null;
    },
  };
}
