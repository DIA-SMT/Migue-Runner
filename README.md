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

- [x] **Fase 1 — Entrada**: página de diagnóstico en [`/test-entrada.html`](test-entrada.html) que imprime el `event.code` de cada tecla, la duración de cada pulsación y un veredicto sobre si el puntero sostiene el botón. **Probada con el puntero real**: emite un solo código limpio por botón (`ArrowRight` / `ArrowLeft`), sin teclas reservadas por el navegador.
- [x] **Fase 2 — Calibración**: pantalla de dos pasos que captura el `event.code` de cada botón y lo persiste en `localStorage` (`migue.controles`). Rechaza el botón repetido y los códigos reservados del navegador (`F5`, `F11`, `F12`, `Escape`, `Tab`, `Meta`). Se abre con la tecla **C** o manteniendo los dos botones del puntero 3 segundos; `Escape` cancela sin guardar. **Falta probarla con el puntero real**, pero el flujo completo (captura → guardado → control del juego) está verificado con códigos de puntero típicos (`PageDown`/`PageUp`).
- [x] **Fase 3 — Correr, saltar, agacharse**: salto parabólico (~0.6 s), agachada con mínimo de 0.4 s, hitbox propia más chica que el modelo.
- [x] **Fase 4 — Obstáculos y colisión**: AABB, 3 vidas con invulnerabilidad y parpadeo, velocidad creciente. **Siete tipos de obstáculo** en dos clases: se saltan la valla municipal, los cajones de feria, el puesto de empanadas y el banco de plaza; se pasan agachado el cartel colgante, la guirnalda de banderines y el toldo de comercio.
- [x] **Dificultad progresiva**: siete tramos por distancia, cada uno con su nombre anunciado en pantalla (*De paseo por la peatonal* → … → *¡Plena zafra!*). Cada tramo habilita tipos nuevos, acorta el intervalo entre obstáculos y suma **combos**: dos obstáculos seguidos que obligan a encadenar salto y agachada. Ver [`src/dificultad.js`](src/dificultad.js).
- [x] **Fase 5 — Trivia**: portales dobles (arriba = saltar, abajo = agacharse), enunciado 3 s antes en el HUD, carga y validación de `preguntas.json` (32 preguntas: 20 San Miguel, 7 Tucumán, 5 generales), mezcla 50/30/20, sin repetición, posición correcta aleatorizada, dato posterior, puntaje con racha.
- [x] **Fase 6 — Modelo de Migue**: `.glb` optimizado de 47.7 MB → 1.45 MB (decimado a ~100k triángulos, textura WebP 1024, compresión meshopt). No trae animaciones: carrera simulada con bobbing procedural, como prevé el documento.
- [x] **Fase 7 — Arte y ambiente**: el **centro de San Miguel de Tucumán** — peatonal de baldosas con guarda roja, casas coloniales de pasteles, **Casa Histórica** y **Catedral** como hitos reconocibles, lapachos en flor, faroles, cerros del Aconquija de fondo, sol con bloom, niebla `FogExp2`. Cada banda de edificios es una sola malla fusionada (~15 draw calls en total).
- [ ] Fase 8 — Pulido de stand: **falta la prueba en proyector**. Ya están la atracción, el auto-reset de 15 s y la pantalla completa (tecla **F**); sigue pendiente incrustar la tipografía definitiva (hoy usa la fuente del sistema).
- [x] **Mobile**: controles táctiles de dos zonas (mitad de arriba/abajo de la pantalla), gestos del navegador anulados (zoom, scroll, selección, menú de mantener apretado) y HUD responsive probado en 375×812.
- [x] **Soles de la ciudad**: coleccionables que suman puntos, en dos patrones — arco a la altura del salto (hay que saltar: el pico queda fuera del alcance corriendo) y línea baja (se junta corriendo, se pierde si vas agachado). Nunca aparecen encima de un obstáculo ni sobre un portal de trivia.
- [x] **Impacto y récord**: sacudida de cámara, chispas instanciadas y viñeta roja al chocar; récord de la máquina en `localStorage` (`migue.record`) con "¡Récord nuevo!" y mensaje de cierre según puntaje.
- [x] **Power-ups**: la **patineta** (puntos ×2 y algo más de velocidad) y la **empanada** (inmunidad 3 s). Ver la tabla de daño más abajo.

> Estados implementados: `ATRACCIÓN → JUGANDO → RESULTADO → (vuelve solo a ATRACCIÓN a los 15 s)`. La CALIBRACIÓN se suma en la Fase 2.

## Cómo jugar (con teclado, hasta calibrar el puntero)

