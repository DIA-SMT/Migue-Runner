# Migue Runner

Juego web tipo *endless runner* con trivia sobre **Tucumán** y **San Miguel de Tucumán**, pensado para stand institucional: proyectado en pantalla grande y controlado con un **puntero presentador USB** de dos botones (saltar / agacharse).

Stack: **Three.js + Vite**, JavaScript vanilla, sin backend. Funciona 100% offline una vez cargado.

## Correr en desarrollo

```bash
npm install
npm run dev
```

Build estático (deploy en Vercel):

```bash
npm run build
```

## Estado — orden de implementación

- [x] **Fase 1 — Entrada**: página de diagnóstico que imprime el `event.code` de cada tecla. Probar con el puntero USB real y anotar los códigos de cada botón.
- [ ] Fase 2 — Calibración (dos pasos + `localStorage`)
- [ ] Fase 3 — Prototipo gris (cubo que corre, salta, se agacha)
- [ ] Fase 4 — Obstáculos y colisión
- [ ] Fase 5 — Trivia (portales dobles + `preguntas.json`)
- [ ] Fase 6 — Modelo de Migue (`.glb` + animaciones)
- [ ] Fase 7 — Arte y ambiente (paleta, parallax, niebla, bloom)
- [ ] Fase 8 — Pulido de stand (atracción, auto-reset, pantalla completa)

## Cómo probar la Fase 1

1. `npm run dev` y abrir la URL en Chrome/Edge.
2. Enchufar el puntero presentador USB.
3. Apretar cada botón: el `event.code` aparece gigante en pantalla, con historial, marca de auto-repeat y tiempo entre eventos.
4. Anotar qué código emite el botón "adelante" y el "atrás" del modelo concreto (varía por marca: `PageDown`/`PageUp`, flechas, `Space`, etc.).

## Convenciones del proyecto

- **Dos botones y nada más**: ninguna mecánica, menú o pantalla puede requerir otra entrada.
- Todas las constantes de jugabilidad viven en [`src/config.js`](src/config.js) — nunca inline.
- Código y comentarios en español.
- Las preguntas se editan en `public/data/preguntas.json` sin recompilar (a partir de la Fase 5).

## Assets fuente

El modelo 3D de Migue (`.glb`/`.fbx` + texturas PBR, ~50 MB por variante) y las imágenes de referencia viven **fuera del repo** (son demasiado pesados para versionar tal cual). En la Fase 6 se optimiza el `.glb` (compresión de mallas + reducción de texturas) y esa versión liviana sí se versiona en `public/models/migue.glb`.

> ⚠️ **Paleta institucional**: los tokens de color en [`src/estilos.css`](src/estilos.css) son una propuesta de trabajo. Antes de publicar, pedir el manual de identidad oficial a la Municipalidad y reemplazar los valores (un cambio de una línea por color).
