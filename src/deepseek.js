import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller;
let model = null;
const controllerState = {
  longPressThreshold: 500,
  pressStartTime: 0,
  clickCount: 0,
  clickTimeout: null,
  isRotating: false,
  initialModelRotation: new THREE.Euler(),
  initialCameraRotation: new THREE.Euler(),
  targetRotation: { x: 0, y: 0 },
  zoomState: "out",
  transitions: {
    rotation: {
      active: false,
      start: new THREE.Euler(),
      duration: 1000,
      startTime: 0,
    },
    position: {
      active: false,
      start: 0,
      target: -1,
      duration: 1000,
      startTime: 0,
    },
  },
};

const rotationSpeed = 0.02;
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

  // Lighting setup
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  // Load model
  new GLTFLoader().load(
    "/models/refined_eagle.glb",
    (gltf) => {
      model = gltf.scene;
      scene.add(model);
      controllerState.initialModelRotation.copy(model.rotation);
      controllerState.targetRotation.y = model.rotation.y;
      controllerState.targetRotation.x = model.rotation.x;
    },
    undefined,
    (error) => console.error("Model loading error:", error)
  );

  // Controller setup
  controller = renderer.xr.getController(0);
  controller.addEventListener("selectstart", onSelectStart);
  controller.addEventListener("selectend", onSelectEnd);
  scene.add(controller);

  window.addEventListener("resize", onWindowResize);
}

function onSelectStart() {
  controllerState.pressStartTime = performance.now();
  controllerState.longPressTimeout = setTimeout(
    startRotation,
    controllerState.longPressThreshold
  );
}

function onSelectEnd() {
  const pressDuration = performance.now() - controllerState.pressStartTime;
  clearTimeout(controllerState.longPressTimeout);

  if (pressDuration < controllerState.longPressThreshold) {
    handleClick();
  } else {
    stopRotation();
  }
}

function handleClick() {
  controllerState.clickCount++;

  if (controllerState.clickCount === 1) {
    controllerState.clickTimeout = setTimeout(() => {
      toggleZoom();
      controllerState.clickCount = 0;
    }, 300);
  } else {
    clearTimeout(controllerState.clickTimeout);
    resetOrientation();
    controllerState.clickCount = 0;
  }
}

function startRotation() {
  if (!model) return;
  controllerState.isRotating = true;
  controllerState.initialModelRotation.copy(model.rotation);
  controllerState.initialCameraRotation.setFromQuaternion(camera.quaternion);
  startRotationTransition();
}

function stopRotation() {
  controllerState.isRotating = false;
}

function startRotationTransition() {
  controllerState.transitions.rotation.active = true;
  controllerState.transitions.rotation.start.copy(model.rotation);
  controllerState.transitions.rotation.startTime = performance.now();
}

function toggleZoom() {
  const newZ =
    controllerState.zoomState === "out" ? zoomLimits.min : zoomLimits.max;
  controllerState.zoomState =
    controllerState.zoomState === "out" ? "in" : "out";
  startPositionTransition(newZ);
}

function resetOrientation() {
  if (!model) return;
  controllerState.targetRotation.x = controllerState.initialModelRotation.x;
  controllerState.targetRotation.y = controllerState.initialModelRotation.y;
  startRotationTransition();
  startPositionTransition(-1);
}

function startPositionTransition(targetZ) {
  controllerState.transitions.position.active = true;
  controllerState.transitions.position.start = model.position.z;
  controllerState.transitions.position.target = targetZ;
  controllerState.transitions.position.startTime = performance.now();
}

function updateTransitions() {
  // Handle rotation transition
  if (controllerState.transitions.rotation.active) {
    const elapsed =
      performance.now() - controllerState.transitions.rotation.startTime;
    const t = Math.min(
      elapsed / controllerState.transitions.rotation.duration,
      1
    );

    model.rotation.x = THREE.MathUtils.lerp(
      controllerState.transitions.rotation.start.x,
      controllerState.targetRotation.x,
      cubicBezierEase(t)
    );

    model.rotation.y = THREE.MathUtils.lerp(
      controllerState.transitions.rotation.start.y,
      controllerState.targetRotation.y,
      cubicBezierEase(t)
    );

    if (t === 1) controllerState.transitions.rotation.active = false;
  }

  // Handle position transition
  if (controllerState.transitions.position.active) {
    const elapsed =
      performance.now() - controllerState.transitions.position.startTime;
    const t = Math.min(
      elapsed / controllerState.transitions.position.duration,
      1
    );

    model.position.z = THREE.MathUtils.lerp(
      controllerState.transitions.position.start,
      controllerState.transitions.position.target,
      cubicBezierEase(t)
    );

    if (t === 1) controllerState.transitions.position.active = false;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(() => {
    if (controllerState.isRotating && model) {
      const currentCameraRotation = new THREE.Euler().setFromQuaternion(
        camera.quaternion
      );
      const deltaY =
        currentCameraRotation.y - controllerState.initialCameraRotation.y;
      const deltaX =
        currentCameraRotation.x - controllerState.initialCameraRotation.x;

      controllerState.targetRotation.y =
        controllerState.initialModelRotation.y + deltaY * 2;
      controllerState.targetRotation.x =
        controllerState.initialModelRotation.x + deltaX * 2;
      startRotationTransition();
    }

    updateTransitions();
    renderer.render(scene, camera);
  });
}
