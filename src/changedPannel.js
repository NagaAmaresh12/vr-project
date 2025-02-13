import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller, model, reticle;
let lastClickTime = 0;
let isPlacingModel = false;
let targetRotation = new THREE.Quaternion();
const rotationSpeed = 0.15;

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
  camera.position.set(0, 1.5, 3); // Increased distance
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
      model.rotation.set(0, 0, 0);
      scene.add(model);
      targetRotation.copy(model.quaternion);
      addInstructionPanels();
    },
    undefined,
    (error) => console.error("Error loading model:", error)
  );
}

function addInstructionPanels() {
  const instructions = [
    { text: "Look up and click button", position: [0, 2, -1], color: 0xff0000 },
    {
      text: "Look down and click button",
      position: [0, 0.5, -1],
      color: 0x00ff00,
    },
    {
      text: "Look left and click button",
      position: [-1.5, 1.3, -1],
      color: 0x0000ff,
    },
    {
      text: "Look right and click button",
      position: [1.5, 1.3, -1],
      color: 0xffff00,
    },
  ];

  instructions.forEach(({ text, position, color }) => {
    const panelGeometry = new THREE.PlaneGeometry(0.9, 0.5); // Increased size
    const panelMaterial = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2, // Transparent background
    });

    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(...position);
    scene.add(panel);

    // Create a glowing border
    const borderMaterial = new THREE.LineBasicMaterial({ color, linewidth: 5 });
    const borderGeometry = new THREE.EdgesGeometry(panelGeometry);
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    panel.add(border);

    // Add text
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 256;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.font = "Bold 40px Arial"; // Increased font size
    ctx.fillText(text, 20, 130);
    const texture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });

    const textMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.4),
      textMaterial
    ); // Adjusted size
    textMesh.position.set(...position);
    textMesh.position.z += 0.01; // Slight offset to prevent z-fighting
    scene.add(textMesh);
  });
}

function setupController() {
  controller = renderer.xr.getController(0);
  controller.addEventListener("selectstart", onButtonPress);
  controller.addEventListener("selectend", () => (isPlacingModel = false));
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
    updateRotation();
  }
  lastClickTime = now;
}

function placeModel() {
  if (!model) return;
  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyQuaternion(camera.quaternion);
  model.position.copy(camera.position).add(forward.multiplyScalar(2.5)); // Increased placement distance
  model.lookAt(camera.position);
  model.rotation.set(0, 0, 0);
  isPlacingModel = true;
}

function resetModelPosition() {
  if (!model) return;
  placeModel();
}

function updateRotation() {
  if (!model || isPlacingModel) return;
  const cameraQuaternion = camera.quaternion;
  const euler = new THREE.Euler().setFromQuaternion(cameraQuaternion, "YXZ");

  let yaw = euler.y;
  let pitch = THREE.MathUtils.clamp(euler.x, -Math.PI / 4, Math.PI / 4);

  const newRotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(pitch, yaw, 0, "YXZ")
  );
  targetRotation.copy(newRotation);
}

function animate() {
  renderer.setAnimationLoop(() => {
    if (model) {
      model.quaternion.slerp(targetRotation, rotationSpeed);
    }
    renderer.render(scene, camera);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
