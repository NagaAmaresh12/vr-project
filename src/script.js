import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller;
let model = null;
const controllerState = {
  lastClickTime: 0,
  isMoving: false,
  movementInterval: null,
};
const moveStep = 0.03;
const moveLimit = { min: -2, max: -0.5 };
let moveDirection = 1;

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

  const light = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(light);

  const loader = new GLTFLoader();
  loader.load(
    "/models/refined_eagle.glb",
    (gltf) => {
      model = gltf.scene;
      scene.add(model);
      resetObjectRotation();
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
  if (now - controllerState.lastClickTime < 300) {
    placeObject(); // Double click: Place object instantly
  } else {
    startMovement(); // Long press: Move the object back and forth
  }
  controllerState.lastClickTime = now;
}

function onButtonRelease() {
  stopMovement();
}

function placeObject() {
  if (!model) return;

  const worldPosition = new THREE.Vector3();
  const direction = new THREE.Vector3();

  controller.getWorldPosition(worldPosition);
  controller.getWorldDirection(direction);

  const fixedDistance = 1.5;
  worldPosition.addScaledVector(direction, fixedDistance);

  model.position.set(worldPosition.x, worldPosition.y, worldPosition.z);
  resetObjectRotation();
}

function startMovement() {
  if (controllerState.movementInterval)
    clearInterval(controllerState.movementInterval);
  controllerState.isMoving = true;

  controllerState.movementInterval = setInterval(() => {
    if (!model) return;
    model.position.z += moveStep * moveDirection;
    if (
      model.position.z >= moveLimit.max ||
      model.position.z <= moveLimit.min
    ) {
      moveDirection *= -1;
    }
  }, 100);
}

function stopMovement() {
  controllerState.isMoving = false;
  clearInterval(controllerState.movementInterval);
}

function resetObjectRotation() {
  if (model) {
    model.rotation.set(0, 0, 0);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}
