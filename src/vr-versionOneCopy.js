import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller, model;
let buttonPressed = false;
let targetRotationY = 0; // Left-right rotation
let targetRotationX = 0; // Up-down rotation
let longPressActive = false;
let activeRotation = null; // Track active rotation direction ('horizontal' or 'vertical')

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
  const headDirectionX = getHeadDirectionX(); // Left-right movement
  const headDirectionY = getHeadDirectionY(); // Up-down movement

  if (Math.abs(headDirectionX) > 0.2 && !activeRotation) {
    // If moving left/right and no active rotation, set horizontal rotation
    targetRotationY += Math.sign(headDirectionX) * (Math.PI / 2);
    activeRotation = "horizontal";
    longPressActive = false;
  } else if (Math.abs(headDirectionY) > 0.2 && !activeRotation) {
    // If moving up/down and no active rotation, set vertical rotation
    targetRotationX += Math.sign(headDirectionY) * (Math.PI / 2);
    activeRotation = "vertical";
    longPressActive = false;
  } else {
    longPressActive = true;
  }
}

function onButtonRelease() {
  buttonPressed = false;
  longPressActive = false;
  activeRotation = null; // Reset active rotation after button release
}

function getHeadDirectionX() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  return direction.x; // Left-right movement
}

function getHeadDirectionY() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  return direction.y; // Up-down movement
}

function animate() {
  renderer.setAnimationLoop(() => {
    if (model) {
      // Smooth transition to 90-degree increments
      if (activeRotation === "horizontal") {
        model.rotation.y += (targetRotationY - model.rotation.y) * 0.1;
      } else if (activeRotation === "vertical") {
        model.rotation.x += (targetRotationX - model.rotation.x) * 0.1;
      }

      // Continuous rotation on long press
      if (buttonPressed && longPressActive) {
        if (activeRotation === "horizontal") {
          model.rotation.y += getHeadDirectionX() * 0.05;
        } else if (activeRotation === "vertical") {
          model.rotation.x += getHeadDirectionY() * 0.05;
        }
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
