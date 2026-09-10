// hud3d.js — el HUD para realidad virtual, como paneles 3D.
//
// Implementa EXACTAMENTE la misma interfaz que hud.js (los 16 métodos que
// llama main.js), así que el juego no sabe cuál de los dos está usando.
// Eso es lo que permite agregar VR sin tocar la lógica del juego: en
// pantalla plana sigue andando el HUD de siempre en DOM, y sólo mientras
// hay sesión inmersiva se enrutan las mismas llamadas hacia acá.
//
// Los paneles se cuelgan del RIG del jugador, no de la cámara. La
// diferencia importa: pegados a la cámara te persiguen la mirada, que en
// VR es incómodo y marea; colgados del rig quedan quietos respecto al
// cuerpo y se miran girando la cabeza, como mirar un tablero.

import * as THREE from 'three';
import { JUEGO } from './config.js';
import { crearPlaca3d, COLORES_PANEL } from './panel3d.js';

export function crearHud3d(rig) {
  // --- Paneles ---
  // Estado: vidas, puntaje, soles y tramo. Arriba a la izquierda, ladeado
  // hacia el jugador para que se lea de frente.
  const estado = crearPlaca3d({ ancho: 1.6, alto: 0.8 });
  estado.malla.position.set(-1.5, 2.05, -2.6);
  estado.malla.rotation.y = 0.45;

  // Insignias de power-up, debajo del estado.
  const insignias = crearPlaca3d({ ancho: 1.6, alto: 0.28 });
  insignias.malla.position.set(-1.5, 1.5, -2.6);
  insignias.malla.rotation.y = 0.45;

  // Enunciado de la pregunta y feedback: adelante y arriba, sobre el portal.
  const aviso = crearPlaca3d({ ancho: 3.2, alto: 1.1 });
  aviso.malla.position.set(0, 2.7, -4.2);

  // Festejos: más cerca y al centro, aparecen y se van.
  const frase = crearPlaca3d({ ancho: 2.6, alto: 0.5 });
  frase.malla.position.set(0, 1.25, -3.0);

  // Pantalla grande de sistema: espera, resultado y calibración.
  const pantalla = crearPlaca3d({ ancho: 3.0, alto: 2.0 });
  pantalla.malla.position.set(0, 1.8, -3.6);

  const todos = [estado, insignias, aviso, frase, pantalla];
  for (const p of todos) rig.add(p.malla);

  // --- Estado que hay que recordar para redibujar los paneles ---
  // El HUD en DOM tiene un elemento por dato; acá varios datos comparten
  // un panel, así que hay que conservarlos para repintar el conjunto.
  const datos = { vidas: JUEGO.VIDAS, puntaje: 0, soles: 0, racha: 0, nivel: '' };
  let temporizadorFrase = null;

  function pintarEstado() {
    const corazones = '❤'.repeat(datos.vidas) + '♡'.repeat(Math.max(0, JUEGO.VIDAS - datos.vidas));
    estado.escribir(
      [
        { texto: corazones, color: COLORES_PANEL.error, escala: 0.85 },
        {
          texto: `${Math.floor(datos.puntaje)}   ☀ ${datos.soles}${datos.racha >= 2 ? `   ×${datos.racha}` : ''}`,
          color: COLORES_PANEL.dorado,
          escala: 0.8,
        },
        ...(datos.nivel ? [{ texto: datos.nivel, escala: 0.5, peso: 700 }] : []),
      ],
      { borde: 'izquierda' },
    );
  }

  function ocultar(...paneles) {
    for (const p of paneles) p.malla.visible = false;
  }

  return {
    // Se llama al entrar y salir de VR.
    activar(valor) {
      if (!valor) for (const p of todos) p.malla.visible = false;
      // Al reactivarse hay que forzar el redibujo: la textura sigue en la
      // GPU, pero el contenido pudo cambiar mientras el HUD estuvo apagado.
      else for (const p of todos) p.invalidar();
    },

    // --------- Pantallas ---------
    mostrarAtraccion() {
      ocultar(estado, insignias, aviso, frase);
      pantalla.malla.visible = true;
      const record = (() => {
        try {
          return Number(localStorage.getItem(JUEGO.CLAVE_RECORD)) || 0;
        } catch {
          return 0;
        }
      })();
      pantalla.escribir([
        { texto: 'MIGUE RUNNER', escala: 1.1 },
        { texto: 'Una carrera por Tucumán', color: COLORES_PANEL.celeste, escala: 0.55, peso: 700 },
        ...(record > 0
          ? [{ texto: `☀ Récord: ${record}`, color: COLORES_PANEL.dorado, escala: 0.55 }]
          : []),
        { texto: 'Gatillo o A: jugás con MIGUE', escala: 0.45, peso: 700 },
        { texto: 'Grip o B: jugás con CHANBACHI', escala: 0.45, peso: 700 },
      ]);
    },

    mostrarJuego() {
      ocultar(pantalla, aviso, frase);
      estado.malla.visible = true;
      pintarEstado();
    },

    mostrarResultado(d) {
      ocultar(estado, insignias, aviso, frase);
      pantalla.malla.visible = true;
      const puntaje = Math.floor(d.puntaje);
      const mensaje = JUEGO.MENSAJES.find((m) => puntaje >= m.desde);
      pantalla.escribir([
        { texto: mensaje?.texto ?? '¡Fin de la carrera!', color: COLORES_PANEL.celeste, escala: 0.7 },
        { texto: String(puntaje), color: COLORES_PANEL.dorado, escala: 1.6 },
        ...(d.esRecord
          ? [{ texto: '¡RÉCORD NUEVO!', color: COLORES_PANEL.dorado, escala: 0.55 }]
          : []),
        {
          texto: `Trivia ${d.aciertos}/${d.totalPreguntas}   ☀ ${d.soles}   ${Math.round(d.distancia)} m`,
          escala: 0.45,
          peso: 700,
        },
        { texto: 'Apretá un botón para volver a jugar', escala: 0.4, peso: 500 },
      ]);
    },

    actualizarRecordAtraccion() {
      // El récord se pinta dentro de mostrarAtraccion(): no hace falta un
      // panel aparte como en el HUD de pantalla plana.
    },

    // --------- HUD de partida ---------
    actualizarVidas(cantidad) {
      datos.vidas = cantidad;
      pintarEstado();
    },

    actualizarPuntaje(valor) {
      datos.puntaje = valor;
      pintarEstado(); // pintar() ignora el redibujo si el texto no cambió
    },

    actualizarSoles(cantidad) {
      datos.soles = cantidad;
      pintarEstado();
    },

    actualizarRacha(valor) {
      datos.racha = valor;
      pintarEstado();
    },

    actualizarNivel(nombre) {
      datos.nivel = nombre;
      pintarEstado();
    },

    actualizarEstados(partida) {
      const partes = [];
      if (partida.patineta) partes.push('PATINETA ×2');
      if (partida.inmunidad > 0) partes.push(`INMUNE ${Math.ceil(partida.inmunidad)}s`);
      if (partes.length === 0) {
        insignias.malla.visible = false;
        return;
      }
      insignias.malla.visible = true;
      insignias.escribir(
        [{ texto: partes.join('  ·  '), color: COLORES_PANEL.dorado, escala: 0.75 }],
        { borde: 'ninguno' },
      );
    },

    // --------- Trivia ---------
    mostrarPregunta(texto) {
      aviso.malla.visible = true;
      aviso.escribir([{ texto, escala: 0.62, peso: 700 }]);
    },

    ocultarPregunta() {
      aviso.malla.visible = false;
    },

    mostrarFeedback(tipo, titulo, dato) {
      aviso.malla.visible = true;
      const color =
        tipo === 'ok' ? COLORES_PANEL.ok : tipo === 'error' ? COLORES_PANEL.error : COLORES_PANEL.celeste;
      aviso.escribir(
        [
          { texto: titulo, color, escala: 0.62 },
          ...(dato ? [{ texto: dato, escala: 0.42, peso: 500 }] : []),
        ],
        { colorBorde: color },
      );
    },

    ocultarFeedback() {
      aviso.malla.visible = false;
    },

    mostrarFrase(texto) {
      frase.malla.visible = true;
      frase.escribir([{ texto, color: COLORES_PANEL.dorado, escala: 0.8 }], { borde: 'ninguno' });
      clearTimeout(temporizadorFrase);
      temporizadorFrase = setTimeout(() => {
        frase.malla.visible = false;
      }, 2000);
    },

    // En VR no hay viñeta de daño a pantalla completa: un destello que
    // ocupa todo el campo visual es justo lo que provoca malestar. El
    // golpe se comunica con el sonido y las partículas, que ya existen.
    destellarDano() {},
  };
}
