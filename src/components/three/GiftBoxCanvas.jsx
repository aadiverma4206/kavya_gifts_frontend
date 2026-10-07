import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function GiftBoxCanvas({ autoRotate = true, interactive = true }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2.2, 4.8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Group for the entire gift box
    const giftGroup = new THREE.Group();
    scene.add(giftGroup);

    // Box Body (Royal Maroon Velvet)
    const boxGeo = new THREE.BoxGeometry(1.8, 1.4, 1.8);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x7a1f2b,
      roughness: 0.35,
      metalness: 0.1,
    });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    giftGroup.add(boxMesh);

    // Box Lid (slightly wider, sits on top)
    const lidGeo = new THREE.BoxGeometry(1.9, 0.3, 1.9);
    const lidMat = new THREE.MeshStandardMaterial({
      color: 0x601420,
      roughness: 0.3,
      metalness: 0.2,
    });
    const lidMesh = new THREE.Mesh(lidGeo, lidMat);
    lidMesh.position.y = 0.8;
    giftGroup.add(lidMesh);

    // Golden Ribbon Materials
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xd9a441,
      roughness: 0.2,
      metalness: 0.8,
    });

    // Vertical Ribbon along Z axis
    const ribZ = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.42, 1.84), ribbonMat);
    giftGroup.add(ribZ);

    // Vertical Ribbon along X axis
    const ribX = new THREE.Mesh(new THREE.BoxGeometry(1.84, 1.42, 0.35), ribbonMat);
    giftGroup.add(ribX);

    // Lid Ribbons
    const ribLidZ = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 1.94), ribbonMat);
    ribLidZ.position.y = 0.8;
    giftGroup.add(ribLidZ);

    const ribLidX = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.32, 0.36), ribbonMat);
    ribLidX.position.y = 0.8;
    giftGroup.add(ribLidX);

    // Bow loops on top of the lid
    const bowLoopGeo = new THREE.TorusGeometry(0.32, 0.08, 16, 32);
    const bowLeft = new THREE.Mesh(bowLoopGeo, ribbonMat);
    bowLeft.position.set(-0.25, 1.08, 0);
    bowLeft.rotation.z = Math.PI / 4;
    bowLeft.rotation.y = Math.PI / 6;
    giftGroup.add(bowLeft);

    const bowRight = new THREE.Mesh(bowLoopGeo, ribbonMat);
    bowRight.position.set(0.25, 1.08, 0);
    bowRight.rotation.z = -Math.PI / 4;
    bowRight.rotation.y = -Math.PI / 6;
    giftGroup.add(bowRight);

    // Center knot
    const knotGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const knotMesh = new THREE.Mesh(knotGeo, ribbonMat);
    knotMesh.position.set(0, 1.02, 0);
    giftGroup.add(knotMesh);

    // Festive Floating Sparkles (particles)
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 4.5;
      particlePositions[i + 1] = (Math.random() - 0.5) * 3.5 + 0.5;
      particlePositions[i + 2] = (Math.random() - 0.5) * 4.5;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xf5d061,
      size: 0.06,
      transparent: true,
      opacity: 0.85,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfff6ec, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff0db, 1.8);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    const fillLight = new THREE.PointLight(0xd9a441, 1.0, 10);
    fillLight.position.set(-4, 3, 2);
    scene.add(fillLight);

    // Look at box
    camera.lookAt(0, 0.2, 0);

    // Interactive mouse rotation
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationY = 0;
    let targetRotationX = 0;

    const handleMouseMove = (e) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotationY = mouseX * 0.7;
      targetRotationX = mouseY * 0.4;
    };

    container.addEventListener("mousemove", handleMouseMove);

    // Resize handling
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Gentle floating animation
      giftGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.12;

      // Smooth rotation
      if (autoRotate) {
        giftGroup.rotation.y += 0.008;
      }
      giftGroup.rotation.y += (targetRotationY - (autoRotate ? 0 : giftGroup.rotation.y)) * 0.05;
      giftGroup.rotation.x += (targetRotationX - giftGroup.rotation.x) * 0.05;

      // Sparkle particle rotation
      particles.rotation.y = elapsedTime * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [autoRotate, interactive]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "360px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "grab",
      }}
      title="Interactive 3D Gift Box — move mouse to rotate"
    />
  );
}
