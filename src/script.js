import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller;
let model,
  buttonPressed = false;
let gazeTimer = null;
const gazeThreshold = 2000; // 2 seconds
const rotationSpeed = 0.05; // Smooth rotation speed
let targetRotation = { x: 0, y: 0 };

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

  addPointer();
  window.addEventListener("resize", onWindowResize);
}

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

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function addPointer() {
  const pointerGeometry = new THREE.RingGeometry(0.02, 0.03, 32);
  const pointerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });
  const pointer = new THREE.Mesh(pointerGeometry, pointerMaterial);
  pointer.position.set(0, 0, -1);
  camera.add(pointer);
  scene.add(camera);
}

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

  if (rotateLeft) {
    targetRotation.y -= Math.PI / 2;
  } else if (rotateRight) {
    targetRotation.y += Math.PI / 2;
  } else if (rotateUp) {
    targetRotation.x -= Math.PI / 2;
  } else if (rotateDown) {
    targetRotation.x += Math.PI / 2;
  }
}

function smoothRotate() {
  if (model) {
    model.rotation.y = THREE.MathUtils.lerp(
      model.rotation.y,
      targetRotation.y,
      rotationSpeed
    );
    model.rotation.x = THREE.MathUtils.lerp(
      model.rotation.x,
      targetRotation.x,
      rotationSpeed
    );
  }
}

function animate() {
  renderer.setAnimationLoop(() => {
    checkGazeDirection();
    smoothRotate();
    renderer.render(scene, camera);
  });
}
