// hud.js — HUD en DOM sobre el canvas y pantallas de sistema.
//
// Reglas de legibilidad de proyector: nada por debajo de 32 px en 1080p,
// texto siempre sobre placa (los estilos viven en estilos.css).

import { JUEGO } from './config.js';

const $ = (selector) => document.querySelector(selector);

export function crearHud() {
  const vidas = $('#hud-vidas');
  const puntaje = $('#hud-puntaje');
  const racha = $('#hud-racha');
  const pregunta = $('#hud-pregunta');
  const feedback = $('#hud-feedback');
  const juegoHud = $('#hud');
  const atraccion = $('#pantalla-atraccion');
  const resultado = $('#pantalla-resultado');

  let ultimoPuntaje = -1;

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

    mostrarResultado(datos) {
      atraccion.classList.add('oculto');
      resultado.classList.remove('oculto');
      juegoHud.classList.add('oculto');
      pregunta.classList.add('oculto');
      feedback.classList.add('oculto');
      $('#resultado-puntaje').textContent = String(datos.puntaje);
      $('#resultado-aciertos').textContent = `${datos.aciertos} / ${datos.totalPreguntas}`;
      $('#resultado-distancia').textContent = `${Math.round(datos.distancia)} m`;
      $('#resultado-tiempo').textContent = `${Math.round(datos.tiempo)} s`;
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

    actualizarRacha(valor) {
      racha.textContent = valor >= 2 ? `racha ×${valor}` : '';
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
  };
}
