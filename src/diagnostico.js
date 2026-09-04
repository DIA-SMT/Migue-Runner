// diagnostico.js — Fase 1: diagnóstico de entrada (página /test-entrada.html).
//
// Imprime en pantalla el `event.code` de cada tecla que llega, venga del
// teclado físico o del puntero presentador USB (que se enumera como teclado
// HID genérico). Sirve para probar el puntero real y anotar qué códigos
// emite cada botón, insumo de la calibración de la Fase 2.
//
// Muestra keydown Y keyup con la duración de cada pulsación, porque de eso
// depende que la agachada del juego se sienta bien: hay punteros que sueltan
// el keyup al instante (pulso) en vez de mantener el botón apretado. Si son
// pulsos, la agachada dura el mínimo de AGACHADA.MIN_S y no se puede
// sostener; conviene saberlo antes del evento, no durante.

import { DIAGNOSTICO, AGACHADA } from './config.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="diagnostico">
    <h1>Migue Runner — Test de entrada</h1>
    <p class="instruccion">
      Apretá cada botón del puntero y anotá el código. Probá también
      <b>mantener</b> un botón apretado un segundo, para ver si el puntero
      sostiene la pulsación o la suelta al instante.
    </p>
    <div class="codigo-actual" id="codigo-actual">&nbsp;</div>
    <p class="detalle" id="detalle"></p>
    <p class="detalle" id="apretados"></p>
    <ul class="historial" id="historial"></ul>
    <p class="codigos-vistos" id="codigos-vistos"></p>
    <p class="veredicto" id="veredicto"></p>
  </main>
`;

const elCodigo = document.querySelector('#codigo-actual');
const elDetalle = document.querySelector('#detalle');
const elApretados = document.querySelector('#apretados');
const elHistorial = document.querySelector('#historial');
const elVistos = document.querySelector('#codigos-vistos');
const elVeredicto = document.querySelector('#veredicto');

// Conteo de cada event.code distinto que llegó en la sesión.
const codigosVistos = new Map();
// code → timestamp del keydown, para medir cuánto duró la pulsación.
const apretadosDesde = new Map();
// Duraciones medidas por código, para el veredicto final.
const duraciones = new Map();
let ultimoTimestamp = null;

function pintarApretados() {
  const lista = [...apretadosDesde.keys()];
  elApretados.textContent = lista.length > 0 ? `Apretado ahora: ${lista.join(' + ')}` : '';
}

function agregarAlHistorial(texto, atenuado) {
  const item = document.createElement('li');
  item.textContent = texto;
  if (atenuado) item.classList.add('repetida');
  elHistorial.append(item);
  while (elHistorial.children.length > DIAGNOSTICO.MAX_EVENTOS_HISTORIAL) {
    elHistorial.firstChild.remove();
  }
}

// Veredicto: ¿el puntero sostiene la pulsación o manda pulsos?
function pintarVeredicto() {
  if (duraciones.size === 0) return;
  const masLarga = Math.max(...[...duraciones.values()].map((d) => d.max));
  const minimoMs = AGACHADA.MIN_S * 1000;
  if (masLarga >= minimoMs) {
    elVeredicto.className = 'veredicto ok';
    elVeredicto.textContent =
      `Pulsación más larga: ${Math.round(masLarga)} ms. El puntero sostiene el botón: ` +
      `la agachada se va a poder mantener.`;
  } else {
    elVeredicto.className = 'veredicto aviso';
    elVeredicto.textContent =
      `Pulsación más larga: ${Math.round(masLarga)} ms. El puntero manda pulsos cortos: ` +
      `la agachada va a durar el mínimo fijo de ${minimoMs} ms. Igual es jugable.`;
  }
}

function registrarKeydown(evento) {
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

  agregarAlHistorial(
    `▼ ${evento.code}${evento.repeat ? ' (repeat)' : ''}${delta !== null ? ` — Δ ${delta} ms` : ''}`,
    evento.repeat,
  );

  // El auto-repeat no reinicia el cronómetro de la pulsación.
  if (!evento.repeat) {
    apretadosDesde.set(evento.code, ahora);
    codigosVistos.set(evento.code, (codigosVistos.get(evento.code) ?? 0) + 1);
  }
  pintarApretados();

  elVistos.textContent =
    'Códigos vistos: ' +
    [...codigosVistos.entries()].map(([codigo, veces]) => `${codigo} ×${veces}`).join('  ·  ');
}

function registrarKeyup(evento) {
  const inicio = apretadosDesde.get(evento.code);
  apretadosDesde.delete(evento.code);
  pintarApretados();

  if (inicio === undefined) {
    // keyup sin keydown previo: el puntero soltó algo que nunca apretó.
    agregarAlHistorial(`▲ ${evento.code} — (sin keydown previo)`, true);
    return;
  }

  const duracion = performance.now() - inicio;
  agregarAlHistorial(`▲ ${evento.code} — mantenido ${Math.round(duracion)} ms`, false);

  const registro = duraciones.get(evento.code) ?? { max: 0 };
  registro.max = Math.max(registro.max, duracion);
  duraciones.set(evento.code, registro);
  pintarVeredicto();
}

// Se escucha en window, no en el canvas: el canvas no siempre tiene foco.
window.addEventListener('keydown', (evento) => {
  // F12 queda libre para abrir devtools durante el desarrollo.
  if (evento.code !== 'F12') evento.preventDefault();
  registrarKeydown(evento);
});

window.addEventListener('keyup', (evento) => {
  // Se anula el default también en keyup: algunos punteros disparan
  // acciones del navegador ahí.
  if (evento.code !== 'F12') evento.preventDefault();
  registrarKeyup(evento);
});
