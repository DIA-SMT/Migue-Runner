// geometria.js — utilidades de geometría para el arte de colores planos.
//
// fusionarPiezas: toma una lista de { geometria, color } y devuelve UNA sola
// BufferGeometry con color por vértice. Así un edificio entero (o una banda
// entera de edificios) se dibuja en un único draw call con
// MeshStandardMaterial({ vertexColors: true }).

import * as THREE from 'three';

export function fusionarPiezas(piezas) {
  const preparadas = piezas.map((p) => ({
    g: p.geometria.index ? p.geometria.toNonIndexed() : p.geometria,
    c: new THREE.Color(p.color),
  }));

  let totalVertices = 0;
  for (const { g } of preparadas) totalVertices += g.attributes.position.count;

  const posicion = new Float32Array(totalVertices * 3);
  const normal = new Float32Array(totalVertices * 3);
  const color = new Float32Array(totalVertices * 3);

  let offset = 0;
  for (const { g, c } of preparadas) {
    const n = g.attributes.position.count;
    posicion.set(g.attributes.position.array, offset * 3);
    normal.set(g.attributes.normal.array, offset * 3);
    for (let i = 0; i < n; i++) {
      color[(offset + i) * 3] = c.r;
      color[(offset + i) * 3 + 1] = c.g;
      color[(offset + i) * 3 + 2] = c.b;
    }
    offset += n;
  }

  const fusionada = new THREE.BufferGeometry();
  fusionada.setAttribute('position', new THREE.BufferAttribute(posicion, 3));
  fusionada.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  fusionada.setAttribute('color', new THREE.BufferAttribute(color, 3));
  return fusionada;
}

// Caja ya ubicada: azúcar sintáctico para construir edificios pieza a pieza.
export function caja(ancho, alto, profundo, x, y, z, color) {
  const geometria = new THREE.BoxGeometry(ancho, alto, profundo);
  geometria.translate(x, y, z);
  return { geometria, color };
}
