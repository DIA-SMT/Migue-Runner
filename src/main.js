// main.js — Fase 1: diagnóstico de entrada.
//
// Página que imprime en pantalla el `event.code` de cada tecla que llega,
// venga del teclado físico o del puntero presentador USB (que se enumera
// como teclado HID genérico). Sirve para probar el puntero real y anotar
// qué códigos emite cada botón, insumo de la calibración de la Fase 2.
//
// En las fases siguientes este archivo pasa a ser el bootstrap del juego
// y el diagnóstico se muda a una página aparte.

import { DIAGNOSTICO } from './config.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="diagnostico">
    <h1>Migue Runner — Test de entrada</h1>
    <p class="instruccion">Apretá cada botón del puntero (o del teclado) y anotá el código que aparece.</p>
    <div class="codigo-actual" id="codigo-actual">&nbsp;</div>
    <p class="detalle" id="detalle"></p>
    <ul class="historial" id="historial"></ul>
    <p class="codigos-vistos" id="codigos-vistos"></p>
  </main>
`;

const elCodigo = document.querySelector('#codigo-actual');
const elDetalle = document.querySelector('#detalle');
const elHistorial = document.querySelector('#historial');
const elVistos = document.querySelector('#codigos-vistos');

// Conteo de cada event.code distinto que llegó en la sesión.
const codigosVistos = new Map();
let ultimoTimestamp = null;

function registrarEvento(evento) {
  const ahora = performance.now();
  const delta = ultimoTimestamp === null ? null : Math.round(ahora - ultimoTimestamp);
  ultimoTimestamp = ahora;

  // Código gigante en el centro
  elCodigo.textContent = evento.code || '(sin code)';
  elCodigo.classList.toggle('repetida', evento.repeat);

  // Detalle: key legible, repeat y tiempo desde el evento anterior,
  // para ver a ojo el auto-repeat del puntero y calibrar el debounce.
  const partes = [`key: "${evento.key}"`];
  if (evento.repeat) partes.push('AUTO-REPEAT');
  if (delta !== null) partes.push(`Δ ${delta} ms`);
  elDetalle.textContent = partes.join('  ·  ');

  // Historial corto
  const item = document.createElement('li');
  item.textContent = `${evento.code}${evento.repeat ? ' (repeat)' : ''}${delta !== null ? ` — Δ ${delta} ms` : ''}`;
  if (evento.repeat) item.classList.add('repetida');
  elHistorial.append(item);
  while (elHistorial.children.length > DIAGNOSTICO.MAX_EVENTOS_HISTORIAL) {
    elHistorial.firstChild.remove();
  }

  // Resumen de códigos distintos (los repeat no suman al conteo)
  if (!evento.repeat) {
    codigosVistos.set(evento.code, (codigosVistos.get(evento.code) ?? 0) + 1);
  }
  elVistos.textContent =
    'Códigos vistos: ' +
    [...codigosVistos.entries()].map(([codigo, veces]) => `${codigo} ×${veces}`).join('  ·  ');
}

// Se escucha en window, no en el canvas: el canvas no siempre tiene foco.
window.addEventListener('keydown', (evento) => {
  // F12 queda libre para abrir devtools durante el desarrollo.
  if (evento.code !== 'F12') evento.preventDefault();
  registrarEvento(evento);
});

// keyup no se muestra, pero se anula el default por las dudas
// (algunos punteros disparan acciones del navegador en keyup).
window.addEventListener('keyup', (evento) => {
  if (evento.code !== 'F12') evento.preventDefault();
});
