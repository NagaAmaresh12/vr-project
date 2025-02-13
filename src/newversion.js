import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";

let scene, camera, renderer, controller, model;

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
    createInstructionPanels();
  });

  controller = renderer.xr.getController(0);
  scene.add(controller);

  window.addEventListener("resize", onWindowResize);
}

function createInstructionPanels() {
  const fontLoader = new FontLoader();
  fontLoader.load("/fonts/helvetiker_regular.typeface.json", (font) => {
    const panelData = [
      {
        position: [0, 2, -1],
        text: "Look Up and Click Button",
        color: 0xff0000,
      },
      {
        position: [0, 0.8, -1],
        text: "Look Down and Click Button",
        color: 0x0000ff,
      },
      {
        position: [-0.6, 1.3, -1],
        text: "Look Left and Click Button",
        color: 0x00ff00,
      },
      {
        position: [0.6, 1.3, -1],
        text: "Look Right and Click Button",
        color: 0xffff00,
      },
    ];

    panelData.forEach(({ position, text, color }) => {
      const panelGeometry = new THREE.PlaneGeometry(0.5, 0.2);
      const panelMaterial = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
      });
      const panel = new THREE.Mesh(panelGeometry, panelMaterial);
      panel.position.set(...position);
      scene.add(panel);

      const textGeometry = new TextGeometry(text, {
        font: font,
        size: 0.05,
        height: 0.01,
      });
      const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(-0.2, 0, 0.01);
      panel.add(textMesh);
    });
  });
}

function animate() {
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
