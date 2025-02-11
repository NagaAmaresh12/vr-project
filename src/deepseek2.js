import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller;
let model = null;
const controllerState = {
  buttonPressed: false,
  targetRotation: new THREE.Quaternion(),
  targetPosition: new THREE.Vector3(0, 1.3, -1),
  lastClickTime: 0,
};
const rotationStep = Math.PI / 12; // 15 degrees rotation
const cubicBezierEase = (t) => t * t * (3 - 2 * t);

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
  controllerState.buttonPressed = true;
}

function onButtonRelease() {
  controllerState.buttonPressed = false;
}

function rotateModel() {
  if (!model || !controllerState.buttonPressed) return;

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  let newRotation = model.quaternion.clone();
  let localUp = new THREE.Vector3(0, 1, 0);
  let localRight = new THREE.Vector3(1, 0, 0);

  model.updateMatrixWorld();
  localUp.applyQuaternion(model.quaternion);
  localRight.applyQuaternion(model.quaternion);

  if (Math.abs(direction.x) > 0.1) {
    const yRotation = new THREE.Quaternion().setFromAxisAngle(
      localUp,
      -rotationStep * Math.sign(direction.x)
    );
    newRotation.multiply(yRotation);
  }

  if (Math.abs(direction.y) > 0.1) {
    const xRotation = new THREE.Quaternion().setFromAxisAngle(
      localRight,
      rotationStep * Math.sign(direction.y)
    );
    newRotation.multiply(xRotation);
  }

  controllerState.targetRotation.copy(newRotation);
}

function smoothMove() {
  if (model) {
    model.quaternion.slerp(controllerState.targetRotation, 0.08);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(() => {
    rotateModel();
    smoothMove();
    renderer.render(scene, camera);
  });
}
