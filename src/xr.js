// xr.js — sesión de realidad virtual inmersiva (WebXR) para el Oculus Quest.
//
// TODO acá es aditivo: si el navegador no soporta VR inmersiva, este módulo
// no hace nada y el juego sigue exactamente igual que siempre. El botón de
// entrada sólo se crea cuando `isSessionSupported('immersive-vr')` da true,
// así que en la notebook del stand no aparece.
//
// Lo que cambia DENTRO de la sesión, y por qué:
//
//  - El HUD pasa a paneles 3D (hud3d.js): en una sesión inmersiva el DOM no
//    se renderiza.
//  - Se apaga el bloom. El EffectComposer de three.js no soporta XR (hay
//    que renderizar a los framebuffers que provee el dispositivo, uno por
//    ojo), así que en VR se dibuja directo.
//  - Se apaga la sacudida de cámara. Mover el punto de vista sin que la
//    persona lo haya movido es una de las causas más directas de malestar.
//  - Se enciende una viñeta de confort pegada a la CABEZA (ver abajo).
//  - Se recentra la escena según hacia dónde esté mirando la persona.

import * as THREE from 'three';
import { XR } from './config.js';
import { crearPlaca3d, COLORES_PANEL } from './panel3d.js';

// --- Panel de diagnóstico (sólo con ?diag=1) ---
//
// Existe por una limitación concreta: desde una notebook no hay forma de
// ver qué pasa dentro del visor. Este panel muestra ahí mismo si el juego
// detecta los mandos, qué botón está apretado, cómo quedó el recentrado y
// si hubo errores de JavaScript, para que la persona que tiene el casco lo
// lea y lo pueda contar.
function crearDiagnostico(rig) {
  const c = XR.DIAG;
  const placa = crearPlaca3d({
    ancho: c.ancho,
    alto: c.alto,
    pixelesPorUnidad: XR.PIXELES_POR_METRO,
  });
  placa.malla.position.set(c.x, c.y, c.z);
  placa.malla.rotation.y = c.giro;
  placa.malla.renderOrder = c.orden;
  placa.malla.visible = true;
  rig.add(placa.malla);

  // Los errores de JS son lo primero que se querría saber y lo único que
  // no se puede deducir mirando: se juntan acá para mostrarlos en el panel.
  const errores = [];
  window.addEventListener('error', (e) => {
    if (errores.length < 3) errores.push(String(e.message ?? e).slice(0, 60));
  });
  window.addEventListener('unhandledrejection', (e) => {
    if (errores.length < 3) errores.push(String(e.reason?.message ?? e.reason).slice(0, 60));
  });

  let cuadros = 0;
  let ultimoTiempo = performance.now();
  let fps = 0;

  return {
    // `datos` lo arma el módulo de XR con lo que sabe de la sesión.
    actualizar(datos) {
      cuadros++;
      const ahora = performance.now();
      if (ahora - ultimoTiempo >= 500) {
        fps = Math.round((cuadros * 1000) / (ahora - ultimoTiempo));
        cuadros = 0;
        ultimoTiempo = ahora;
      }
      if (cuadros % XR.DIAG_CADA_CUADROS !== 0) return;

      // `vistas` es EL dato que dice si el estéreo está bien: en una sesión
      // de VR sana three arma una cámara por ojo, así que tiene que decir 2.
      // Si dice 1, el visor está mostrando la imagen plana estirada sobre
      // los dos ojos, que es lo que se ve como "todo cruzado".
      const estereoOk = datos.vistas === 2;
      placa.escribir(
        [
          { texto: 'DIAGNÓSTICO', color: COLORES_PANEL.celeste, escala: 0.32 },
          {
            texto: `estéreo: ${datos.vistas} ${estereoOk ? 'vistas OK' : 'VISTAS — MAL'}`,
            color: estereoOk ? COLORES_PANEL.ok : COLORES_PANEL.error,
            escala: 0.3,
            peso: 800,
          },
          // Separador visible: el ajuste de línea colapsa los espacios
          // múltiples, así que dos datos en un renglón quedaban pegados.
          { texto: `mandos: ${datos.mandos} · fps: ${fps}`, escala: 0.28, peso: 700 },
          { texto: `gatillo: ${datos.gatillo} · grip: ${datos.grip}`, escala: 0.28, peso: 700 },
          { texto: `botones: ${datos.botones || '-'} · ejes: ${datos.ejes}`, escala: 0.25, peso: 500 },
          // La altura de la cabeza contra su reposo: sirve para ajustar los
          // umbrales del agache si resultan muy sensibles o muy duros.
          { texto: `cabeza: ${datos.cabeza}`, escala: 0.25, peso: 500 },
          { texto: `giro: ${datos.giro}° · piso: ${datos.espacio} · salir: ${datos.salida}`, escala: 0.25, peso: 500 },
          {
            texto: errores.length ? `ERROR: ${errores[0]}` : 'sin errores de JS',
            color: errores.length ? COLORES_PANEL.error : COLORES_PANEL.ok,
            escala: 0.25,
            peso: 700,
          },
        ],
        { borde: 'ninguno', alineado: 'izquierda' },
      );
    },
  };
}

