// config.js — TODAS las constantes de tuneo del juego viven acá.
// Regla del proyecto: ningún número que afecte la jugabilidad va inline en otro módulo.

export const ENTRADA = {
  // Tiempo mínimo entre dos pulsaciones válidas de la misma acción.
  // Los punteros presentadores emiten auto-repeat si se mantiene apretado.
  DEBOUNCE_MS: 150,

  // Clave de localStorage donde se persiste la calibración del puntero.
  CLAVE_STORAGE: 'migue.controles',

  // Códigos que funcionan siempre, sin calibrar nada. Incluye el teclado
  // físico (para desarrollo y por si el puntero falla en vivo) y los
  // códigos del puntero del municipio, medidos con el dispositivo real:
  // botón adelante → ArrowRight, botón atrás → ArrowLeft.
  //
  // Tenerlos acá y no solo en la calibración importa: el stand anda al
  // instante en cualquier máquina, aunque se borre el localStorage o se
  // abra en una ventana privada. La calibración sigue disponible para
  // cualquier otro puntero que emita códigos distintos.
  RESPALDO_TECLADO: {
    saltar: ['Space', 'ArrowUp', 'ArrowRight'],
    agacharse: ['ShiftLeft', 'ArrowDown', 'ArrowLeft'],
  },

  // Recalibración: tecla física, o mantener ambos botones del puntero.
  RECALIBRAR_TECLA: 'KeyC',
  RECALIBRAR_MANTENER_MS: 3000,
};

export const DIAGNOSTICO = {
  // Cantidad de eventos que se muestran en el historial de la página de test.
  MAX_EVENTOS_HISTORIAL: 12,
};

export const CALIBRACION = {
  // Códigos que NO se aceptan como botón del juego: son teclas de sistema
  // o del navegador que romperían la experiencia del stand si se mapean.
  CODIGOS_PROHIBIDOS: ['F5', 'F11', 'F12', 'Escape', 'Tab', 'MetaLeft', 'MetaRight'],
  // Tras capturar un botón, se ignora todo por este lapso: los punteros
  // sueltan varios eventos por pulsación y ambos pasos se saltearían solos.
  PAUSA_ENTRE_PASOS_MS: 700,
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

  // Obstáculos temáticos (feria y comercio del centro)
  MADERA: 0x8a5f3c,
  MADERA_CLARA: 0xb08355,
  HIERRO: 0x3a4750,
  MANTEL: 0xc0453b,
  EMPANADA: 0xdba85e, // dorado de empanada tucumana recién frita
  EMPANADA_TOSTADA: 0xc08a42, // repulgue más dorado
  CANASTA: 0xa9762f,
  FRUTA_A: 0xd9772e, // naranjas
  FRUTA_B: 0x8fae3f, // verduras
  BANDERIN_A: 0x6cb7e0, // celeste patrio
  BANDERIN_B: 0xf7f9fb, // blanco patrio
  TOLDO_A: 0xc0453b,
  TOLDO_B: 0xf2e3c9,

  // Power-ups
  PATINETA_TABLA: 0xe0762e, // naranja municipal, se ve desde lejos
  PATINETA_LIJA: 0x2f353a,
  PATINETA_RUEDA: 0xf7f9fb,
  HALO_INMUNE: 0xffd75e, // halo dorado de la empanada
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

  // Z de retiro, distinta por clase. La cámara está en z≈4.2:
  //  - Los BAJOS pueden seguir de largo: son bajos y salen por el borde
  //    inferior de la pantalla, que es lo que se espera al pasarlos.
  //  - Los ALTOS tienen que irse antes de llegar a la cámara. Un toldo de
  //    3.8 de ancho atravesándola tapa media pantalla justo cuando el
  //    jugador necesita ver lo que viene.
  Z_FUERA_BAJO: 10,
  Z_FUERA_ALTO: 2,

  REACCION_MIN_S: 1.2, // ningún obstáculo puede quedar a menos de esto del jugador
  INVULNERABLE_S: 1.3, // tras un golpe, ventana sin daño (parpadeo)

  // Instancias por tipo en el pool. Nunca se crean mallas en caliente; las
  // inactivas no cuestan draw calls y la geometría se comparte entre las
  // instancias de un mismo tipo, así que sobran barato.
  //
  // El peor caso es el nivel 0, que tiene un solo tipo habilitado: a la
  // velocidad inicial un obstáculo tarda Z_SPAWN/v ≈ 21 s en cruzar la
  // pista, y con el intervalo mínimo de ese nivel eso da ~9 vallas en
  // vuelo a la vez. 12 deja aire.
  POOL_POR_TIPO: 12,

  // --- Catálogo de obstáculos ---
  // clase 'bajo': se salta. ALTO tiene que quedar por debajo de la altura
  //   del salto (SALTO.VELOCIDAD_INICIAL² / 2·GRAVEDAD ≈ 0.87) con margen.
  // clase 'alto': se pasa agachado. ALTO_LIBRE tiene que superar la hitbox
  //   agachada (JUGADOR.HITBOX.ALTO_AGACHADO = 0.85) con margen.
  // Los tipos están de más fácil a más difícil dentro de cada clase.
  TIPOS: {
    valla: { clase: 'bajo', ANCHO: 2.6, ALTO: 0.62, PROFUNDO: 0.25 },
    cajones: { clase: 'bajo', ANCHO: 2.2, ALTO: 0.55, PROFUNDO: 0.5 },
    empanadas: { clase: 'bajo', ANCHO: 2.4, ALTO: 0.72, PROFUNDO: 0.55 },
    banco: { clase: 'bajo', ANCHO: 2.8, ALTO: 0.68, PROFUNDO: 0.5 },
    cartel: { clase: 'alto', ANCHO: 3.6, ALTO_LIBRE: 1.35, PANEL_ALTO: 1.0, PROFUNDO: 0.15 },
    banderines: { clase: 'alto', ANCHO: 4.2, ALTO_LIBRE: 1.2, PANEL_ALTO: 0.75, PROFUNDO: 0.15 },
    toldo: { clase: 'alto', ANCHO: 3.8, ALTO_LIBRE: 1.05, PANEL_ALTO: 0.9, PROFUNDO: 0.7 },
  },
};

