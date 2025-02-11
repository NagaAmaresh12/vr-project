import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller;
let model = null;
const controllerState = {
  buttonPressed: false,
  targetRotation: new THREE.Quaternion(),
  targetPosition: new THREE.Vector3(0, 1.3, -1),
  isMoving: false,
  lastClickTime: 0,
};
const rotationStep = Math.PI / 2; // 90 degrees rotation
const moveStep = 0.3;
const moveLimit = { min: -2, max: -0.5 };
const cubicBezierEase = (t) => t * t * (3 - 2 * t);
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

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  const loader = new GLTFLoader();
  loader.load(
    "/models/refined_eagle.glb",
    (gltf) => {
      model = gltf.scene;
      model.position.copy(controllerState.targetPosition);
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

  window.addEventListener("resize", onWindowResize);
}

function onButtonPress() {
  const now = performance.now();
  if (now - controllerState.lastClickTime < 300) {
    resetModel();
  } else {
    controllerState.buttonPressed = true;
    detectRotationOrZoom();
  }
  controllerState.lastClickTime = now;
}

function onButtonRelease() {
  controllerState.buttonPressed = false;
}

function detectRotationOrZoom() {
  if (!model || !controller) return;

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  if (controllerState.buttonPressed) {
    // Head movement controls rotation
    if (Math.abs(direction.x) > 0.2) {
      rotateModel(direction.x > 0 ? "right" : "left");
    } else if (Math.abs(direction.y) > 0.2) {
      rotateModel(direction.y > 0 ? "down" : "up");
    }
  } else {
    // Single Click - Zoom in/out
    zoomModel();
  }
}

function rotateModel(direction) {
  if (!model) return;

  let newRotation = model.quaternion.clone();
  let rotationAxis = new THREE.Vector3();

  switch (direction) {
    case "left":
      rotationAxis.set(0, 1, 0);
      break;
    case "right":
      rotationAxis.set(0, -1, 0);
      break;
    case "up":
      rotationAxis.set(1, 0, 0);
      break;
    case "down":
      rotationAxis.set(-1, 0, 0);
      break;
  }

  const quaternion = new THREE.Quaternion().setFromAxisAngle(
    rotationAxis,
    rotationStep
  );
  newRotation.multiply(quaternion);
  controllerState.targetRotation.copy(newRotation);
}

function zoomModel() {
  if (!model) return;

  controllerState.targetPosition.z += moveStep * moveDirection;
  if (
    controllerState.targetPosition.z >= moveLimit.max ||
    controllerState.targetPosition.z <= moveLimit.min
  ) {
    moveDirection *= -1;
  }
}

function resetModel() {
  if (!model) return;

  model.quaternion.identity();
  controllerState.targetPosition.set(0, 1.3, -1);
}

function smoothMove() {
  if (model) {
    model.quaternion.slerp(controllerState.targetRotation, 0.08);
    model.position.lerp(controllerState.targetPosition, cubicBezierEase(0.05));
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(() => {
    smoothMove();
    renderer.render(scene, camera);
  });
}
