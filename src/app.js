import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller;
let model,
  buttonPressed = false;
let lastGazeDirection = "";
let gazeTimer = null;

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
  renderer.xr.setFramebufferScaleFactor(1.5);

  // Light Setup
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Load 3D Model
  const loader = new GLTFLoader();
  loader.load(
    "/models/refined_eagle.glb",
    (gltf) => {
      model = gltf.scene;
      model.position.set(0, 1.3, -1);
      scene.add(model);
    },
    undefined,
    (error) => console.error("Error loading model:", error)
  );

  // VR Controller (Single Button for Scaling)
  if (!controller) {
    controller = renderer.xr.getController(0);
    controller.addEventListener("selectstart", onButtonPress);
    controller.addEventListener("selectend", onButtonRelease);
    scene.add(controller);
  }

  window.addEventListener("resize", onWindowResize);
}

// Handle VR Button Press (Move Object Closer/Farther)
function onButtonPress() {
  if (model) {
    buttonPressed = !buttonPressed;
    model.position.z += buttonPressed ? -0.5 : 0.5;
  }
}

// Handle VR Button Release
function onButtonRelease() {
  console.log("Button Released");
}

// Resize Handler
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Detect Gaze Direction and Rotate Model
function checkGazeDirection() {
  const gazeDirection = new THREE.Vector3();
  camera.getWorldDirection(gazeDirection);

  let newDirection = "";

  if (gazeDirection.x > 0.5) newDirection = "right";
  else if (gazeDirection.x < -0.5) newDirection = "left";
  else if (gazeDirection.y > 0.5) newDirection = "up";
  else if (gazeDirection.y < -0.5) newDirection = "down";

  if (newDirection) {
    startGazeRotation(newDirection);
  } else {
    clearGazeTimer();
  }
}

// Start Gaze Timer for Rotation
function startGazeRotation(direction) {
  if (lastGazeDirection !== direction) {
    clearGazeTimer();
    gazeTimer = setTimeout(() => {
      rotateModel(direction);
      lastGazeDirection = "";
    }, 2000);
    lastGazeDirection = direction;
  }
}

// Clear Gaze Timer
function clearGazeTimer() {
  if (gazeTimer) {
    clearTimeout(gazeTimer);
    gazeTimer = null;
  }
}

// Rotate Model in 90-degree Steps
function rotateModel(direction) {
  if (!model) return;

  switch (direction) {
    case "left":
      model.rotation.y =
        Math.round((model.rotation.y + Math.PI / 2) * 100) / 100;
      break;
    case "right":
      model.rotation.y =
        Math.round((model.rotation.y - Math.PI / 2) * 100) / 100;
      break;
    case "up":
      model.rotation.x =
        Math.round((model.rotation.x - Math.PI / 2) * 100) / 100;
      break;
    case "down":
      model.rotation.x =
        Math.round((model.rotation.x + Math.PI / 2) * 100) / 100;
      break;
  }
}

// Animation Loop
function animate() {
  renderer.setAnimationLoop(() => {
    checkGazeDirection();
    renderer.render(scene, camera);
  });
}