export const DIFICULTAD = {
  // Niveles por distancia recorrida (metros). Cada uno habilita tipos de
  // obstáculo y patrones nuevos, y acorta el intervalo entre spawns.
  // El nombre se anuncia en el HUD al entrar.
  NIVELES: [
    {
      desde: 0,
      nombre: 'De paseo por la peatonal',
      tipos: ['valla'],
      patrones: ['simple'],
      intervalo: [2.6, 3.6],
    },
    {
      desde: 140,
      nombre: '¡Cuidado con la feria!',
      tipos: ['valla', 'cajones'],
      patrones: ['simple'],
      intervalo: [2.4, 3.4],
    },
    {
      desde: 300,
      nombre: '¡Puesto de empanadas!',
      tipos: ['valla', 'cajones', 'empanadas'],
      patrones: ['simple'],
      intervalo: [2.2, 3.2],
    },
    {
      desde: 480,
      nombre: 'Agachate, chango',
      tipos: ['valla', 'cajones', 'empanadas', 'cartel'],
      patrones: ['simple'],
      intervalo: [2.1, 3.0],
    },
    {
      desde: 700,
      nombre: 'Fiestas patrias',
      tipos: ['valla', 'cajones', 'empanadas', 'banco', 'cartel', 'banderines'],
      patrones: ['simple', 'dobleBajo'],
      intervalo: [2.0, 2.8],
    },
    {
      desde: 980,
      nombre: 'Hora pico en el centro',
      tipos: ['valla', 'cajones', 'empanadas', 'banco', 'cartel', 'banderines', 'toldo'],
      patrones: ['simple', 'dobleBajo', 'bajoAlto'],
      intervalo: [1.9, 2.6],
    },
    {
      desde: 1350,
      nombre: '¡Plena zafra!',
      tipos: ['valla', 'cajones', 'empanadas', 'banco', 'cartel', 'banderines', 'toldo'],
      patrones: ['simple', 'dobleBajo', 'bajoAlto', 'altoBajo'],
      intervalo: [1.8, 2.4],
    },
  ],

  // Margen de gracia sobre el tiempo mínimo teórico de cada combo. 1.0
  // sería "justo al límite"; 1.35 le da al jugador casi medio salto de aire.
  // Bajarlo hace el juego más exigente; subirlo, más perdonador.
  MARGEN_COMBO: 1.35,

  // Tiempo de reacción humano que se le concede entre las dos acciones de
  // un combo, además del margen de arriba.
  REACCION_COMBO_S: 0.18,
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

  // Récord local (localStorage). No es ranking online: es el mejor puntaje
  // de esta máquina, para que la gente del stand compita entre sí.
  CLAVE_RECORD: 'migue.record',

  // Mensajes de cierre según puntaje (de mayor a menor; se toma el primero
  // que alcance el umbral).
  MENSAJES: [
    { desde: 1500, texto: '¡Sos leyenda tucumana!' },
    { desde: 900, texto: '¡Alto nivel, che!' },
    { desde: 500, texto: '¡Muy bien, chango!' },
    { desde: 200, texto: '¡Se puede más!' },
    { desde: 0, texto: '¡Dale que vos podés!' },
  ],
};

