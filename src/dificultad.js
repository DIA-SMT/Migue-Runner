// dificultad.js — progresión de la partida: qué obstáculos aparecen, en qué
// combinaciones, y cada cuánto.
//
// La dificultad no crece sólo con la velocidad: cada nivel habilita tipos de
// obstáculo nuevos y patrones más exigentes (combos de dos obstáculos
// seguidos que obligan a encadenar salto y agachada).
//
// La parte delicada es que **ningún combo puede ser imposible**. Las
// separaciones no se eligen a ojo: se derivan de la física del jugador
// (duración del salto, mínimo de la agachada) y de la velocidad del momento.
// Este módulo no toca el DOM ni three.js a propósito, así que se puede
// testear de punta a punta sin navegador.

import { OBSTACULOS, DIFICULTAD, SALTO, AGACHADA } from './config.js';

// --- Física derivada de config, calculada una sola vez ---

// Tiempo que Migue pasa en el aire: sube y baja con gravedad constante.
export const DURACION_SALTO_S = (2 * SALTO.VELOCIDAD_INICIAL) / SALTO.GRAVEDAD;

// Altura máxima del salto: v₀² / 2g. Sirve para validar los obstáculos bajos.
export const ALTURA_SALTO = SALTO.VELOCIDAD_INICIAL ** 2 / (2 * SALTO.GRAVEDAD);

// Segundos que el jugador necesita entre las dos acciones de un combo.
// Depende de qué acción viene primero:
//  - Si primero salta, tiene que aterrizar antes de poder hacer otra cosa
//    (el jugador no puede agacharse ni volver a saltar en el aire).
//  - Si primero se agacha, la agachada se sostiene un mínimo fijo durante el
//    cual no puede saltar.
function segundosEntreAcciones(patron) {
  const base =
    patron === 'altoBajo'
      ? AGACHADA.MIN_S // hay que esperar a que termine la agachada
      : DURACION_SALTO_S; // hay que aterrizar
  return base * DIFICULTAD.MARGEN_COMBO + DIFICULTAD.REACCION_COMBO_S;
}

// Distancia en unidades de mundo que hay que dejar entre los dos obstáculos
// de un combo, a la velocidad actual.
export function separacionCombo(patron, velocidad) {
  return segundosEntreAcciones(patron) * velocidad;
}

// Qué obstáculos componen cada patrón, por clase.
const COMPOSICION = {
  simple: null, // un solo obstáculo, de cualquier clase habilitada
  dobleBajo: ['bajo', 'bajo'],
  bajoAlto: ['bajo', 'alto'],
  altoBajo: ['alto', 'bajo'],
};

// Nivel correspondiente a una distancia: el último cuyo umbral se alcanzó.
export function nivelPara(distancia) {
  let indice = 0;
  for (let i = 0; i < DIFICULTAD.NIVELES.length; i++) {
    if (distancia >= DIFICULTAD.NIVELES[i].desde) indice = i;
  }
  return indice;
}

const alAzar = (lista) => lista[Math.floor(Math.random() * lista.length)];

export function crearDificultad() {
  let indiceNivel = 0;

  return {
    get indice() {
      return indiceNivel;
    },
    get nivel() {
      return DIFICULTAD.NIVELES[indiceNivel];
    },

    reiniciar() {
      indiceNivel = 0;
    },

    // Actualiza el nivel según la distancia. Devuelve el nivel nuevo si
    // hubo ascenso (para anunciarlo en el HUD), o null.
    revisarAscenso(distancia) {
      const nuevo = nivelPara(distancia);
      if (nuevo === indiceNivel) return null;
      indiceNivel = nuevo;
      return DIFICULTAD.NIVELES[indiceNivel];
    },

    // Segundos hasta el próximo spawn, según el nivel.
    proximoIntervalo() {
      const [min, max] = this.nivel.intervalo;
      return min + Math.random() * (max - min);
    },

    // Decide qué spawnear. Devuelve una lista de { tipo, zOffset }, donde
    // zOffset es cuánto más lejos (más negativo) nace cada obstáculo
    // respecto del primero.
    //
    // `velocidad` es necesaria porque la separación de un combo depende de
    // cuánto avanza el mundo mientras el jugador aterriza o se incorpora.
    proximoGrupo(velocidad) {
      const nivel = this.nivel;
      const disponibles = nivel.tipos.filter((t) => OBSTACULOS.TIPOS[t]);
      const porClase = (clase) =>
        disponibles.filter((t) => OBSTACULOS.TIPOS[t].clase === clase);

      // Patrones que el nivel habilita y que además se pueden armar con los
      // tipos disponibles (un 'bajoAlto' sin obstáculos altos no existe).
      const posibles = nivel.patrones.filter((patron) => {
        const clases = COMPOSICION[patron];
        if (!clases) return disponibles.length > 0;
        return clases.every((clase) => porClase(clase).length > 0);
      });
      if (posibles.length === 0) return [];

      const patron = alAzar(posibles);
      const clases = COMPOSICION[patron];

      if (!clases) {
        return [{ tipo: alAzar(disponibles), zOffset: 0 }];
      }

      // Combo: el segundo obstáculo nace más lejos, a la separación que la
      // física exige para que sea resoluble.
      const separacion = separacionCombo(patron, velocidad);
      return [
        { tipo: alAzar(porClase(clases[0])), zOffset: 0 },
        { tipo: alAzar(porClase(clases[1])), zOffset: -separacion },
      ];
    },
  };
}
