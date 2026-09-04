// calibracion.js — Fase 2: pantalla de calibración del puntero presentador.
//
// Dos pasos: se pide apretar el botón de SALTAR y después el de AGACHARSE,
// capturando el `event.code` de cada uno. Se persiste en localStorage bajo
// `migue.controles`, así el stand se calibra una sola vez y queda listo.
//
// Decisión de diseño: la calibración NO bloquea el primer arranque, a
// diferencia de lo que planteaba el documento original. Desde que el juego
// también se juega con teclado y con pantalla táctil, una pantalla que exige
// apretar botones físicos dejaría trabado a cualquiera que entre desde el
// celular. Se entra a mano: tecla C, o manteniendo los dos botones del
// puntero 3 segundos (así el operador del stand la abre sin teclado).

import { ENTRADA, CALIBRACION } from './config.js';

const PASOS = [
  { accion: 'saltar', titulo: 'Apretá el botón de SALTAR', icono: '▲' },
  { accion: 'agacharse', titulo: 'Apretá el botón de AGACHARSE', icono: '▼' },
];

export function crearCalibracion({ alGuardar }) {
  const panel = document.querySelector('#pantalla-calibracion');
  const elPaso = document.querySelector('#calibracion-paso');
  const elTitulo = document.querySelector('#calibracion-titulo');
  const elIcono = document.querySelector('#calibracion-icono');
  const elCapturado = document.querySelector('#calibracion-capturado');
  const elAviso = document.querySelector('#calibracion-aviso');

  let activa = false;
  let indicePaso = 0;
  let capturas = {};
  let bloqueadoHasta = 0;

  function pintarPaso() {
    const paso = PASOS[indicePaso];
    elPaso.textContent = `Paso ${indicePaso + 1} de ${PASOS.length}`;
    elTitulo.textContent = paso.titulo;
    elIcono.textContent = paso.icono;
    elCapturado.textContent = '';
    elAviso.textContent = '';
  }

  function avisar(texto) {
    elAviso.textContent = texto;
  }

  function terminar() {
    // Se guarda solo si los dos pasos se completaron.
    try {
      localStorage.setItem(ENTRADA.CLAVE_STORAGE, JSON.stringify(capturas));
    } catch (error) {
      console.error('No se pudo guardar la calibración en localStorage.', error);
    }
    activa = false;
    panel.classList.add('oculto');
    alGuardar?.(capturas);
  }

  function cerrarSinGuardar() {
    activa = false;
    panel.classList.add('oculto');
  }

  // El listener va en fase de captura y detiene la propagación: mientras la
  // calibración está abierta, ninguna tecla llega al juego.
  window.addEventListener(
    'keydown',
    (evento) => {
      if (!activa) return;
      evento.preventDefault();
      evento.stopPropagation();
      if (evento.repeat) return;

      // Escape cancela y deja la configuración anterior intacta.
      if (evento.code === 'Escape') {
        cerrarSinGuardar();
        return;
      }
      if (performance.now() < bloqueadoHasta) return;

      const codigo = evento.code;
      if (CALIBRACION.CODIGOS_PROHIBIDOS.includes(codigo)) {
        avisar(`"${codigo}" está reservado por el navegador. Probá otro botón.`);
        return;
      }
      // Rechazar si ya se usó para la otra acción (el documento lo pide).
      if (Object.values(capturas).includes(codigo)) {
        avisar('Ese botón ya lo usaste. Probá con el otro.');
        return;
      }

      capturas[PASOS[indicePaso].accion] = codigo;
      elCapturado.textContent = codigo;
      elAviso.textContent = ''; // se limpia el rechazo anterior, si hubo
      bloqueadoHasta = performance.now() + CALIBRACION.PAUSA_ENTRE_PASOS_MS;

      indicePaso++;
      if (indicePaso >= PASOS.length) {
        // Un respiro para que se lea el último código capturado.
        setTimeout(terminar, CALIBRACION.PAUSA_ENTRE_PASOS_MS);
      } else {
        setTimeout(pintarPaso, CALIBRACION.PAUSA_ENTRE_PASOS_MS);
      }
    },
    true, // captura: corre antes que los listeners del juego
  );

  return {
    estaActiva: () => activa,

    iniciar() {
      if (activa) return;
      activa = true;
      indicePaso = 0;
      capturas = {};
      bloqueadoHasta = performance.now() + CALIBRACION.PAUSA_ENTRE_PASOS_MS;
      pintarPaso();
      panel.classList.remove('oculto');
    },
  };
}
