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
- [x] **Mobile, tablet y Oculus Quest**: controles táctiles de dos zonas, soporte de mandos, cámara que se adapta al formato de pantalla y HUD escalado con `vmin`. Ver la sección de formatos más abajo.
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

## Formatos de pantalla

Probado en proyector 1080p, tablet (los dos giros), celular (los dos giros) y el navegador del Quest.

**La cámara se adapta al formato.** El FOV de una cámara en perspectiva es *vertical*: con un valor fijo, cuanto más angosta la pantalla, menos mundo se ve **a lo ancho**. En un celular en vertical entraban 2 unidades de ancho y el portal de trivia mide 4.2 — se cortaba, y no se podían leer las dos opciones. No era un detalle estético: era el juego roto en vertical.

`ajustarCamara()` en [`src/main.js`](src/main.js) garantiza un ancho mínimo visible: primero abre el FOV, y si con el tope no alcanza, aleja la cámara. En 16:9 (el proyector) no se activa nada.

| Formato | Antes | Ahora |
|---|---|---|
| Proyector 1080p | 7.8 | 7.8 (sin cambios) |
| Tablet horizontal | 5.8 | 5.8 (sin cambios) |
| Tablet vertical | 3.3 ✂️ | 4.4 (FOV 70°) |
| Celular vertical | 2.0 ✂️ | 4.4 (FOV 74° + cámara más atrás) |

**El HUD se mide en `vmin`,** no en `vw`. Los tokens `--txt-*` de [`src/estilos.css`](src/estilos.css) son la única fuente de tamaños. `vmin` toma el lado más corto de la pantalla, que es justo el que escasea: con `vw`, un celular acostado (mucho ancho, poquísimo alto) hacía que el HUD se comiera la pantalla. La regla del documento —nada por debajo de 32 px en 1080p— se cumple por el tope de cada token.

**Controles por dispositivo:**

| Dispositivo | Saltar | Agacharse |
|---|---|---|
| Puntero USB | botón adelante | botón atrás |
| Teclado | Espacio · ⬆ · ➡ | Shift · ⬇ · ⬅ |
| Táctil | tocar la mitad de arriba | tocar la mitad de abajo |
| Quest / joystick | gatillo · A/X · palanca arriba | grip · B/Y · palanca abajo |

En el **navegador del Quest** funcionan las dos cosas: apuntar con el mando y apretar el gatillo cuenta como toque en la zona a la que apuntás, y los botones andan sin apuntar a ningún lado. La pantalla de espera detecta el mando (`gamepadconnected`) y muestra los botones correctos en vez de las teclas.

## VR inmersiva (WebXR) en el Quest

Hay dos modos y **el de pantalla plana es el default**: el botón «Entrar en VR» aparece abajo a la derecha sólo si el navegador soporta VR inmersiva, así que en la notebook del stand y en el celular no existe.

Lo que cambia adentro de la sesión, y por qué:

| | Pantalla plana | VR inmersiva |
|---|---|---|
| HUD | HTML sobre el canvas | paneles 3D ([`src/hud3d.js`](src/hud3d.js)) |
| Bloom | sí | no — el `EffectComposer` de three.js no soporta XR |
| Sombras | sí | no — el visor pide 90 fps por ojo |
| Sacudida al chocar | sí | no — mover el punto de vista sin que la persona lo mueva marea |
| Viñeta de confort | no | sí — recorta la visión periférica mientras el mundo avanza |

**Controles en VR:** el **gatillo** salta y el **grip** agacha (también A/X y B/Y, y la palanca). Sostener los dos a la vez 2 segundos sale de VR, con cuenta regresiva en pantalla para que nadie se salga sin querer.

**Jugar sin mandos, con las manos:** si la persona apoya los mandos, el Quest pasa solo a seguimiento de manos y el juego se adapta: **levantar la mano derecha = saltar, la izquierda = agacharse**, las dos arriba 2 segundos = salir. El reparto por mano existe porque sin mandos no hay grip: `squeeze` no tiene equivalente con manos. El cambio se detecta por cuadro —el Quest no avisa por ningún evento— y la pantalla de espera se repinta sola con los gestos que correspondan.

**Por qué levantar la mano y no el *pinch*.** La primera versión usaba el pinch (juntar pulgar e índice), que parecía la opción obvia: WebXR ya lo entrega calibrado por el sistema, en el mismo evento `select` que el gatillo. En el visor real falló — **pinchar con la palma hacia la cara es EL gesto con el que el propio Quest abre su menú**, y desde la web no hay forma de desactivarlo. Jugando a pinchazos, tarde o temprano la mano queda en esa pose y el sistema se lleva el gesto: aparecen aplicaciones o te saca de la sesión. Levantar la mano no choca con ningún gesto del sistema, y encima es una pose que las cámaras siguen bien (un puño se tapa los dedos a sí mismo y el seguimiento se degrada).

El umbral se mide contra la altura de los **ojos**, no del piso, así que anda igual para cualquier estatura sin calibrar: hay que subir la muñeca hasta 25 cm por debajo de los ojos (altura del cuello) y bajarla a 45 cm para soltar. Con los brazos al costado la muñeca queda a unos 85 cm por debajo, bien lejos del umbral. Si el visor pierde la mano de vista mientras estaba levantada, la agachada se suelta sola en vez de quedar trabada. Los dos umbrales se ven en vivo con `?diag=1` (línea `manos:`), para poder ajustarlos desde adentro del visor.

