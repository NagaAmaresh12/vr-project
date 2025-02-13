import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller, model;
let buttonPressed = false;
let currentRotationY = 0;
let currentRotationX = 0;
const rotationStep = Math.PI / 2; // 90 degrees
const rotationSpeed = 0.1; // Adjust for smoother animation

let targetQuaternion = new THREE.Quaternion(); // Target rotation

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

  const loader = new GLTFLoader();
  loader.load(
    "/models/refined_eagle.glb",
    (gltf) => {
      model = gltf.scene;
      model.position.set(0, 1.3, -1);
      scene.add(model);
      targetQuaternion.copy(model.quaternion); // Set initial rotation
      addInstructionPanels();
    },
    undefined,
    (error) => console.error("Error loading model:", error)
  );

  controller = renderer.xr.getController(0);
  if (controller) {
    controller.addEventListener("selectstart", onButtonPress);
    controller.addEventListener("selectend", onButtonRelease);
    scene.add(controller);
  }

  window.addEventListener("resize", onWindowResize);
}

function addInstructionPanels() {
  const instructions = [
    { text: "Look Left and Click", position: [-1.5, 1.3, -1], color: 0xff0000 },
    { text: "Look Right and Click", position: [1.5, 1.3, -1], color: 0x00ff00 },
    { text: "Look Up and Click", position: [0, 2, -1], color: 0x0000ff },
    { text: "Look Down and Click", position: [0, 0.5, -1], color: 0xffff00 },
  ];

  instructions.forEach(({ text, position, color }) => {
    const panelGeometry = new THREE.PlaneGeometry(0.9, 0.5);
    const panelMaterial = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2,
    });

    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(...position);
    scene.add(panel);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 256;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.font = "Bold 40px Arial";
    ctx.fillText(text, 20, 130);
    const texture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });

    const textMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.4),
      textMaterial
    );
    textMesh.position.set(...position);
    textMesh.position.z += 0.01;
    scene.add(textMesh);
  });
}

function onButtonPress() {
  buttonPressed = true;
  updateRotationTarget();
}

function onButtonRelease() {
  buttonPressed = false;
}
function updateRotationTarget() {
  if (!model) return;

  const lookDirection = new THREE.Vector3();
  camera.getWorldDirection(lookDirection);

  if (Math.abs(lookDirection.x) > Math.abs(lookDirection.y)) {
    // Left/Right rotation
    currentRotationY += lookDirection.x > 0 ? -rotationStep : rotationStep;
  } else {
    // Up/Down rotation
    currentRotationX += lookDirection.y > 0 ? rotationStep : -rotationStep;
  }
}

function animate() {
  renderer.setAnimationLoop(() => {
    if (model) {
      model.rotation.y = currentRotationY;
      model.rotation.x = currentRotationX;
    }
    renderer.render(scene, camera);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
