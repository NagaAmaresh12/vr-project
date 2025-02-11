import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller;
let model = null;
const controllerState = {
  isRotating: false,
  isZooming: false,
  rotationAxis: new THREE.Vector3(),
  zoomDirection: 1,
  lastClickTime: 0,
  rotationAngle: 0,
};

const rotationStep = Math.PI / 2; // 90 degrees
const zoomSpeed = 0.05;
const zoomLimits = { min: -2, max: -0.5 };
const cubicBezierEase = (t) => t * t * (3 - 2 * t);

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202020);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.5, 2);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const loader = new GLTFLoader();
  loader.load(
    "/models/refined_eagle.glb",
    (gltf) => {
      model = gltf.scene;
      model.position.set(0, 1.3, -1); // Initial position
      model.rotation.set(0, 0, 0); // Start in correct orientation
      scene.add(model);
    },
    undefined,
    (error) => console.error("Model loading error:", error)
  );

  controller = renderer.xr.getController(0);
  if (controller) {
    controller.addEventListener("selectstart", onButtonPress);
    controller.addEventListener("selectend", onButtonRelease);
    scene.add(controller);
  }

  window.addEventListener("resize", onWindowResize);
}

function onButtonPress() {
  const now = performance.now();
  const timeSinceLastClick = now - controllerState.lastClickTime;
  controllerState.lastClickTime = now;

  if (timeSinceLastClick < 300) {
    resetModelOrientation();
  } else {
    detectRotationDirection();
    controllerState.isRotating = true;
  }
}

function onButtonRelease() {
  controllerState.isRotating = false;
}

function detectRotationDirection() {
  if (!model || !controller) return;

  const headDirection = new THREE.Vector3();
  camera.getWorldDirection(headDirection);

  if (Math.abs(headDirection.x) > Math.abs(headDirection.y)) {
    // Rotate left or right
    controllerState.rotationAxis.set(0, 1, 0);
    controllerState.rotationAngle =
      headDirection.x > 0 ? -rotationStep : rotationStep;
  } else {
    // Rotate up or down
    controllerState.rotationAxis.set(1, 0, 0);
    controllerState.rotationAngle =
      headDirection.y > 0 ? -rotationStep : rotationStep;
  }
}

function resetModelOrientation() {
  if (!model) return;
  model.rotation.set(0, 0, 0);
}

function zoomModel() {
  if (!model) return;
  model.position.z = THREE.MathUtils.clamp(
    model.position.z + zoomSpeed * controllerState.zoomDirection,
    zoomLimits.min,
    zoomLimits.max
  );
}

function animate() {
  renderer.setAnimationLoop(() => {
    if (controllerState.isRotating && model) {
      model.rotateOnAxis(
        controllerState.rotationAxis,
        cubicBezierEase(rotationStep)
      );
    }

    renderer.render(scene, camera);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