// --- Viñeta de confort ---
//
// Va como hija de la CÁMARA, no del rig. Es la corrección de un bug que
// se vio en el visor: antes era una esfera centrada en el rig, y el rig
// está al nivel del PISO. Con la cabeza a 1,6 m de altura, la banda oscura
// de esa esfera cruzaba el campo visual en diagonal en vez de rodearlo —
// se veía "todo cruzado".
//
// Ahora es un plano con degradado radial pegado delante de los ojos:
// transparente en el centro, opaco en los bordes. Al tapar la periferia,
// el flujo óptico del movimiento deja de empujar al sistema vestibular.
function crearVinetaConfort() {
  const lienzo = document.createElement('canvas');
  lienzo.width = 256;
  lienzo.height = 256;
  const ctx = lienzo.getContext('2d');
  const centro = 128;
  const degrade = ctx.createRadialGradient(
    centro,
    centro,
    centro * XR.VINETA_CENTRO_LIBRE,
    centro,
    centro,
    centro,
  );
  degrade.addColorStop(0, 'rgba(0,0,0,0)');
  degrade.addColorStop(1, `rgba(0,0,0,${XR.VINETA_OPACIDAD})`);
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, 256, 256);

  const textura = new THREE.CanvasTexture(lienzo);
  const lado = XR.VINETA_DISTANCIA * XR.VINETA_LADO;
  const vineta = new THREE.Mesh(
    new THREE.PlaneGeometry(lado, lado),
    new THREE.MeshBasicMaterial({
      map: textura,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  vineta.position.z = -XR.VINETA_DISTANCIA;
  // Detrás del HUD (renderOrder 100) pero delante del mundo.
  vineta.renderOrder = 95;
  vineta.frustumCulled = false;
  return vineta;
}

// Gira el rig para que la persona quede mirando hacia la calle (-Z), sin
// importar hacia dónde estuviera mirando al ponerse el visor.
//
// WebXR orienta el espacio 'local-floor' según la pose inicial del casco:
// si alguien entra mirando a la pared de al lado, ve la peatonal de
// costado. Esto se exporta aparte para poder testear la matemática sin
// visor, que es lo único verificable de este módulo desde una notebook.
export function recentrarRig(rig, camara) {
  const direccion = new THREE.Vector3();
  camara.getWorldDirection(direccion);
  direccion.y = 0;
  if (direccion.lengthSq() < 1e-6) return; // mirando al piso o al cielo
  direccion.normalize();

  // Ángulo con signo entre la mirada actual y el eje -Z, alrededor de Y.
  // El producto vectorial da el sentido del giro y el escalar el coseno.
  const objetivo = new THREE.Vector3(0, 0, -1);
  const cruz = direccion.x * objetivo.z - direccion.z * objetivo.x;
  const punto = direccion.x * objetivo.x + direccion.z * objetivo.z;
  const desvio = Math.atan2(cruz, punto);

  // Se RESTA, no se suma. La cámara va adentro del rig, así que girar el
  // rig gira también la mirada: sumar el desvío lo duplicaba en vez de
  // corregirlo (a 45° del objetivo quedaba a 90°). Restarlo lo cancela.
  rig.rotation.y -= desvio;
}

// `alEntrar` / `alSalir` los usa main.js para cambiar de HUD y de modo de
// render. `rig` es el grupo que representa el cuerpo del jugador.
// `acciones` conecta los mandos del visor con la entrada del juego.
export function crearXR({ renderer, camara, rig, alEntrar, alSalir, acciones = {} }) {
  let soportado = false;
  let boton = null;
  let recentrarPendiente = false;

  const vineta = crearVinetaConfort();
  vineta.visible = false;
  // Hija de la cámara: acompaña la cabeza, que es lo que una viñeta de
  // confort necesita para funcionar.
  camara.add(vineta);

  // Panel de diagnóstico, sólo si la URL lo pide.
  const pideDiag = new URLSearchParams(location.search).get('diag') === '1';
  const diagnostico = pideDiag ? crearDiagnostico(rig) : null;

  function pintarBoton(texto, habilitado) {
    if (!boton) return;
    boton.textContent = texto;
    boton.disabled = !habilitado;
  }

  async function entrar() {
    try {
      const sesion = await navigator.xr.requestSession('immersive-vr', {
        // 'local-floor' pone el origen en el piso real, así que la persona
        // queda parada en la peatonal a su altura verdadera.
        optionalFeatures: ['local-floor', 'bounded-floor'],
      });
      await renderer.xr.setSession(sesion);
    } catch (error) {
      console.error('No se pudo entrar en VR.', error);
      pintarBoton('VR no disponible', false);
    }
  }

  // --- Mandos del visor ---
  //
  // OJO: dentro de una sesión inmersiva, navigator.getGamepads() NO
  // devuelve los mandos del Quest. Ese fue el bug por el que no se podía
  // apretar nada: la Gamepad API sólo los ve en el navegador 2D. Dentro de
  // la sesión hay que usar los eventos de la propia sesión y, para los
  // botones que no tienen evento propio, session.inputSources[].gamepad.
  function conectarMandos(sesion) {
    // 'select' es el gatillo y 'squeeze' el grip, en los dos mandos.
    // El informe deja constancia de que el evento llegó, así el panel de
    // diagnóstico distingue "el botón no hace nada" de "el evento no llega".
    sesion.addEventListener('selectstart', () => {
      informe.gatillo = 'SI';
      acciones.saltar?.();
    });
    sesion.addEventListener('squeezestart', () => {
      informe.grip = 'SI';
      acciones.agacharse?.();
    });
    sesion.addEventListener('squeezeend', () => acciones.soltarAgacharse?.());
  }

  // Botones A/B/X/Y y palancas: no emiten eventos de sesión, así que se
  // consultan por cuadro. Se detecta el flanco para que mantener apretado
  // dispare una sola vez.
  let saltarAntes = false;
  let agacharAntes = false;
  // Agacharse con el cuerpo: se compara la altura de la cabeza contra su
  // altura de reposo, que se aprende sola durante la partida.
  let alturaReposo = 0;
  let agachadoFisico = false;
  // Cuándo empezó el gesto de salida (los dos botones juntos).
  let salirDesde = 0;

  // La cámara vive dentro del rig, así que su Y local ES la altura de la
  // cabeza sobre el piso virtual: no hace falta convertir a coordenadas de
  // mundo ni descontar la elevación del rig.
  function revisarAgacheFisico() {
    if (!XR.AGACHE_FISICO) return;
    const altura = camara.position.y;
    if (altura <= 0) return; // todavía no llegó una pose válida

    if (alturaReposo === 0) {
      alturaReposo = altura;
      return;
    }
    // El reposo sólo sube, y de a poco: si bajara al agacharse, el gesto se
    // "normalizaría" y dejaría de detectarse a los pocos segundos.
    if (altura > alturaReposo) alturaReposo += (altura - alturaReposo) * 0.08;

    const bajada = alturaReposo - altura;
    if (!agachadoFisico && bajada > XR.AGACHE_BAJAR) {
      agachadoFisico = true;
      acciones.agacharse?.();
    } else if (agachadoFisico && bajada < XR.AGACHE_SUBIR) {
      agachadoFisico = false;
      acciones.soltarAgacharse?.();
    }

    informe.cabeza = `${altura.toFixed(2)}/${alturaReposo.toFixed(2)}${agachadoFisico ? ' AGACHADO' : ''}`;
  }
  // Lo último que reportaron los mandos, para el panel de diagnóstico.
  const informe = {
    mandos: 0,
    gatillo: '-',
    grip: '-',
    botones: '',
    ejes: '-',
    giro: '0',
    vistas: 0,
    espacio: '-',
    cabeza: '-',
    salida: '-',
  };

  function revisarMandos() {
    const sesion = renderer.xr.getSession();
    if (!sesion) return;

    let saltar = false;
    let agachar = false;
    // Gatillo y grip crudos, para el gesto de salida: hay que saber si están
    // apretados AHORA, no sólo cuándo se apretaron.
    let gatillo = false;
    let grip = false;
    const apretados = [];
    const ejes = [];
    informe.mandos = sesion.inputSources.length;

    for (const fuente of sesion.inputSources) {
      const mando = fuente.gamepad;
      if (!mando) continue;
      if (mando.buttons[0]?.pressed) gatillo = true;
      if (mando.buttons[1]?.pressed) grip = true;
      // Mapeo 'xr-standard': 4 = A/X, 5 = B/Y. El gatillo (0) y el grip (1)
      // ya llegan por evento, así que acá se cubren los botones de pulgar.
      for (const i of XR.BOTONES_SALTAR) if (mando.buttons[i]?.pressed) saltar = true;
      for (const i of XR.BOTONES_AGACHARSE) if (mando.buttons[i]?.pressed) agachar = true;
      const eje = mando.axes[XR.EJE_VERTICAL] ?? 0;
      if (eje < -XR.UMBRAL_EJE) saltar = true;
      if (eje > XR.UMBRAL_EJE) agachar = true;

      // Para el diagnóstico se registran TODOS los botones y ejes, no sólo
      // los mapeados: si el Quest usa otros índices, así se ve cuáles.
      mando.buttons.forEach((b, i) => {
        if (b.pressed) apretados.push(i);
      });
      ejes.push(mando.axes.map((a) => a.toFixed(1)).join(','));
    }

    informe.botones = apretados.join(',');
    informe.ejes = ejes.join(' | ') || '-';

    if (saltar && !saltarAntes) acciones.saltar?.();
    if (agachar && !agacharAntes) acciones.agacharse?.();
    if (!agachar && agacharAntes) acciones.soltarAgacharse?.();
    saltarAntes = saltar;
    agacharAntes = agachar;

    revisarGestoSalida(sesion, gatillo && grip);
  }

  // Mantener los dos botones a la vez cierra la sesión. Se avisa el
  // progreso en pantalla: si no, mantenerlos parece que no hace nada, y
  // alguien que los apretó sin querer no entiende por qué se sale.
  function revisarGestoSalida(sesion, ambos) {
    if (!ambos) {
      if (salirDesde !== 0) acciones.avisar?.(''); // se soltó antes de tiempo
      salirDesde = 0;
      informe.salida = '-';
      return;
    }
    if (salirDesde === 0) salirDesde = performance.now();
    const falta = XR.SALIR_MANTENER_S - (performance.now() - salirDesde) / 1000;
    informe.salida = falta.toFixed(1);

    if (falta <= 0) {
      salirDesde = 0;
      acciones.avisar?.('');
      sesion.end();
    } else {
      acciones.avisar?.(`Saliendo de VR… ${Math.ceil(falta)}`);
    }
  }

  renderer.xr.addEventListener('sessionstart', () => {
    // El espacio de referencia ya quedó fijado al crear el renderer: tiene
    // que estar puesto ANTES de abrir la sesión, no después.
    //
    // Foveación: el visor dibuja con menos detalle la periferia, que es
    // donde la vista no enfoca. Es rendimiento gratis en un Quest, que
    // tiene que sostener dos ojos a 90 fps.
    renderer.xr.setFoveation(XR.FOVEACION);

    // El jugador queda detrás de Migue y un escalón por encima de la calle:
    // ver XR.RIG_Y para por qué no va al ras del piso.
    rig.position.set(0, XR.RIG_Y, XR.RIG_Z);
    rig.rotation.set(0, 0, 0);
    // El recentrado se hace en el bucle, no acá: recién en el primer cuadro
    // de la sesión hay una pose de cabeza real para medir.
    recentrarPendiente = true;
    vineta.visible = XR.VINETA_ACTIVA;
    pintarBoton('Salir de VR', true);
    conectarMandos(renderer.xr.getSession());
    alEntrar?.();
  });

  renderer.xr.addEventListener('sessionend', () => {
    rig.position.set(0, 0, 0);
    rig.rotation.set(0, 0, 0);
    vineta.visible = false;
    saltarAntes = false;
    agacharAntes = false;
    alturaReposo = 0;
    agachadoFisico = false;
    pintarBoton('Entrar en VR', true);
    alSalir?.();
  });

  // --- Detección de soporte y botón ---
  // El botón se agrega al DOM sólo si hay VR de verdad. Así el stand y el
  // celular no ven nada nuevo.
  async function inicializar() {
    if (!navigator.xr?.isSessionSupported) return;
    try {
      soportado = await navigator.xr.isSessionSupported('immersive-vr');
    } catch {
      soportado = false;
    }
    if (!soportado) return;

    boton = document.createElement('button');
    boton.id = 'boton-vr';
    boton.textContent = 'Entrar en VR';
    boton.addEventListener('click', () => {
      if (renderer.xr.isPresenting) renderer.xr.getSession()?.end();
      else entrar();
    });
    document.body.appendChild(boton);
    console.info('VR inmersiva disponible: botón agregado.');
  }
  inicializar();

  return {
    estaEnVR: () => renderer.xr.isPresenting,
    esSoportado: () => soportado,

    // Se llama una vez por cuadro desde el bucle principal.
    actualizar() {
      if (!renderer.xr.isPresenting) return;
      if (recentrarPendiente) {
        recentrarPendiente = false;
        recentrarRig(rig, camara);
      }
      revisarMandos();
      revisarAgacheFisico();
      if (diagnostico) {
        informe.giro = ((rig.rotation.y * 180) / Math.PI).toFixed(0);
        // La cámara de XR es una ArrayCamera con una subcámara por ojo:
        // 2 es lo correcto. Si diera 1, el renderizado estéreo no se armó.
        informe.vistas = renderer.xr.getCamera()?.cameras?.length ?? 0;
        informe.espacio = renderer.xr.getReferenceSpace() ? 'ok' : 'falta';
        diagnostico.actualizar(informe);
      }
    },

    // Para volver a orientar la escena a mano si alguien se corrió de lugar.
    recentrar() {
      recentrarPendiente = true;
    },
  };
}