**Agacharse agachándose de verdad:** funciona con mandos y con manos. El juego compara la altura de tu cabeza contra su altura de reposo, que aprende sola sin calibrar nada. Los dos umbrales son distintos a propósito (bajar 26 cm para activar, volver a 14 cm para soltar) para que la agachada no titile cuando la cabeza queda justo en el límite. Además de natural, mover el cuerpo de verdad reduce el mareo.

**Por qué el punto de vista está elevado** (`XR.RIG_Y`): Migue mide 1,80 y una persona tiene los ojos a ~1,60, así que su cabeza sobresale del horizonte visual y tapa justo la franja donde aparecen los carteles que vienen de lejos. Alejarse no arregla nada — desde 6 m sigue tapando. Hay que mirar desde **más arriba que el personaje**, como parado en un escalón. Hay un test que lo verifica para estaturas de 1,45 a 1,85.

### Esquivar de costado: el eje que sólo existe en VR

En pantalla plana hay dos botones y con eso no alcanza para una tercera acción. En VR el cuerpo aporta un eje que los botones no tienen, así que existe una clase de obstáculo más — **`costado`**, hoy la **rama de naranjo** — que tapa un lado de la vereda de arriba abajo: no se salta ni se agacha, hay que **correr el cuerpo al otro lado**.

Dos gestos alimentan la misma señal y gana el más marcado:

| Gesto | Para qué |
|---|---|
| **Inclinarse** ~12 cm hacia un lado | lo natural; además mover el cuerpo de verdad ayuda con el mareo |
| **Estirar un brazo** al costado | para quien no puede o no quiere inclinarse: sentado, en silla de ruedas, o con gente al lado en el stand |

El brazo no es un adorno: **inclinarse con un visor puesto te corre el centro de gravedad**, y en un stand con fila eso es riesgo de caída. Por eso la rama pide sólo el 56 % del desvío máximo (un movimiento de hombros) y siempre hay una alternativa que se hace sentado.

Lo delicado es que *levantar la mano* y *estirar el brazo* no se pisen: con el brazo horizontal la muñeca queda casi a la altura del hombro, que es el mismo umbral de la mano levantada. Lo que los separa es la distancia **lateral** a la cabeza (`XR.MANO_AL_COSTADO`), no la altura. Hay tests dedicados a ese cruce.

**En pantalla plana la rama no aparece nunca.** `dificultad.js` filtra la clase `costado` salvo que `permitirLateral(true)` esté puesto, y eso sólo pasa al entrar en VR; al salir, además, se retiran las que quedaron en vuelo. Es la garantía de que agregar VR no rompe el juego que ya anda — hay un test que suelta 21 000 grupos sin desvío y exige cero.

Los umbrales se leen en vivo con `?diag=1` (líneas `manos:` y `lat:`), y el hueco por el que hay que pasar se ve en `/inspector.html` dibujado en amarillo al lado de la caja celeste del obstáculo.

**Los dos HUD implementan la misma interfaz de 16 métodos.** [`src/main.js`](src/main.js) habla con un proxy que reenvía cada llamada al que esté activo, así que la lógica del juego no sabe en qué modo corre y no hubo que tocarla. Si mañana se agrega un método al HUD, hay que agregarlo en los dos.

Los paneles se cuelgan del **rig** del jugador, no de la cámara: pegados a la cámara te persiguen la mirada, que en VR es incómodo; colgados del rig quedan quietos respecto al cuerpo y se miran girando la cabeza.

Para revisar los paneles sin visor: `/inspector.html?hud=1`, con `&pantalla=atraccion|juego|resultado` y `&z=3.5` para echarse atrás.

Si algo no funciona dentro del visor, agregar **?diag=1** a la URL suma un panel de diagnostico ahi mismo: dice cuantos mandos detecta, que boton esta apretado en ese momento (con TODOS los indices, no solo los mapeados), como quedo el recentrado, los fps y si hubo errores de JavaScript. Existe porque desde una notebook no hay forma de ver que pasa adentro del casco.

> ⚠️ **Sin probar en un visor real.** Se verificó que la interfaz esté completa, que ninguna de las 16 llamadas tire excepción y que los paneles se lean bien, pero nadie se puso todavía un Quest. **El mareo es el riesgo abierto**: un runner mueve el mundo sin que la persona lo controle, y eso descompone a parte del público. Hay que probarlo con gente antes de ponerlo en el stand. Si molesta, en `XR` de [`src/config.js`](src/config.js) se puede cerrar más la viñeta (`VINETA_ANGULO`, `VINETA_OPACIDAD`) o bajar la velocidad del mundo.

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

## Qué falta

- **Probar la calibración con el puntero real.** El flujo está verificado con códigos típicos, y los del puntero del municipio ya andan sin calibrar.
- **Prueba en proyector.**
- **Tipografía embebida.** Hoy usa la del sistema; el requisito offline pide una familia incrustada localmente.
- **Probar la VR inmersiva en un visor real**, sobre todo el mareo. Ver la sección de WebXR.
