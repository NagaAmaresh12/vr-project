import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller, model, reticle;
let arrows = {};
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
  setupArrows();
  window.addEventListener("resize", onWindowResize);
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

function setupArrows() {
  const arrowPositions = {
    up: { x: 0, y: 0.2, z: -0.5 },
    down: { x: 0, y: -0.2, z: -0.5 },
    left: { x: -0.2, y: 0, z: -0.5 },
    right: { x: 0.2, y: 0, z: -0.5 },
    center: { x: 0, y: 0, z: -0.5 },
  };

  Object.keys(arrowPositions).forEach((dir) => {
    const arrow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.1),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
      })
    );
    arrow.position.set(
      arrowPositions[dir].x,
      arrowPositions[dir].y,
      arrowPositions[dir].z
    );
    scene.add(arrow);
    arrows[dir] = arrow;
  });
}

function updateArrowOpacity(direction) {
  Object.keys(arrows).forEach((dir) => {
    arrows[dir].material.opacity = dir === direction ? 1.0 : 0.5;
  });
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

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  model.position.copy(camera.position).add(direction.multiplyScalar(2));

  isPlacingModel = true;
  activeRotation = null;
}

function determineRotation() {
  if (!model || isPlacingModel) return;

  const headDirection = getHeadDirection();

  if (!activeRotation) {
    if (Math.abs(headDirection.x) > Math.abs(headDirection.y)) {
      targetRotation.y += Math.sign(headDirection.x) * (Math.PI / 2);
      activeRotation = "horizontal";
      updateArrowOpacity(headDirection.x > 0 ? "right" : "left");
    } else {
      targetRotation.x += Math.sign(headDirection.y) * (Math.PI / 2);
      activeRotation = "vertical";
      updateArrowOpacity(headDirection.y > 0 ? "up" : "down");
    }
  }
}

function onButtonRelease() {
  activeRotation = null;
  isPlacingModel = false;
}

function getHeadDirection() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  return { x: direction.x, y: direction.y };
}

function animate() {
  renderer.setAnimationLoop(() => {
    if (model) {
      if (!isPlacingModel) {
        if (activeRotation === "horizontal") {
          model.rotation.y += (targetRotation.y - model.rotation.y) * 0.1;
        } else if (activeRotation === "vertical") {
          model.rotation.x += (targetRotation.x - model.rotation.x) * 0.1;
        }
      }
    }
    updateArrowOpacity("center");
    renderer.render(scene, camera);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
