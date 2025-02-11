import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller, model;
let isRotating = false;
const rotationTarget = new THREE.Quaternion();

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
      model.position.set(0, 1.3, -1); // Start centered and slightly away
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
  if (!model) return;
  isRotating = true;

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  const targetRotation = new THREE.Euler();
  targetRotation.y = Math.atan2(direction.x, direction.z);
  targetRotation.x = -Math.asin(direction.y);

  rotationTarget.setFromEuler(targetRotation);
}

function onButtonRelease() {
  isRotating = false;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(() => {
    if (model && isRotating) {
      model.quaternion.slerp(rotationTarget, 0.08); // Smooth rotation with easing
    }
    renderer.render(scene, camera);
  });
}
