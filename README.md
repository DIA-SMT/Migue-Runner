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

- [x] **Fase 1 — Entrada**: página de diagnóstico que imprime el `event.code` de cada tecla, en [`/test-entrada.html`](test-entrada.html). Falta probarla con el puntero USB real y anotar los códigos de cada botón.
- [ ] **Fase 2 — Calibración** (dos pasos + `localStorage`) — *pendiente hasta tener el puntero a mano*. Mientras tanto el juego se controla con el teclado de respaldo: **Espacio/⬆ = saltar, Shift/⬇ = agacharse**.
- [x] **Fase 3 — Correr, saltar, agacharse**: salto parabólico (~0.6 s), agachada con mínimo de 0.4 s, hitbox propia más chica que el modelo.
- [x] **Fase 4 — Obstáculos y colisión**: vallas (se saltan) y carteles colgantes (se pasan agachado), AABB, 3 vidas con invulnerabilidad y parpadeo, velocidad creciente.
- [x] **Fase 5 — Trivia**: portales dobles (arriba = saltar, abajo = agacharse), enunciado 3 s antes en el HUD, carga y validación de `preguntas.json` (32 preguntas: 20 San Miguel, 7 Tucumán, 5 generales), mezcla 50/30/20, sin repetición, posición correcta aleatorizada, dato posterior, puntaje con racha.
- [x] **Fase 6 — Modelo de Migue**: `.glb` optimizado de 47.7 MB → 1.45 MB (decimado a ~100k triángulos, textura WebP 1024, compresión meshopt). No trae animaciones: carrera simulada con bobbing procedural, como prevé el documento.
- [x] **Fase 7 — Arte y ambiente**: el **centro de San Miguel de Tucumán** — peatonal de baldosas con guarda roja, casas coloniales de pasteles, **Casa Histórica** y **Catedral** como hitos reconocibles, lapachos en flor, faroles, cerros del Aconquija de fondo, sol con bloom, niebla `FogExp2`. Cada banda de edificios es una sola malla fusionada (~15 draw calls en total).
- [ ] Fase 8 — Pulido de stand (pantalla completa, prueba en proyector) — *la atracción y el auto-reset de 15 s ya están*.
- [x] **Mobile** *(adelantada)*: controles táctiles de dos zonas (mitad de arriba/abajo de la pantalla), gestos del navegador anulados (zoom, scroll, selección, menú de mantener apretado) y HUD responsive probado en 375×812.

> Estados implementados: `ATRACCIÓN → JUGANDO → RESULTADO → (vuelve solo a ATRACCIÓN a los 15 s)`. La CALIBRACIÓN se suma en la Fase 2.

## Cómo jugar (con teclado, hasta calibrar el puntero)

- En la pantalla de espera: **saltar arranca con Migue**, **agacharse arranca con Chanbachi** (el perrobot municipal). Dos botones, dos personajes: sin menús.
- **Espacio o ⬆**: saltar (vallas, y elegir la opción de ARRIBA en la trivia)
- **Shift o ⬇**: agacharse (carteles, y elegir la opción de ABAJO)
- **Mobile/tablet (táctil)**: tocar la **mitad de arriba** de la pantalla = saltar, tocar la **mitad de abajo** = agacharse. Es el mismo criterio arriba/abajo que ya usan los portales de trivia, así que no hace falta explicar nada nuevo — el dedo reemplaza uno a uno los dos botones del puntero físico. El HUD detecta el dispositivo y muestra el hint que corresponde ("tocá arriba/abajo" en vez de "Espacio/Shift").
- Hay música de fondo (arranca con la partida), festejos argentos ("¡Buena changoooo!") al acertar y cada tantos obstáculos, y blips sintetizados con WebAudio (sin assets de terceros).

## Cómo probar el puntero USB (Fase 1)

1. Abrir `/test-entrada.html` en Chrome/Edge.
2. Enchufar el puntero presentador USB.
3. Apretar cada botón: el `event.code` aparece gigante en pantalla, con historial, marca de auto-repeat y tiempo entre eventos.
4. Anotar qué código emite el botón "adelante" y el "atrás" del modelo concreto (varía por marca: `PageDown`/`PageUp`, flechas, `Space`, etc.).

## Convenciones del proyecto

- **Dos botones y nada más**: ninguna mecánica, menú o pantalla puede requerir otra entrada.
- Todas las constantes de jugabilidad viven en [`src/config.js`](src/config.js) — nunca inline.
- Código y comentarios en español.
- Las preguntas se editan en `public/data/preguntas.json` sin recompilar (a partir de la Fase 5).

## Assets fuente

Los modelos 3D originales (Migue ~50 MB, Chanbachi 4.3 MB), la música original y las imágenes de referencia viven **fuera del repo** (gitignoreados en la raíz). Las versiones optimizadas sí se versionan:

- `public/models/migue.glb` (1.45 MB) y `public/models/chanbachi.glb` (183 KB): decimados con gltf-transform + meshopt.
- `public/audio/musica.mp3`: "Por la Ciudad" de La Vela Puerca — **la Municipalidad declara contar con autorización de uso**. Si esa autorización no cubre la publicación en la web pública, reemplazar por una pista propia o libre antes del evento.

> ⚠️ **Paleta institucional**: los tokens de color en [`src/estilos.css`](src/estilos.css) son una propuesta de trabajo. Antes de publicar, pedir el manual de identidad oficial a la Municipalidad y reemplazar los valores (un cambio de una línea por color).
