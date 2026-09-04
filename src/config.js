// config.js — TODAS las constantes de tuneo del juego viven acá.
// Regla del proyecto: ningún número que afecte la jugabilidad va inline en otro módulo.

export const ENTRADA = {
  // Tiempo mínimo entre dos pulsaciones válidas del mismo botón.
  // Los punteros presentadores emiten auto-repeat si se mantiene apretado.
  DEBOUNCE_MS: 150,

  // Clave de localStorage donde se persiste la calibración del puntero.
  CLAVE_STORAGE: 'migue.controles',

  // Teclado físico como respaldo, en paralelo al puntero calibrado.
  RESPALDO_TECLADO: {
    saltar: 'Space',
    agacharse: 'ShiftLeft',
  },

  // Recalibración: tecla física, o mantener ambos botones del puntero.
  RECALIBRAR_TECLA: 'KeyC',
  RECALIBRAR_MANTENER_MS: 3000,
};

export const DIAGNOSTICO = {
  // Cantidad de eventos que se muestran en el historial de la página de test.
  MAX_EVENTOS_HISTORIAL: 12,
};

// ---------------------------------------------------------------------------
// Paleta del ambiente 3D (espejo de los tokens CSS, en hexa numérico).
// ⚠️ Propuesta de trabajo: validar contra el manual de marca antes de producción.
// ---------------------------------------------------------------------------
export const PALETA = {
  CIELO_ALTO: 0x7fb6d9,
  CIELO_BAJO: 0xf0d9a8, // horizonte cálido, luz de siesta
  CERRO_LEJOS: 0x6e7fa0,
  CERRO_MEDIO: 0x5d7385, // intermedio entre lejos y cerca, para la 2ª capa
  CERRO_CERCA: 0x4e6b58, // verde de las yungas
  TIERRA: 0xa8724a,
  TIERRA_OSCURA: 0x8a5c3b, // borde del sendero
  CAMPO: 0x7da05a, // verde de los campos a los costados
  CANA_TALLO: 0x8fae5a, // caña de azúcar: tallo
  CANA_HOJA: 0x5c8a4b, // caña de azúcar: hojas
  SOL: 0xffd75e,
  NUBE: 0xfdf4e3,
  NIEBLA: 0xead9b0, // color de la FogExp2, tono del horizonte
  LUZ_CALIDA: 0xffe3b3, // DirectionalLight (sol de la siesta)
  LUZ_FRIA: 0xbfd8e8, // AmbientLight de relleno
};

export const MUNDO = {
  // Velocidad de scroll del mundo en unidades/segundo (la de arranque del juego).
  VELOCIDAD: 8,

  // Densidad de la FogExp2: oculta el borde donde aparece el decorado.
  NIEBLA_DENSIDAD: 0.006,

  // Suelo
  SUELO_ANCHO: 90,
  SUELO_LARGO: 420,
  SENDERO_ANCHO: 3, // ancho del sendero de tierra, en unidades de mundo

  // Cañaverales: dos bandas por lado que se turnan (leapfrog) al reciclarse.
  // Cada instancia es una mata (varios tallos), no una caña suelta.
  CANA_LARGO_BANDA: 120, // largo en Z de cada banda
  CANA_POR_BANDA: 110, // matas por banda
  CANA_DISTANCIA_X: 3.4, // distancia mínima del centro del sendero
  CANA_ANCHO_BANDA_X: 9, // dispersión en X de cada banda
  CANA_ALTURA: 2.6, // altura media de una mata

  // Lomas intermedias (capa de parallax que sí se mueve, a media velocidad)
  LOMAS_CANTIDAD: 8,
  LOMAS_FACTOR_VELOCIDAD: 0.45,
  LOMAS_LARGO_CICLO: 360, // recorrido en Z antes de reciclarse
  LOMAS_X_MIN: 16, // qué tan lejos del sendero aparecen
  LOMAS_X_MAX: 55,

  // Nubes decorativas
  NUBES_CANTIDAD: 6,
  NUBES_DERIVA: 0.6, // deriva lateral en unidades/segundo
};

export const CAMARA = {
  FOV: 55,
  POSICION: { x: 0, y: 2.2, z: 4.2 },
  MIRA: { x: 0, y: 1.2, z: -6 }, // punto al que mira, delante de Migue
};

export const JUGADOR = {
  ALTURA: 1.8, // altura objetivo de Migue en unidades de mundo

  // El modelo no trae animaciones: se simula la carrera con bobbing procedural.
  BOB_FRECUENCIA: 9, // pasos por segundo (ida y vuelta del seno)
  BOB_AMPLITUD: 0.07, // rebote vertical en unidades
  BOB_BALANCEO: 0.045, // balanceo lateral en radianes
  INCLINACION: 0.12, // inclinación fija hacia adelante en radianes (actitud de correr)
};

export const LUCES = {
  // Sin tone mapping (para preservar la paleta plana), la suma de luces
  // sobre una cara horizontal debe rondar 1.0 para no recortar el color.
  CALIDA_INTENSIDAD: 0.95,
  FRIA_INTENSIDAD: 0.55,
};

export const POST = {
  // Bloom sutil, y nada más (regla de la dirección de arte).
  BLOOM_FUERZA: 0.35,
  BLOOM_RADIO: 0.5,
  // Umbral 1.0: solo florecen los materiales con color fuera de rango
  // (el sol); el resto de la escena queda limpio.
  BLOOM_UMBRAL: 1.0,
};

export const RENDER = {
  // Techo de devicePixelRatio: en proyectores 1080p no hace falta más,
  // y protege los 60 fps en gráficos integrados.
  MAX_PIXEL_RATIO: 1.5,
  // Muestras de antialiasing del render target del composer.
  MSAA_MUESTRAS: 4,
};
