import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";

let scene, camera, renderer, controller, model, panel;
let buttonPressed = false;
let targetRotationY = 0;
let targetRotationX = 0;
let longPressActive = false;
let activeRotation = null;

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
  controller.addEventListener("selectstart", onButtonPress);
  controller.addEventListener("selectend", onButtonRelease);
  scene.add(controller);

  createPanel();
  window.addEventListener("resize", onWindowResize);
}

function createPanel() {
  const panelGeometry = new THREE.PlaneGeometry(0.4, 0.2);
  const panelMaterial = new THREE.MeshBasicMaterial({
    color: 0x111111,
    side: THREE.DoubleSide,
  });
  panel = new THREE.Mesh(panelGeometry, panelMaterial);
  panel.position.set(0, 1.6, -1);
  scene.add(panel);

  const fontLoader = new FontLoader();
  fontLoader.load("/fonts/helvetiker_regular.typeface.json", (font) => {
    const textGeometry = new TextGeometry("Rotate Model", {
      font: font,
      size: 0.05,
      height: 0.01,
    });
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(-0.18, 0.02, 0.01);
    panel.add(textMesh);
  });
}

function onButtonPress() {
  buttonPressed = true;
  const headDirectionX = getHeadDirectionX();
  const headDirectionY = getHeadDirectionY();

  if (Math.abs(headDirectionX) > 0.2 && !activeRotation) {
    targetRotationY += Math.sign(headDirectionX) * (Math.PI / 2);
    activeRotation = "horizontal";
    longPressActive = false;
  } else if (Math.abs(headDirectionY) > 0.2 && !activeRotation) {
    targetRotationX += Math.sign(headDirectionY) * (Math.PI / 2);
    activeRotation = "vertical";
    longPressActive = false;
  } else {
    longPressActive = true;
  }
}

function onButtonRelease() {
  buttonPressed = false;
  longPressActive = false;
  activeRotation = null;
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
      if (activeRotation === "horizontal") {
        model.rotation.y += (targetRotationY - model.rotation.y) * 0.1;
      } else if (activeRotation === "vertical") {
        model.rotation.x += (targetRotationX - model.rotation.x) * 0.1;
      }

      if (buttonPressed && longPressActive) {
        if (activeRotation === "horizontal") {
          model.rotation.y += getHeadDirectionX() * 0.05;
        } else if (activeRotation === "vertical") {
          model.rotation.x += getHeadDirectionY() * 0.05;
        }
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
