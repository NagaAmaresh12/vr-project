import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller;
let model,
  buttonPressed = false;
let targetRotation = { x: 0, y: 0 };
let targetPosition = { z: -1 };
let isRotating = false,
  isMoving = false;
let longPressInterval = null;
let doubleClickTimer = null,
  clickCount = 0;
const rotationSpeed = 0.05;
const moveSpeed = 0.02;
const rotationStep = Math.PI / 2;
const moveStep = 0.3;
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
  loader.load("/models/refined_eagle.glb", (gltf) => {
    model = gltf.scene;
    model.position.set(0, 1.3, -1);
    scene.add(model);
  });

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
  clickCount++;
  if (clickCount === 1) {
    doubleClickTimer = setTimeout(() => (clickCount = 0), 300);
  } else if (clickCount === 2) {
    resetObject();
    clickCount = 0;
  }

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  if (Math.abs(direction.x) > 0.4) {
    startRotation(direction.x < 0 ? "left" : "right");
  } else if (Math.abs(direction.y) > 0.4) {
    startRotation(direction.y > 0 ? "up" : "down");
  } else {
    startMovement();
  }
}

function onButtonRelease() {
  stopRotation();
  stopMovement();
}

function startRotation(direction) {
  if (longPressInterval) clearInterval(longPressInterval);
  isRotating = true;
  longPressInterval = setInterval(() => {
    if (direction === "left") targetRotation.y -= rotationStep;
    else if (direction === "right") targetRotation.y += rotationStep;
    else if (direction === "up") targetRotation.x -= rotationStep;
    else if (direction === "down") targetRotation.x += rotationStep;
  }, 300);
}

function stopRotation() {
  isRotating = false;
  clearInterval(longPressInterval);
}

function startMovement() {
  if (longPressInterval) clearInterval(longPressInterval);
  isMoving = true;
  longPressInterval = setInterval(() => {
    targetPosition.z += moveStep;
  }, 300);
}

function stopMovement() {
  isMoving = false;
  clearInterval(longPressInterval);
}

function resetObject() {
  targetRotation = { x: 0, y: 0 };
  targetPosition = { z: -1 };
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function smoothRotate() {
  if (model) {
    model.rotation.x = THREE.MathUtils.lerp(
      model.rotation.x,
      targetRotation.x,
      cubicBezierEase(rotationSpeed)
    );
    model.rotation.y = THREE.MathUtils.lerp(
      model.rotation.y,
      targetRotation.y,
      cubicBezierEase(rotationSpeed)
    );
  }
}

function smoothMove() {
  if (model) {
    model.position.z = THREE.MathUtils.lerp(
      model.position.z,
      targetPosition.z,
      cubicBezierEase(moveSpeed)
    );
  }
}

function animate() {
  renderer.setAnimationLoop(() => {
    smoothRotate();
    smoothMove();
    renderer.render(scene, camera);
  });
}
