// config.js — TODAS las constantes de tuneo del juego viven acá.
// Regla del proyecto: ningún número que afecte la jugabilidad va inline en otro módulo.

export const ENTRADA = {
  // Tiempo mínimo entre dos pulsaciones válidas de la misma acción.
  // Los punteros presentadores emiten auto-repeat si se mantiene apretado.
  DEBOUNCE_MS: 150,

  // Clave de localStorage donde se persiste la calibración del puntero.
  CLAVE_STORAGE: 'migue.controles',

  // Teclado físico como respaldo, en paralelo al puntero calibrado.
  RESPALDO_TECLADO: {
    saltar: ['Space', 'ArrowUp'],
    agacharse: ['ShiftLeft', 'ArrowDown'],
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
// Paleta (espejo de los tokens CSS + colores del centro urbano, en hexa).
// ⚠️ Propuesta de trabajo: validar contra el manual de marca antes de producción.
// ---------------------------------------------------------------------------
export const PALETA = {
  // Cielo y fondo
  CIELO_ALTO: 0x7fb6d9,
  CIELO_BAJO: 0xf0d9a8, // horizonte cálido, luz de siesta
  CERRO_LEJOS: 0x6e7fa0,
  CERRO_MEDIO: 0x5d7385,
  CERRO_CERCA: 0x4e6b58, // verde de las yungas
  SOL: 0xffd75e,
  NUBE: 0xfdf4e3,
  NIEBLA: 0xead9b0,
  LUZ_CALIDA: 0xffe3b3,
  LUZ_FRIA: 0xbfd8e8,

  // Calle
  BALDOSA: 0xd9cfc0, // baldosa clara de la peatonal
  BALDOSA_GUARDA: 0xb35a4a, // guarda roja central
  BALDOSA_LINEA: 0xb9ad9c, // juntas entre baldosas
  BASE_URBANA: 0xa9a396, // suelo neutro bajo los edificios

  // Edificios coloniales (pasteles)
  PASTELES: [0xf2e3c9, 0xe8b4a0, 0xbcd6e0, 0xe9d68a, 0xd9b8c4, 0xcfd8c9],
  CORNISA: 0xfaf6ec,
  PUERTA: 0x4a3527,
  VENTANA: 0x35464f,

  // Casa Histórica
  BLANCO_COLONIAL: 0xf5f1e6,
  TEJA: 0xa85a40,
  VERDE_COLONIAL: 0x2e4a3a,
  PIEDRA_PORTAL: 0xe4dbc4,

  // Catedral
  CREMA_CATEDRAL: 0xf0e6cd,
  CUPULA: 0x7f9bb3,
  DORADO: 0xc8a951,

  // Mobiliario urbano
  FAROL_POSTE: 0x2f4f3f,
  FAROL_LUZ: 0xffe9b0,
  LAPACHO_TRONCO: 0x6b4a34,
  LAPACHO_FLOR: 0xf2a9d4, // rosa lapacho

  // Obstáculos
  VALLA_NARANJA: 0xe0762e,
  VALLA_BLANCO: 0xf7f9fb,
  CARTEL_POSTE: 0x51606d,
  PORTAL_MARCO: 0x4fa3d1, // celeste institucional (se multiplica para el glow)
};

export const MUNDO = {
  // Velocidades de scroll en unidades/segundo.
  VELOCIDAD_INICIAL: 8,
  VELOCIDAD_MAX: 15,
  ACELERACION: 0.06, // unidades/s² (crecimiento suave y continuo)
  VELOCIDAD_ATRACCION: 2.5, // paseo lento en la pantalla de espera

  // Densidad de la FogExp2: oculta el borde donde aparece el decorado.
  NIEBLA_DENSIDAD: 0.006,

  // Suelo
  SUELO_ANCHO: 90,
  SUELO_LARGO: 420,
  PEATONAL_ANCHO: 9.6, // ancho de la peatonal (los edificios arrancan al borde)

  // Edificios: dos bandas que se turnan (leapfrog) al reciclarse.
  // Cada banda es UNA malla fusionada (casas + faroles + lapachos).
  EDIFICIO_FRENTE_X: 5.4, // línea de fachadas (desde el centro de la calle)
  BANDA_LARGO: 130, // largo en Z de cada banda
  FAROL_CADA: 22, // separación en Z entre faroles
  LAPACHO_CADA: 26, // separación en Z entre lapachos

  // Lomas intermedias (parallax en movimiento, asoman sobre los techos)
  LOMAS_CANTIDAD: 8,
  LOMAS_FACTOR_VELOCIDAD: 0.45,
  LOMAS_LARGO_CICLO: 360,
  LOMAS_X_MIN: 30,
  LOMAS_X_MAX: 60,

  // Nubes decorativas
  NUBES_CANTIDAD: 6,
  NUBES_DERIVA: 0.6,
};

export const CAMARA = {
  FOV: 55,
  POSICION: { x: 0, y: 2.2, z: 4.2 },
  MIRA: { x: 0, y: 1.2, z: -6 },
};

export const JUGADOR = {
  // Alturas visuales de cada personaje en unidades de mundo.
  // La hitbox de juego es la misma para los dos: elegir es gusto, no ventaja.
  ALTURA_MIGUE: 1.8,
  ALTURA_CHANBACHI: 1.3,

  // Los modelos no traen animaciones: la carrera se simula procedural.
  // La frecuencia del paso escala con la velocidad del mundo.
  BOB_FRECUENCIA_BASE: 7,
  BOB_FRECUENCIA_POR_VELOCIDAD: 0.28,
  BOB_AMPLITUD: 0.08,
  BOB_BALANCEO: 0.05, // balanceo lateral en radianes
  BOB_CABECEO: 0.035, // cabeceo adelante/atrás por zancada, en radianes
  INCLINACION: 0.14, // inclinación fija hacia adelante (actitud de correr)

  // Salto: squash & stretch y lean en el aire
  SALTO_ESTIRAMIENTO: 1.07, // estirado subiendo
  SALTO_LEAN: 0.022, // rota según velocidad vertical (atrás subiendo, adelante cayendo)
  ATERRIZAJE_SQUASH: 0.86, // aplastamiento al tocar el suelo
  ATERRIZAJE_S: 0.14, // cuánto dura el squash

  // Respiración del modo idle (pantalla de atracción)
  IDLE_FRECUENCIA: 1.4,
  IDLE_AMPLITUD: 0.02,

  // Hitbox propia, más chica que el modelo: perdonar se siente mejor.
  HITBOX: {
    ALTO: 1.5,
    ALTO_AGACHADO: 0.85,
    PROFUNDO: 0.5,
  },
};

export const SALTO = {
  VELOCIDAD_INICIAL: 5.6, // hacia arriba, unidades/s
  GRAVEDAD: 18, // unidades/s² → ~0.62 s de aire, ~0.87 de altura
};

export const AGACHADA = {
  MIN_S: 0.4, // dura al menos esto aunque se suelte antes
  ESCALA_Y: 0.55, // achatamiento visual del modelo
  ENSANCHE: 1.18, // se ensancha al agacharse (squash creíble)
  INCLINACION_EXTRA: 0.38, // se inclina hacia adelante, actitud de barrida
  VELOCIDAD_TRANSICION: 12, // qué tan rápido se interpola la pose
};

export const OBSTACULOS = {
  Z_SPAWN: -170, // dónde nacen (la niebla tapa el borde)
  Z_FUERA: 10, // pasada esta z quedan atrás y se reciclan
  INTERVALO_MIN_S: 1.9, // separación temporal entre obstáculos
  INTERVALO_MAX_S: 3.2,
  REACCION_MIN_S: 1.2, // ningún obstáculo puede quedar a menos de esto del jugador
  INVULNERABLE_S: 1.3, // tras un golpe, ventana sin daño (parpadeo)

  // Bajo: valla municipal (se salta)
  VALLA: { ANCHO: 2.6, ALTO: 0.62, PROFUNDO: 0.25 },

  // Alto: cartel colgante entre postes (se pasa agachado)
  CARTEL: { ALTO_LIBRE: 1.35, PANEL_ALTO: 1.0, ANCHO: 3.6, PROFUNDO: 0.15 },
};

export const TRIVIA = {
  INTERVALO_S: 14, // cada cuánto aparece un portal de pregunta
  AVISO_S: 3.2, // el enunciado se lee este tiempo antes de llegar al portal
  DATO_S: 2.6, // cuánto queda en pantalla el dato posterior (corto: no tapar)
  SUPRESION_OBSTACULOS_S: 2.5, // sin obstáculos nuevos alrededor del portal
  DESPEJE_POST_CRUCE_S: 2.2, // tras responder, se despeja lo que llegaría enseguida

  PUNTOS_ACIERTO: 100,
  BONO_RACHA: 25, // puntos extra por acierto consecutivo (x racha)

  // Mezcla objetivo por partida
  MEZCLA: { 'san-miguel': 0.5, tucuman: 0.3, general: 0.2 },

  // Altura del portal: opción de arriba se cruza saltando, la de abajo agachado.
  UMBRAL_AIRE_Y: 0.35, // por encima de esta altura el cruce cuenta como "arriba"
};

export const JUEGO = {
  VIDAS: 3,
  PUNTOS_POR_METRO: 1,
  RESULTADO_VOLVER_S: 15, // vuelve solo a la atracción (stand desatendido)
  RESULTADO_BLOQUEO_S: 1.2, // ignora botones apenas termina (evita saltearla sin querer)
};

export const AUDIO = {
  VOLUMEN_MUSICA: 0.4,
  VOLUMEN_EFECTOS: 0.25, // blips sintetizados con WebAudio (sin assets)
};

export const FRASES = {
  // Festejos argentos: aparecen al acertar trivia y cada tantos obstáculos.
  LISTA: [
    '¡Buena changoooo!',
    '¡Sos capo, che!',
    '¡Alto player, amigooo!',
    '¡Metele que va!',
    '¡Qué crack, papá!',
    '¡Ídolo total!',
    '¡La rompés toda!',
    '¡Sos de otro planeta, che!',
  ],
  CADA_ESQUIVADOS: 12, // un festejo cada tantos obstáculos esquivados
  DURACION_S: 2,
};

export const LUCES = {
  // Sin tone mapping (para preservar la paleta plana), la suma de luces
  // sobre una cara horizontal debe rondar 1.0 para no recortar el color.
  CALIDA_INTENSIDAD: 0.95,
  FRIA_INTENSIDAD: 0.55,
};

export const POST = {
  BLOOM_FUERZA: 0.35,
  BLOOM_RADIO: 0.5,
  // Umbral 1.0: solo florecen los materiales con color fuera de rango
  // (el sol, el marco de los portales); el resto queda limpio.
  BLOOM_UMBRAL: 1.0,
};

export const RENDER = {
  // Techo de devicePixelRatio: en proyectores 1080p no hace falta más,
  // y protege los 60 fps en gráficos integrados.
  MAX_PIXEL_RATIO: 1.5,
  MSAA_MUESTRAS: 4,
};
