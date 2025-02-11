import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller;
let model = null;
const controllerState = {
  buttonPressed: false,
  targetPosition: { z: -1 },
  isMoving: false,
  longPressInterval: null,
  lastClickTime: 0,
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
      resetObjectRotation(); // Ensure initial direction is straight
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
    placeObject(); // Double click: Move instantly where looking
  } else {
    startMovement(); // Long press: Move back and forth
  }
  controllerState.lastClickTime = now;
}

function onButtonRelease() {
  stopMovement();
}

// ✅ **Double Click: Place Object Instantly**
function placeObject() {
  if (!model) return;

  const worldPosition = new THREE.Vector3();
  const direction = new THREE.Vector3();

  // Get controller position and direction
  controller.getWorldPosition(worldPosition);
  controller.getWorldDirection(direction);

  // Set a fixed distance from the user
  const fixedDistance = 1.5; // Adjust as needed
  worldPosition.addScaledVector(direction, fixedDistance);

  // Place object at the computed position
  model.position.set(worldPosition.x, worldPosition.y, worldPosition.z);

  // Reset rotation to make the object face forward
  resetObjectRotation();
  controllerState.targetPosition.z = model.position.z;
}

// ✅ **Long Press: Move and Rotate Dynamically**
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
      moveDirection *= -1; // Change direction at limits
    }

    // Rotate object **only when user moves head**
    if (model && controller) {
      const direction = new THREE.Vector3();
      controller.getWorldDirection(direction);

      model.rotation.y = Math.atan2(direction.x, direction.z); // Rotate based on head direction
      model.rotation.x = 0; // Keep upright
    }
  }, 100);
}

function stopMovement() {
  controllerState.isMoving = false;
  clearInterval(controllerState.longPressInterval);
}

// ✅ **Helper: Reset Object Rotation to Face Forward**
function resetObjectRotation() {
  if (model) {
    model.rotation.set(0, 0, 0); // Reset to default
  }
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
      0.1
    );
  }
}

function animate() {
  renderer.setAnimationLoop(() => {
    smoothMove();
    renderer.render(scene, camera);
  });
}
