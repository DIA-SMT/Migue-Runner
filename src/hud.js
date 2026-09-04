// hud.js — HUD en DOM sobre el canvas y pantallas de sistema.
//
// Reglas de legibilidad de proyector: nada por debajo de 32 px en 1080p,
// texto siempre sobre placa (los estilos viven en estilos.css).

import { JUEGO } from './config.js';

const $ = (selector) => document.querySelector(selector);

export function crearHud() {
  const vidas = $('#hud-vidas');
  const nivel = $('#hud-nivel');
  const puntaje = $('#hud-puntaje');
  const soles = $('#hud-soles');
  const racha = $('#hud-racha');
  const pregunta = $('#hud-pregunta');
  const feedback = $('#hud-feedback');
  const frase = $('#hud-frase');
  const flashDano = $('#flash-dano');
  const juegoHud = $('#hud');
  const atraccion = $('#pantalla-atraccion');
  const atraccionRecord = $('#atraccion-record');
  const resultado = $('#pantalla-resultado');

  let ultimoPuntaje = -1;
  let temporizadorPop = null;

  return {
    // --------- Pantallas ---------
    mostrarAtraccion() {
      atraccion.classList.remove('oculto');
      resultado.classList.add('oculto');
      juegoHud.classList.add('oculto');
      pregunta.classList.add('oculto');
      feedback.classList.add('oculto');
    },

    mostrarJuego() {
      atraccion.classList.add('oculto');
      resultado.classList.add('oculto');
      juegoHud.classList.remove('oculto');
      pregunta.classList.add('oculto');
      feedback.classList.add('oculto');
      ultimoPuntaje = -1;
    },

    // datos: la partida + { recordAnterior, esRecord }
    mostrarResultado(datos) {
      atraccion.classList.add('oculto');
      resultado.classList.remove('oculto');
      juegoHud.classList.add('oculto');
      pregunta.classList.add('oculto');
      feedback.classList.add('oculto');

      const puntajeFinal = Math.floor(datos.puntaje);
      $('#resultado-puntaje').textContent = String(puntajeFinal);
      $('#resultado-aciertos').textContent = `${datos.aciertos} / ${datos.totalPreguntas}`;
      $('#resultado-soles').textContent = String(datos.soles);
      $('#resultado-distancia').textContent = `${Math.round(datos.distancia)} m`;
      $('#resultado-tiempo').textContent = `${Math.round(datos.tiempo)} s`;

      // Mensaje según puntaje: el primer umbral que alcance.
      const mensaje = JUEGO.MENSAJES.find((m) => puntajeFinal >= m.desde);
      $('#resultado-mensaje').textContent = mensaje?.texto ?? '¡Fin de la carrera!';

      // Récord de la máquina
      const elRecord = $('#resultado-record');
      if (datos.esRecord) {
        elRecord.textContent = '¡RÉCORD NUEVO!';
        elRecord.classList.add('nuevo');
      } else {
        elRecord.classList.remove('nuevo');
        elRecord.textContent =
          datos.recordAnterior > 0 ? `Récord a superar: ${datos.recordAnterior}` : '';
      }
    },

    // Récord mostrado en la pantalla de espera.
    actualizarRecordAtraccion(valor) {
      atraccionRecord.textContent = valor > 0 ? `☀ Récord del stand: ${valor}` : '';
    },

    // --------- HUD de partida ---------
    actualizarVidas(cantidad) {
      vidas.textContent = '❤'.repeat(cantidad) + '♡'.repeat(Math.max(0, JUEGO.VIDAS - cantidad));
    },

    actualizarPuntaje(valor) {
      const redondeado = Math.floor(valor);
      if (redondeado !== ultimoPuntaje) {
        ultimoPuntaje = redondeado;
        puntaje.textContent = String(redondeado);
      }
    },

    // `pop` da el golpecito de escala al juntar un sol.
    actualizarSoles(cantidad, pop = false) {
      soles.textContent = `☀ ${cantidad}`;
      if (!pop) return;
      soles.classList.add('pop');
      clearTimeout(temporizadorPop);
      temporizadorPop = setTimeout(() => soles.classList.remove('pop'), 120);
    },

    actualizarRacha(valor) {
      racha.textContent = valor >= 2 ? `racha ×${valor}` : '';
    },

    // Nombre del tramo actual, bajo las vidas.
    actualizarNivel(nombre) {
      nivel.textContent = nombre;
    },

    // --------- Trivia ---------
    mostrarPregunta(texto) {
      pregunta.textContent = texto;
      pregunta.classList.remove('oculto');
    },

    ocultarPregunta() {
      pregunta.classList.add('oculto');
    },

    // tipo: 'ok' | 'error' | 'neutro'
    mostrarFeedback(tipo, titulo, dato) {
      feedback.className = `feedback-${tipo}`;
      feedback.innerHTML = '';
      const t = document.createElement('strong');
      t.textContent = titulo;
      feedback.append(t);
      if (dato) {
        const d = document.createElement('span');
        d.textContent = dato;
        feedback.append(d);
      }
    },

    ocultarFeedback() {
      feedback.classList.add('oculto');
    },

    // Festejo argento: placa dorada que aparece y se va sola (animación CSS).
    mostrarFrase(texto) {
      frase.textContent = texto;
      frase.classList.remove('animar');
      void frase.offsetWidth; // reinicia la animación CSS
      frase.classList.add('animar');
    },

    // Viñeta roja al recibir un golpe.
    destellarDano() {
      flashDano.classList.remove('animar');
      void flashDano.offsetWidth;
      flashDano.classList.add('animar');
    },
  };
}
