function rotateModel(direction) {
  if (!model) return;

  let newRotation = model.quaternion.clone();
  let rotationAxis = new THREE.Vector3();

  switch (direction) {
    case "left":
      rotationAxis.set(0, 1, 0); // Yaw (unchanged)
      break;
    case "right":
      rotationAxis.set(0, -1, 0); // Yaw (unchanged)
      break;
    case "up":
      rotationAxis.set(1, 0, 0); // Pitch (X-axis)
      break;
    case "down":
      rotationAxis.set(-1, 0, 0); // Pitch (X-axis)
      break;
  }

  // Apply rotation using quaternion
  const quaternion = new THREE.Quaternion().setFromAxisAngle(
    rotationAxis,
    rotationStep
  );

  // Ensure correct up/down rotation without gimbal lock
  if (direction === "up" || direction === "down") {
    model.quaternion.premultiply(quaternion);
  } else {
    model.quaternion.multiply(quaternion);
  }
}
