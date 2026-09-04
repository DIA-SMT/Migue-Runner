// audio.js — música de fondo y efectos sintetizados.
//
// La música es un mp3 local (public/audio/musica.mp3, con autorización de
// uso declarada por la Municipalidad). Los efectos son blips generados con
// WebAudio: cero assets, cero licencias, funciona offline.
//
// Los navegadores exigen un gesto del usuario antes de reproducir audio;
// como la partida siempre arranca con un botón, iniciarMusica() se llama
// recién ahí y nunca falla por autoplay.

import { AUDIO } from './config.js';

export function crearAudio() {
  const musica = new Audio(`${import.meta.env.BASE_URL}audio/musica.mp3`);
  musica.loop = true;
  musica.volume = AUDIO.VOLUMEN_MUSICA;

  let contexto = null;
  const ctx = () => {
    if (!contexto) contexto = new (window.AudioContext || window.webkitAudioContext)();
    return contexto;
  };

  // Un blip corto: oscilador con envolvente exponencial.
  function nota(frecuencia, inicio, duracion, tipo = 'square') {
    const c = ctx();
    const osc = c.createOscillator();
    const gan = c.createGain();
    osc.type = tipo;
    osc.frequency.value = frecuencia;
    gan.gain.setValueAtTime(AUDIO.VOLUMEN_EFECTOS, c.currentTime + inicio);
    gan.gain.exponentialRampToValueAtTime(0.001, c.currentTime + inicio + duracion);
    osc.connect(gan).connect(c.destination);
    osc.start(c.currentTime + inicio);
    osc.stop(c.currentTime + inicio + duracion);
  }

  return {
    iniciarMusica() {
      // play() devuelve una promesa; si el navegador la bloquea, no es fatal.
      musica.play().catch(() => {});
    },

    // Acierto de trivia: arpegio ascendente cortito.
    acierto() {
      try {
        nota(523, 0, 0.09);
        nota(659, 0.08, 0.09);
        nota(784, 0.16, 0.14);
      } catch {
        /* sin audio, sin drama */
      }
    },

    // Sol juntado: blip agudo y muy corto. Suena seguido, así que va más
    // bajo que el resto para no saturar.
    sol() {
      try {
        nota(1175, 0, 0.05, 'triangle');
        nota(1568, 0.04, 0.07, 'triangle');
      } catch {
        /* sin audio, sin drama */
      }
    },

    // Golpe o respuesta incorrecta: descenso seco.
    golpe() {
      try {
        nota(220, 0, 0.1, 'sawtooth');
        nota(147, 0.09, 0.16, 'sawtooth');
      } catch {
        /* sin audio, sin drama */
      }
    },

    // Festejo (frase argenta): fanfarria mínima.
    festejo() {
      try {
        nota(659, 0, 0.08);
        nota(784, 0.07, 0.08);
        nota(1047, 0.14, 0.18);
      } catch {
        /* sin audio, sin drama */
      }
    },
  };
}
