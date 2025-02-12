import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller, model, reticle;
let lastClickTime = 0;
let isPlacingModel = false;
let activeRotation = null;
let targetRotation = { x: 0, y: 0 };

init();
animate();

function init() {
  setupScene();
  setupCamera();
  setupRenderer();
  setupLighting();
  loadModel("/models/refined_eagle.glb");
  setupController();
  setupReticle();
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("dblclick", resetModelPosition);
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202020);
}

function setupCamera() {
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.5, 2);
}

function setupRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
}

function setupLighting() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
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

function setupController() {
  controller = renderer.xr.getController(0);
  controller.addEventListener("selectstart", onButtonPress);
  controller.addEventListener("selectend", onButtonRelease);
  scene.add(controller);
}

function setupReticle() {
  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.08, 32),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  reticle.position.set(0, 0, -1);
  reticle.rotation.x = -Math.PI / 2;
  camera.add(reticle);
  scene.add(camera);
}

function onButtonPress() {
  const now = performance.now();
  if (now - lastClickTime < 300) {
    placeModel();
  } else {
    determineRotation();
  }
  lastClickTime = now;
}

function placeModel() {
  if (!model) return;
  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyQuaternion(camera.quaternion);
  model.position.copy(camera.position).add(forward.multiplyScalar(2));
  model.lookAt(camera.position);
  model.rotation.set(0, 0, 0);
  isPlacingModel = true;
  activeRotation = null;
}

function resetModelPosition() {
  if (!model) return;
  placeModel();
}

function determineRotation() {
  if (!model || isPlacingModel) return;

  const cameraQuaternion = camera.quaternion;
  const euler = new THREE.Euler();
  euler.setFromQuaternion(cameraQuaternion, "YXZ");

  const yaw = euler.y;
  const pitch = euler.x;

  if (!activeRotation) {
    if (Math.abs(yaw) > Math.abs(pitch)) {
      targetRotation.y += Math.sign(yaw) * (Math.PI / 2);
      activeRotation = "horizontal";
    } else {
      targetRotation.x += Math.sign(pitch) * (Math.PI / 2);
      activeRotation = "vertical";
    }
  }
}

function onButtonRelease() {
  activeRotation = null;
  isPlacingModel = false;
}

function animate() {
  renderer.setAnimationLoop(() => {
    if (model) {
      if (!isPlacingModel) {
        model.rotation.y += (targetRotation.y - model.rotation.y) * 0.1;
        model.rotation.x += (targetRotation.x - model.rotation.x) * 0.1;
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
