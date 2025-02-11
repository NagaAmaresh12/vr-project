import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller;
let model = null;
const controllerState = {
  buttonPressed: false,
  targetRotation: { x: 0, y: 0 },
  targetPosition: { z: -1 },
  isMoving: false,
  longPressInterval: null,
  lastClickTime: 0,
};
const rotationSpeed = 0.05;
const moveSpeed = 0.02;
const moveStep = 0.03;
const moveLimit = { min: -2, max: -0.5 };
let moveDirection = 1;
const cubicBezierEase = (t) => t * t * (3 - 2 * t);
let pointer;

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
    encodeURI("/models/refined_eagle.glb"),
    (gltf) => {
      model = gltf.scene;
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

  // Add pointer in center
  const geometry = new THREE.CircleGeometry(0.01, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  pointer = new THREE.Mesh(geometry, material);
  pointer.position.set(0, 0, -0.5);
  camera.add(pointer);
  scene.add(camera);

  window.addEventListener("resize", onWindowResize);
}

function onButtonPress() {
  const now = performance.now();
  if (now - controllerState.lastClickTime < 300) {
    placeObject();
  } else {
    startMovement();
  }
  controllerState.lastClickTime = now;
}

function onButtonRelease() {
  stopMovement();
}

function placeObject() {
  if (!model) return;
  const worldPosition = new THREE.Vector3();
  pointer.getWorldPosition(worldPosition);
  model.position.set(worldPosition.x, worldPosition.y, worldPosition.z);
  controllerState.targetPosition.z = model.position.z;
}

function startMovement() {
  if (controllerState.longPressInterval)
    clearInterval(controllerState.longPressInterval);
  controllerState.isMoving = true;
  controllerState.longPressInterval = setInterval(() => {
    controllerState.targetPosition.z += moveStep * moveDirection;
    if (
      controllerState.targetPosition.z >= moveLimit.max ||
      controllerState.targetPosition.z <= moveLimit.min
    ) {
      moveDirection *= -1;
    }
  }, 100);
}

function stopMovement() {
  controllerState.isMoving = false;
  clearInterval(controllerState.longPressInterval);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function smoothMove() {
  if (model) {
    model.position.z = THREE.MathUtils.lerp(
      model.position.z,
      controllerState.targetPosition.z,
      cubicBezierEase(moveSpeed)
    );
  }
}

function animate() {
  renderer.setAnimationLoop(() => {
    smoothMove();
    renderer.render(scene, camera);
  });
}
