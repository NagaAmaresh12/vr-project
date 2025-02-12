import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller, model, reticle;
let buttonPressed = false;
let targetRotationY = 0;
let targetRotationX = 0;
let lastClickTime = 0;
let isPlacingModel = false; // Track if model was just placed

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

  loadModel("/models/refined_eagle.glb");

  controller = renderer.xr.getController(0);
  controller.addEventListener("selectstart", onButtonPress);
  controller.addEventListener("selectend", onButtonRelease);
  scene.add(controller);

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.08, 32),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  reticle.position.set(0, 0, -1);
  reticle.rotation.x = -Math.PI / 2;
  camera.add(reticle);
  scene.add(camera);

  window.addEventListener("resize", onWindowResize);
}

function loadModel(path) {
  const loader = new GLTFLoader();
  loader.load(
    path,
    (gltf) => {
      model = gltf.scene;
      model.position.set(0, 1.3, -1);
      scene.add(model);
    },
    undefined,
    (error) => console.error("Error loading model:", error)
  );
}

function onButtonPress() {
  const now = performance.now();
  if (now - lastClickTime < 300) {
    placeModel();
  } else {
    rotateModel();
  }
  lastClickTime = now;
  buttonPressed = true;
}

function placeModel() {
  if (!model) return;

  // Move the model forward in the camera's direction
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  model.position.copy(camera.position).add(direction.multiplyScalar(2));

  // Keep the model's original orientation after placement
  isPlacingModel = true;
}

function rotateModel() {
  if (!model) return;

  const headDirectionX = getHeadDirectionX();
  const headDirectionY = getHeadDirectionY();

  if (Math.abs(headDirectionX) > 0.2) {
    targetRotationY += Math.sign(headDirectionX) * (Math.PI / 2);
  }
  if (Math.abs(headDirectionY) > 0.2) {
    targetRotationX += Math.sign(headDirectionY) * (Math.PI / 2);
  }
}

function onButtonRelease() {
  buttonPressed = false;
  isPlacingModel = false;
}

function getHeadDirectionX() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  return direction.x;
}

function getHeadDirectionY() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  return direction.y;
}

function animate() {
  renderer.setAnimationLoop(() => {
    if (model) {
      if (!isPlacingModel) {
        // Ensure rotation is applied smoothly
        model.rotation.y += (targetRotationY - model.rotation.y) * 0.1;
        model.rotation.x += (targetRotationX - model.rotation.x) * 0.1;
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
