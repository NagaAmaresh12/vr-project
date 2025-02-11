import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller, model;
let buttonPressed = false;
let targetRotationY = 0; // Track rotation target
let longPressActive = false;

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

  // VR Controller Setup
  controller = renderer.xr.getController(0);
  if (controller) {
    controller.addEventListener("selectstart", onButtonPress);
    controller.addEventListener("selectend", onButtonRelease);
    scene.add(controller);
  }

  window.addEventListener("resize", onWindowResize);
}

function onButtonPress() {
  buttonPressed = true;
  const headDirection = getHeadDirection();

  if (Math.abs(headDirection) > 0.2) {
    // 90-degree rotation per click
    targetRotationY += (Math.sign(headDirection) * Math.PI) / 2;
    longPressActive = false;
  } else {
    longPressActive = true; // Enable continuous rotation if head is moving slightly
  }
}

function onButtonRelease() {
  buttonPressed = false;
  longPressActive = false;
}

function getHeadDirection() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  return direction.x; // Get left/right head movement
}

function animate() {
  renderer.setAnimationLoop(() => {
    if (model) {
      // Smooth transition to 90-degree increments
      model.rotation.y += (targetRotationY - model.rotation.y) * 0.1;

      // Continuous rotation on long press
      if (buttonPressed && longPressActive) {
        model.rotation.y += getHeadDirection() * 0.05;
      }
    }
    renderer.render(scene, camera);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
