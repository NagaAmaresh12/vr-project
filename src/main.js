import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"; // Fixed import

let scene, camera, renderer, controller;
let model,
  buttonPressed = false;

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
  renderer.xr.enabled = true; // Enable VR
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
  renderer.xr.setFramebufferScaleFactor(1.5); // High-quality stereo rendering

  // Light Setup
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Soft lighting
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Load 3D Model
  const loader = new GLTFLoader();
  loader.load(
    "/models/refined_eagle.glb", // Fixed path for Vercel
    (gltf) => {
      model = gltf.scene;
      model.position.set(0, 1.3, -1);
      scene.add(model);
    },
    undefined, // onProgress
    (error) => console.error("Error loading model:", error) // Error handling
  );

  // VR Controller (Single Button)
  controller = renderer.xr.getController(0);
  if (controller) {
    // Prevent potential undefined errors
    controller.addEventListener("selectstart", onButtonPress);
    controller.addEventListener("selectend", onButtonRelease);
    scene.add(controller);
  }

  window.addEventListener("resize", onWindowResize);
}

// Handle VR Button Press (Toggle Scale)
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

// Animation Loop
function animate() {
  renderer.setAnimationLoop(() => {
    if (model) {
      model.rotation.y += 0.005; // Rotate Model Slightly
    }
    renderer.render(scene, camera);
  });
}