- En la pantalla de espera: **saltar arranca con Migue**, **agacharse arranca con Chanbachi** (el perrobot municipal). Dos botones, dos personajes: sin menús.
- **Puntero USB**: botón adelante = saltar, botón atrás = agacharse.
- **Espacio, ⬆ o ➡**: saltar (vallas, y elegir la opción de ARRIBA en la trivia)
- **Shift, ⬇ o ⬅**: agacharse (carteles, y elegir la opción de ABAJO)
- **Mobile/tablet (táctil)**: tocar la **mitad de arriba** de la pantalla = saltar, tocar la **mitad de abajo** = agacharse. Es el mismo criterio arriba/abajo que ya usan los portales de trivia, así que no hace falta explicar nada nuevo — el dedo reemplaza uno a uno los dos botones del puntero físico. El HUD detecta el dispositivo y muestra el hint que corresponde ("tocá arriba/abajo" en vez de "Espacio/Shift").
- Hay música de fondo (arranca con la partida), festejos argentos ("¡Buena changoooo!") al acertar y cada tantos obstáculos, y blips sintetizados con WebAudio (sin assets de terceros).

## Montaje del stand

1. Enchufar el puntero presentador USB y abrir el juego en Chrome/Edge.
2. Apretar **F** para pantalla completa.

**Eso es todo.** El puntero del municipio ya funciona sin configurar nada: sus códigos (`ArrowRight` adelante = saltar, `ArrowLeft` atrás = agacharse) están medidos con el dispositivo real y viven en `ENTRADA.RESPALDO_TECLADO` de [`src/config.js`](src/config.js). Anda al instante en cualquier máquina, aunque se borre el almacenamiento del navegador o se abra en ventana privada.

Para **otro** puntero que emita códigos distintos: apretar **C** (o mantener los dos botones 3 segundos) y seguir los dos pasos de calibración. Eso queda guardado en `localStorage` de esa máquina y convive con los códigos de arriba.

## Cómo probar el puntero USB (Fase 1)

Para inspeccionar qué códigos emite un puntero desconocido, sin calibrar nada:

1. Abrir `/test-entrada.html` en Chrome/Edge.
2. Enchufar el puntero presentador USB.
3. Apretar cada botón: el `event.code` aparece gigante en pantalla, con historial, marca de auto-repeat y tiempo entre eventos.
4. Anotar qué código emite el botón "adelante" y el "atrás" del modelo concreto (varía por marca: `PageDown`/`PageUp`, flechas, `Space`, etc.).

## Power-ups y cómo se pierde

Se juntan corriendo, sin necesidad de saltar, y nunca aparecen encima de un obstáculo ni sobre un portal de trivia.

- **🛹 Patineta**: puntos ×2 y un empujón de velocidad. **Funciona de escudo**: al chocar o errar una pregunta se pierde la patineta *en lugar de* una vida.
- **🥟 Empanada**: inmunidad total por 3 segundos, con halo dorado a los pies.

La empanada **power-up** flota, gira y brilla; el **puesto** de empanadas es un obstáculo de madera, en el piso y quieto. Son cosas distintas a propósito.

Orden en que se resuelve el daño (`recibirDano()` en [`src/main.js`](src/main.js)), de más protector a menos:

| Estado | Choque | Errar pregunta |
|---|---|---|
| Empanada activa | nada | nada |
| Ventana tras un golpe | nada | **pierde vida** |
| Con patineta | pierde patineta | pierde patineta |
| Sin nada | pierde vida | pierde vida |

La ventana posterior a un golpe existe para no comer dos veces el mismo obstáculo, así que **no** protege de una respuesta equivocada: son eventos distintos. Los valores están en `POWERUPS` de [`src/config.js`](src/config.js).

## Ajustar la dificultad

Todo vive en `DIFICULTAD` de [`src/config.js`](src/config.js):

- **`NIVELES`**: cada tramo declara desde qué metro empieza, su nombre, qué `tipos` de obstáculo habilita, qué `patrones` (`simple`, `dobleBajo`, `bajoAlto`, `altoBajo`) y el `intervalo` entre spawns. Agregar o correr un tramo es editar ese array.
- **`MARGEN_COMBO`**: cuánto aire de más se le da al jugador en los combos. `1.0` sería justo al límite físico; el valor actual le concede casi medio salto extra. Bajarlo endurece el juego.

Las separaciones de los combos **no se escriben a mano**: `dificultad.js` las deriva de la física del salto y del mínimo de la agachada, así que nunca puede quedar un combo imposible por tocar un número. Si cambiás `SALTO` o `AGACHADA`, las separaciones se reajustan solas.

## Inspector de obstáculos (herramienta de desarrollo)

`npm run dev` y abrir `/inspector.html` muestra los siete obstáculos alineados con su **caja de colisión dibujada encima** (verde los bajos, roja los altos) y tres líneas de referencia: altura de los pies en el pico del salto, techo de la hitbox agachada y techo de pie. Sirve para revisar el arte y confirmar de un vistazo que cada obstáculo se pueda franquear.

`?x=` centra la vista en una posición de la fila y `?z=` acerca o aleja: por ejemplo `/inspector.html?x=15&z=9` mira el toldo de frente. No entra al build de producción (`vite.config.js` declara sólo `index.html` y `test-entrada.html`).

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
