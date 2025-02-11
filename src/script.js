import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller;
let model,
  buttonPressed = false;
let gazeTimer = null;
const gazeThreshold = 2000; // 2 seconds
const rotationAmount = Math.PI / 2; // 90 degrees
let lastRotation = { x: 0, y: 0 }; // Track previous rotations

init();
animate();

function init() {
  // Scene Setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202020);

  // Camera Setup
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.5, 2);

  // Renderer Setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Load 3D Model
  const loader = new GLTFLoader();
  loader.load("/models/refined_eagle.glb", (gltf) => {
    model = gltf.scene;
    model.position.set(0, 1.3, -1);
    scene.add(model);
  });

  // VR Controller (Single Button)
  controller = renderer.xr.getController(0);
  if (controller) {
    controller.addEventListener("selectstart", onButtonPress);
    controller.addEventListener("selectend", onButtonRelease);
    scene.add(controller);
  }

  // Add Pointer UI
  addPointer();

  window.addEventListener("resize", onWindowResize);
}

// VR Button Interaction (Scale Model)
function onButtonPress() {
  if (model) {
    buttonPressed = !buttonPressed;
    model.scale.set(
      buttonPressed ? 1.5 : 1,
      buttonPressed ? 1.5 : 1,
      buttonPressed ? 1.5 : 1
    );
  }
}

function onButtonRelease() {
  console.log("Button Released");
}

// Window Resize Handling
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Add Pointer UI
function addPointer() {
  const pointerGeometry = new THREE.RingGeometry(0.02, 0.03, 32);
  const pointerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });
  const pointer = new THREE.Mesh(pointerGeometry, pointerMaterial);
  pointer.position.set(0, 0, -1); // Place in front of camera
  camera.add(pointer);
  scene.add(camera);
}

// Handle Gaze Rotation
function checkGazeDirection() {
  if (!model) return;

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  const gazeX = direction.x;
  const gazeY = direction.y;

  let rotateLeft = gazeX < -0.5;
  let rotateRight = gazeX > 0.5;
  let rotateUp = gazeY > 0.5;
  let rotateDown = gazeY < -0.5;

  if (rotateLeft && lastRotation.y !== -rotationAmount) {
    triggerRotation("left");
  } else if (rotateRight && lastRotation.y !== rotationAmount) {
    triggerRotation("right");
  } else if (rotateUp && lastRotation.x !== -rotationAmount) {
    triggerRotation("up");
  } else if (rotateDown && lastRotation.x !== rotationAmount) {
    triggerRotation("down");
  } else {
    clearTimeout(gazeTimer);
    gazeTimer = null;
  }
}

function triggerRotation(direction) {
  if (gazeTimer) return;

  gazeTimer = setTimeout(() => {
    if (direction === "left") {
      model.rotation.y -= rotationAmount;
      lastRotation.y -= rotationAmount;
    } else if (direction === "right") {
      model.rotation.y += rotationAmount;
      lastRotation.y += rotationAmount;
    } else if (direction === "up") {
      model.rotation.x -= rotationAmount;
      lastRotation.x -= rotationAmount;
    } else if (direction === "down") {
      model.rotation.x += rotationAmount;
      lastRotation.x += rotationAmount;
    }

    gazeTimer = null;
  }, gazeThreshold);
}

// Animation Loop
function animate() {
  renderer.setAnimationLoop(() => {
    checkGazeDirection(); // Continuously check gaze
    renderer.render(scene, camera);
  });
}
