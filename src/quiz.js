// quiz.js — carga, validación y selección de preguntas.
//
// Las preguntas viven en public/data/preguntas.json y se editan sin tocar
// código. Reglas del documento: validar al cargar (una pregunta rota se
// loguea y se omite, nunca rompe la partida), servir fáciles primero,
// no repetir hasta agotar el pool, mezcla ~50% San Miguel / 30% Tucumán /
// 20% general, y aleatorizar arriba/abajo en tiempo de ejecución.

import { TRIVIA } from './config.js';

const CATEGORIAS = ['san-miguel', 'tucuman', 'general'];

// Set mínimo embebido por si el archivo no carga.
const RESPALDO = [
  {
    id: 'resp-001',
    categoria: 'san-miguel',
    dificultad: 1,
    enunciado: '¿En qué año se fundó San Miguel de Tucumán?',
    opcionArriba: '1565',
    opcionAbajo: '1685',
    correcta: 'arriba',
    dato: 'Fundada por Diego de Villarroel; se trasladó a su emplazamiento actual en 1685.',
    activa: true,
  },
  {
    id: 'resp-002',
    categoria: 'san-miguel',
    dificultad: 1,
    enunciado: '¿Dónde se declaró la Independencia argentina en 1816?',
    opcionArriba: 'San Miguel de Tucumán',
    opcionAbajo: 'Buenos Aires',
    correcta: 'arriba',
    dato: 'El 9 de julio de 1816, en la Casa Histórica.',
    activa: true,
  },
  {
    id: 'resp-003',
    categoria: 'tucuman',
    dificultad: 1,
    enunciado: '¿Cuál es el apodo de Tucumán?',
    opcionArriba: 'La Perla del Norte',
    opcionAbajo: 'Jardín de la República',
    correcta: 'abajo',
    dato: 'Por sus paisajes verdes y su vegetación exuberante.',
    activa: true,
  },
  {
    id: 'resp-004',
    categoria: 'general',
    dificultad: 1,
    enunciado: '¿Cuál es la capital de la Argentina?',
    opcionArriba: 'Buenos Aires',
    opcionAbajo: 'Córdoba',
    correcta: 'arriba',
    dato: '',
    activa: true,
  },
];

function validar(pregunta, indice) {
  const errores = [];
  if (typeof pregunta.id !== 'string' || !pregunta.id) errores.push('id inválido');
  if (!CATEGORIAS.includes(pregunta.categoria)) errores.push('categoría inválida');
  if (typeof pregunta.enunciado !== 'string' || !pregunta.enunciado) errores.push('enunciado inválido');
  if (typeof pregunta.opcionArriba !== 'string' || !pregunta.opcionArriba) errores.push('opcionArriba inválida');
  if (typeof pregunta.opcionAbajo !== 'string' || !pregunta.opcionAbajo) errores.push('opcionAbajo inválida');
  if (pregunta.correcta !== 'arriba' && pregunta.correcta !== 'abajo') errores.push('correcta inválida');

  if (errores.length > 0) {
    console.warn(`preguntas.json[${indice}] omitida (${pregunta.id ?? 'sin id'}): ${errores.join(', ')}`);
    return false;
  }

  // Avisos no bloqueantes de legibilidad (límites del documento)
  if (pregunta.enunciado.length > 90) {
    console.warn(`${pregunta.id}: enunciado de ${pregunta.enunciado.length} caracteres (máx. recomendado 90)`);
  }
  if (pregunta.opcionArriba.length > 24 || pregunta.opcionAbajo.length > 24) {
    console.warn(`${pregunta.id}: opción de más de 24 caracteres`);
  }
  return true;
}

export async function cargarPreguntas() {
  let crudas = RESPALDO;
  try {
    const respuesta = await fetch(`${import.meta.env.BASE_URL}data/preguntas.json`);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const json = await respuesta.json();
    if (!Array.isArray(json.preguntas)) throw new Error('el JSON no tiene un array "preguntas"');
    crudas = json.preguntas;
  } catch (error) {
    console.error('No se pudo cargar data/preguntas.json; se usa el set embebido de respaldo.', error);
  }

  const pool = crudas.filter(
    (p, i) => p && p.activa !== false && validar(p, i),
  );
  if (pool.length === 0) {
    console.error('Pool de preguntas vacío tras validar; se usa el respaldo embebido.');
    pool.push(...RESPALDO);
  }
  console.info(`Trivia: ${pool.length} preguntas activas cargadas.`);

  const usadas = new Set();

  // Elige una categoría según la mezcla objetivo, entre las que tengan
  // preguntas sin usar; si todas se agotaron, resetea el ciclo.
  function elegirCategoria() {
    const disponiblesPor = {};
    for (const c of CATEGORIAS) {
      disponiblesPor[c] = pool.filter((p) => p.categoria === c && !usadas.has(p.id));
    }
    if (CATEGORIAS.every((c) => disponiblesPor[c].length === 0)) {
      usadas.clear();
      return elegirCategoria();
    }
    let total = 0;
    const pesos = CATEGORIAS.map((c) => {
      const peso = disponiblesPor[c].length > 0 ? (TRIVIA.MEZCLA[c] ?? 0.1) : 0;
      total += peso;
      return peso;
    });
    let tirada = Math.random() * total;
    for (let i = 0; i < CATEGORIAS.length; i++) {
      tirada -= pesos[i];
      if (tirada <= 0) return disponiblesPor[CATEGORIAS[i]];
    }
    return disponiblesPor[CATEGORIAS[CATEGORIAS.length - 1]];
  }

  return {
    cantidad: pool.length,

    // Devuelve una copia de la próxima pregunta, con la posición correcta
    // ya aleatorizada (el jugador no puede memorizar patrones).
    proxima() {
      const candidatas = elegirCategoria();
      // Fáciles primero: entre las de menor dificultad disponible, al azar.
      const dificultadMin = Math.min(...candidatas.map((p) => p.dificultad ?? 2));
      const faciles = candidatas.filter((p) => (p.dificultad ?? 2) === dificultadMin);
      const elegida = faciles[Math.floor(Math.random() * faciles.length)];
      usadas.add(elegida.id);

      const copia = { ...elegida };
      if (Math.random() < 0.5) {
        [copia.opcionArriba, copia.opcionAbajo] = [copia.opcionAbajo, copia.opcionArriba];
        copia.correcta = copia.correcta === 'arriba' ? 'abajo' : 'arriba';
      }
      return copia;
    },
  };
}
