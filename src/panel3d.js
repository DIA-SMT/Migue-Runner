// panel3d.js — placas de texto dibujadas en canvas y mostradas como planos
// 3D. Es la base del HUD de realidad virtual: en una sesión inmersiva el DOM
// no se ve, así que todo lo que en pantalla plana es HTML tiene que existir
// como geometría.
//
// La técnica ya está probada en el proyecto: los paneles del portal de
// trivia y el cartel "SAN MIGUEL" se dibujan igual.
//
// Regla de rendimiento: redibujar un canvas y resubir la textura a la GPU
// cuesta, y el visor pide 90 fps por ojo. Por eso `escribir()` compara con
// lo último que pintó y no hace nada si el texto no cambió.

import * as THREE from 'three';

const COLORES = {
  placa: 'rgba(10, 52, 89, 0.92)',
  borde: '#C8A951',
  texto: '#F7F9FB',
  celeste: '#4FA3D1',
  dorado: '#C8A951',
  ok: '#7fd6a4',
  error: '#e8968e',
};

// Aire entre bloques de texto, como proporción del tamaño del bloque que
// arranca. Es lo que evita que un puntaje gigante se le encime al mensaje
// más chico de arriba.
const ESPACIO_BLOQUE = 0.4;

// Parte un texto en líneas que entren en `anchoMax` píxeles de canvas.
function partirEnLineas(ctx, texto, anchoMax) {
  const palabras = String(texto).split(/\s+/);
  const lineas = [];
  let actual = '';
  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > anchoMax && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

// Crea una placa 3D. `ancho`/`alto` son unidades de mundo; la resolución del
// canvas se deriva de ellas para que la densidad de píxeles sea uniforme
// entre paneles de distinto tamaño.
export function crearPlaca3d({ ancho, alto, pixelesPorUnidad = 320 }) {
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(ancho * pixelesPorUnidad);
  lienzo.height = Math.round(alto * pixelesPorUnidad);
  const ctx = lienzo.getContext('2d');

  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;

  const malla = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho, alto),
    // Sin luces ni niebla: un HUD tiene que leerse igual en cualquier
    // condición de la escena.
    new THREE.MeshBasicMaterial({ map: textura, transparent: true, depthTest: false }),
  );
  // Se dibuja al final, encima de todo: es interfaz, no parte del mundo.
  malla.renderOrder = 100;
  malla.visible = false;

  let ultimoDibujo = '';

  function limpiar() {
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
  }

  function fondoPlaca({ borde = 'abajo', colorBorde = COLORES.borde } = {}) {
    const r = lienzo.height * 0.1;
    ctx.fillStyle = COLORES.placa;
    ctx.beginPath();
    ctx.roundRect(0, 0, lienzo.width, lienzo.height, r);
    ctx.fill();
    if (borde === 'abajo') {
      ctx.fillStyle = colorBorde;
      ctx.fillRect(r, lienzo.height - r * 0.35, lienzo.width - r * 2, r * 0.35);
    } else if (borde === 'izquierda') {
      ctx.fillStyle = colorBorde;
      ctx.fillRect(0, r, r * 0.3, lienzo.height - r * 2);
    }
  }

  return {
    malla,

    // Fuerza el próximo redibujo aunque el contenido no haya cambiado.
    invalidar() {
      ultimoDibujo = '';
    },

    // `dibujar(ctx, ancho, alto, colores)` pinta libremente. `clave`
    // identifica el contenido: si es igual a la última, no se redibuja.
    pintar(clave, dibujar) {
      if (clave === ultimoDibujo) return;
      ultimoDibujo = clave;
      limpiar();
      dibujar(ctx, lienzo.width, lienzo.height, COLORES);
      textura.needsUpdate = true;
    },

    // Texto centrado con placa de fondo y ajuste de línea automático.
    // `partes` es una lista de { texto, color, escala, peso }.
    escribir(partes, { borde = 'abajo', colorBorde, alineado = 'centro' } = {}) {
      const clave = JSON.stringify([partes, borde, colorBorde, alineado]);
      this.pintar(clave, (c, w, h) => {
        fondoPlaca({ borde, colorBorde });

        const margen = w * 0.04;
        const anchoUtil = w - margen * 2;
        const altoUtil = h - margen * 2;
        const base = h * 0.34; // tamaño de referencia del texto

        // Mide el bloque completo con un factor de escala dado. El ajuste
        // de línea depende del tamaño, así que hay que rehacerlo en cada
        // medición: con letra más chica entran más palabras por renglón.
        const medir = (factor) => {
          const bloques = partes.map((p) => {
            const tamano = base * (p.escala ?? 1) * factor;
            c.font = `${p.peso ?? 800} ${tamano}px system-ui, sans-serif`;
            return { ...p, tamano, lineas: partirEnLineas(c, p.texto, anchoUtil) };
          });
          // Al alto de cada bloque se le suma un respiro ANTES (salvo el
          // primero). Sin eso, un bloque grande después de uno chico —el
          // puntaje gigante bajo el mensaje de cierre— se le encima: con
          // textBaseline 'middle', la mitad de arriba de una línea alta
          // invade el renglón anterior.
          const alto = bloques.reduce(
            (suma, b, i) => suma + b.lineas.length * b.tamano * 1.2 + (i > 0 ? b.tamano * ESPACIO_BLOQUE : 0),
            0,
          );
          return { bloques, alto };
        };

        // AUTOAJUSTE: si el contenido no entra en la placa, se reduce todo
        // proporcionalmente hasta que quepa. Sin esto el texto se desborda
        // y se pierde justo lo que hay que leer — el nombre del tramo, las
        // estadísticas del resultado. Converge en dos o tres pasadas.
        let factor = 1;
        let medida = medir(factor);
        for (let i = 0; i < 6 && medida.alto > altoUtil; i++) {
          factor *= (altoUtil / medida.alto) * 0.98;
          medida = medir(factor);
        }
        const { bloques, alto: altoTotal } = medida;

        let y = (h - altoTotal) / 2 + bloques[0].tamano * 0.6;
        c.textBaseline = 'middle';
        for (const [i, b] of bloques.entries()) {
          if (i > 0) y += b.tamano * ESPACIO_BLOQUE;
          c.font = `${b.peso ?? 800} ${b.tamano}px system-ui, sans-serif`;
          c.fillStyle = b.color ?? COLORES.texto;
          for (const linea of b.lineas) {
            if (alineado === 'izquierda') {
              c.textAlign = 'left';
              c.fillText(linea, margen, y);
            } else {
              c.textAlign = 'center';
              c.fillText(linea, w / 2, y);
            }
            y += b.tamano * 1.2;
          }
        }
      });
    },
  };
}

export { COLORES as COLORES_PANEL };
