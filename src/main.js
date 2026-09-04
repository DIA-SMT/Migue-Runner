// main.js — bootstrap de la escena y bucle principal.
//
// Estado actual del proyecto: vista previa de arte (fases 6 y 7 adelantadas
// a pedido): el mundo tucumano en movimiento con Migue corriendo. El gameplay
// (salto, agachada, obstáculos, trivia) llega en las fases siguientes.
// La página de diagnóstico de teclas (Fase 1) quedó en /test-entrada.html.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PALETA, MUNDO, CAMARA, LUCES, POST, RENDER } from './config.js';
import { crearMundo } from './world.js';
import { crearMigue } from './player.js';

// ---------------------------------------------------------------------------
// Renderer y canvas
// ---------------------------------------------------------------------------
const app = document.querySelector('#app');

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.MAX_PIXEL_RATIO));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Sin tone mapping: la dirección de arte es de colores planos y el ACES
// lava la paleta (el OutputPass lo aplicaría a todo el frame por igual).
renderer.toneMapping = THREE.NoToneMapping;
app.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Escena, cámara y luces
// ---------------------------------------------------------------------------
const escena = new THREE.Scene();

const camara = new THREE.PerspectiveCamera(CAMARA.FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
camara.position.set(CAMARA.POSICION.x, CAMARA.POSICION.y, CAMARA.POSICION.z);
camara.lookAt(CAMARA.MIRA.x, CAMARA.MIRA.y, CAMARA.MIRA.z);

// Una direccional cálida con sombra suave + una ambiental fría de relleno.
// Nada más (regla de la dirección de arte).
const luzCalida = new THREE.DirectionalLight(PALETA.LUZ_CALIDA, LUCES.CALIDA_INTENSIDAD);
luzCalida.position.set(7, 12, 5);
luzCalida.castShadow = true;
luzCalida.shadow.mapSize.set(1024, 1024);
luzCalida.shadow.camera.left = -14;
luzCalida.shadow.camera.right = 14;
luzCalida.shadow.camera.top = 14;
luzCalida.shadow.camera.bottom = -14;
luzCalida.shadow.camera.far = 40;
luzCalida.shadow.bias = -0.002;
escena.add(luzCalida);

const luzFria = new THREE.AmbientLight(PALETA.LUZ_FRIA, LUCES.FRIA_INTENSIDAD);
escena.add(luzFria);

// ---------------------------------------------------------------------------
// Post-procesado: bloom sutil, y nada más.
// ---------------------------------------------------------------------------
const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
  samples: RENDER.MSAA_MUESTRAS,
  type: THREE.HalfFloatType,
});
const composer = new EffectComposer(renderer, renderTarget);
composer.addPass(new RenderPass(escena, camara));
composer.addPass(
  new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    POST.BLOOM_FUERZA,
    POST.BLOOM_RADIO,
    POST.BLOOM_UMBRAL,
  ),
);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------
// Contenido
// ---------------------------------------------------------------------------
const mundo = crearMundo(escena);

let migue = null;
crearMigue(escena).then((resultado) => {
  migue = resultado;
  document.querySelector('#cargando')?.remove();
});

// ---------------------------------------------------------------------------
// Bucle principal
// ---------------------------------------------------------------------------
const reloj = new THREE.Clock();

function cuadro() {
  // dt acotado: si la pestaña estuvo en segundo plano, no dar un salto gigante.
  const dt = Math.min(reloj.getDelta(), 0.05);

  mundo.actualizar(dt, MUNDO.VELOCIDAD);
  migue?.actualizar(dt);

  composer.render();
  requestAnimationFrame(cuadro);
}
requestAnimationFrame(cuadro);

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
