import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller, model;
let buttonPressed = false;
let targetRotationY = 0;
let targetRotationX = 0;
const rotationSpeed = 0.02;
const maxRotation = Math.PI / 2; // 90 degrees

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

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

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
  updateRotationTarget();
}

function onButtonRelease() {
  buttonPressed = false;
}

function updateRotationTarget() {
  const lookDirection = new THREE.Vector3();
  camera.getWorldDirection(lookDirection);

  if (Math.abs(lookDirection.x) > Math.abs(lookDirection.y)) {
    // Left/Right rotation
    targetRotationY = lookDirection.x > 0 ? -maxRotation : maxRotation;
    targetRotationX = 0; // Ensure no vertical movement
  } else {
    // Up/Down rotation
    targetRotationX = lookDirection.y > 0 ? maxRotation : -maxRotation;
    targetRotationY = 0; // Ensure no horizontal movement
  }
}

function animate() {
  renderer.setAnimationLoop(() => {
    if (model) {
      // Smoothly rotate towards target
      model.rotation.y += (targetRotationY - model.rotation.y) * rotationSpeed;
      model.rotation.x += (targetRotationX - model.rotation.x) * rotationSpeed;
    }

    renderer.render(scene, camera);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