export const COLECCIONABLES = {
  // Soles de la ciudad (guiño al sol del isologo municipal): suman puntos
  // y le dan sentido al salto más allá de esquivar.
  VALOR: 20,
  RADIO: 0.26, // radio visual del sol
  RADIO_TOMA: 0.75, // radio de captura, generoso a propósito
  GIRO: 2.4, // vueltas por segundo sobre su eje
  POOL: 48, // instancias totales (nunca se crean en caliente)

  Z_SPAWN: -170,
  // Se retiran justo detrás del jugador: la cámara está en z≈4.2 y un sol
  // sin juntar que la atraviese es un fogonazo dorado en toda la pantalla.
  Z_FUERA: 1.8,
  INTERVALO_MIN_S: 2.4, // separación temporal entre grupos
  INTERVALO_MAX_S: 4.2,

  // Grupo en arco: hay que saltar para juntarlo (premia el timing).
  // El arco entero mide CANTIDAD × SEPARACION = 6 unidades, y un salto cubre
  // entre 5 y 9 según la velocidad: entra justo.
  ARCO_CANTIDAD: 5,
  ARCO_SEPARACION: 1.5, // separación en Z entre soles del arco
  // OJO con la altura del pico: la hitbox de pie llega a JUGADOR.HITBOX.ALTO
  // (1.5), así que el pico tiene que quedar por encima de 1.5 + RADIO o el
  // arco se junta corriendo y el salto deja de tener sentido. En el pico del
  // salto la hitbox llega a ~2.37, así que 2.15 es alcanzable saltando.
  ARCO_ALTURA: 2.15, // altura del sol del medio: exige salto
  ARCO_BASE: 0.8, // altura de los soles de las puntas: gratis, corriendo

  // Grupo en línea baja: se junta corriendo, pero se pierde si vas agachado.
  LINEA_CANTIDAD: 4,
  LINEA_SEPARACION: 1.6,
  LINEA_ALTURA: 1.05,

  PROBABILIDAD_ARCO: 0.55, // el resto son líneas bajas
};

export const POWERUPS = {
  // Comunes a los dos
  Z_SPAWN: -170,
  Z_FUERA: 1.8, // se retiran antes de la cámara (z≈4.2), como los soles
  RADIO_TOMA: 0.9, // generoso: son premios, no desafíos de precisión
  GIRO: 1.8, // vueltas por segundo, para que se noten
  POOL: 3, // de cada tipo; nunca hay más de uno o dos en vuelo

  // Patineta: escudo + puntos dobles. Al chocar o errar una pregunta se
  // pierde LA PATINETA en lugar de una vida, así perderla es el castigo.
  PATINETA: {
    INTERVALO_MIN_S: 16,
    INTERVALO_MAX_S: 26,
    ALTURA: 0.42, // flota bajita: se agarra corriendo, sin puntería
    MULTIPLICADOR_PUNTOS: 2,
    FACTOR_VELOCIDAD: 1.12, // apenas más rápido, para que se sienta
    // Altura de la tabla bajo los pies (sólo visual, la hitbox no cambia:
    // llevar patineta no debe alterar qué obstáculos se pueden franquear).
    ALTURA_TABLA: 0.07,
  },

  // Empanada: inmunidad total por unos segundos.
  EMPANADA: {
    INTERVALO_MIN_S: 20,
    INTERVALO_MAX_S: 32,
    ALTURA: 1.15, // a la altura del pecho, se agarra corriendo
    DURACION_S: 3,
    // Pulso del halo mientras dura la inmunidad.
    PULSO_HZ: 6,
  },
};

export const JUICE = {
  // Sacudida de cámara: golpe fuerte, acierto apenas perceptible.
  SACUDIDA_GOLPE: 0.32,
  SACUDIDA_ACIERTO: 0.06,
  SACUDIDA_AMORTIGUACION: 6.5, // qué tan rápido se apaga el temblor
  SACUDIDA_FRECUENCIA: 38, // vibración por segundo

  // Partículas: chispas de colores planos, sin texturas.
  PARTICULAS_POOL: 64,
  PARTICULAS_GOLPE: 16,
  PARTICULAS_SOL: 8,
  PARTICULA_VIDA_S: 0.65,
  PARTICULA_TAMANO: 0.13,
  PARTICULA_VELOCIDAD: 4.2,
  PARTICULA_GRAVEDAD: 9,
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
