import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCw, Sparkles, Box } from "lucide-react";

/**
 * 100% Exact 3D Artisan Mosaic Gift Box
 * Recreates the exact reference design:
 * - Geometric Art-Deco mosaic relief tiles (Teal, Champagne Sand Gold, Terracotta Coral)
 * - Concentric stepped square plaques & corner relief guards
 * - Metallic Copper-Bronze satin cross-ribbon
 * - 4-Loop folded architectural ribbon bow with center cushion knot
 * - Deep slate-teal studio lighting & soft contact shadow
 */
export default function GiftBoxCanvas({ autoRotate = true, interactive = true }) {
  const mountRef = useRef(null);
  const [isRotating, setIsRotating] = useState(autoRotate);
  const isRotatingRef = useRef(isRotating);

  useEffect(() => {
    isRotatingRef.current = isRotating;
  }, [isRotating]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 440;
    const height = container.clientHeight || 440;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    // Angle matching the reference photo (isometric perspective)
    camera.position.set(3.4, 3.2, 4.4);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // Root Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 2. Exact Palette Materials
    // Teal Base & Insets
    const tealMat = new THREE.MeshStandardMaterial({
      color: 0x225d6f,
      roughness: 0.35,
      metalness: 0.22,
    });
    const darkTealMat = new THREE.MeshStandardMaterial({
      color: 0x163e4b,
      roughness: 0.42,
      metalness: 0.18,
    });

    // Champagne Sand Gold Relief
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xe0c074,
      roughness: 0.28,
      metalness: 0.52,
    });

    // Terracotta / Coral Pink Accent Blocks
    const coralMat = new THREE.MeshStandardMaterial({
      color: 0xc66c54,
      roughness: 0.38,
      metalness: 0.18,
    });

    // Metallic Copper / Rose-Bronze Ribbon (PBR Clearcoat)
    const copperRibbonMat = new THREE.MeshPhysicalMaterial({
      color: 0xc87553,
      roughness: 0.22,
      metalness: 0.88,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
      reflectivity: 0.9,
    });

    // 3. Core Box Body (Deep Teal with subtle bevel)
    const boxSize = 2.0;
    const halfSize = boxSize / 2;

    const coreGeo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const coreMesh = new THREE.Mesh(coreGeo, darkTealMat);
    coreMesh.castShadow = true;
    coreMesh.receiveShadow = true;
    rootGroup.add(coreMesh);

    // 4. Procedural Geometric Mosaic Relief Builder
    // Creates stepped concentric squares, vertical fluted bars, terracotta plates & studs
    const reliefGroup = new THREE.Group();
    rootGroup.add(reliefGroup);

    // Helper: Add a relief tile
    function addTile(parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    // Shared Reusable Geometries for performance
    const geoConcentricOuter = new THREE.BoxGeometry(0.38, 0.38, 0.05);
    const geoConcentricMid = new THREE.BoxGeometry(0.24, 0.24, 0.08);
    const geoConcentricInner = new THREE.BoxGeometry(0.12, 0.12, 0.11);
    const geoRectLarge = new THREE.BoxGeometry(0.34, 0.20, 0.05);
    const geoRectSlim = new THREE.BoxGeometry(0.10, 0.36, 0.05);
    const geoSquareStud = new THREE.BoxGeometry(0.065, 0.065, 0.06);
    const geoCornerBar = new THREE.BoxGeometry(0.08, 0.28, 0.05);

    // Builds mosaic quadrant pattern on a planar surface
    function buildMosaicQuadrant(parent, cx, cy, zOffset, isTop = false) {
      const qGroup = new THREE.Group();
      qGroup.position.set(cx, cy, zOffset);

      // 1. Stepped Concentric Square Plaque
      addTile(qGroup, geoConcentricOuter, goldMat, 0, 0, 0.025);
      addTile(qGroup, geoConcentricMid, coralMat, 0, 0, 0.04);
      addTile(qGroup, geoConcentricInner, goldMat, 0, 0, 0.055);

      // 2. Terracotta accent rectangles
      addTile(qGroup, geoRectLarge, coralMat, 0.16, 0.22, 0.025);
      addTile(qGroup, geoRectLarge, goldMat, -0.16, -0.22, 0.025);

      // 3. Teal & Gold fluted slim bars
      addTile(qGroup, geoRectSlim, tealMat, -0.24, 0.12, 0.025);
      addTile(qGroup, geoRectSlim, coralMat, 0.24, -0.12, 0.025);

      // 4. Stud matrix / mosaic pixels (blue, gold, coral)
      const studPositions = [
        [-0.32, 0.32, goldMat],
        [-0.20, 0.34, coralMat],
        [-0.32, -0.32, coralMat],
        [0.32, 0.32, goldMat],
        [0.32, -0.32, tealMat],
        [0.18, -0.34, goldMat],
        [-0.08, 0.28, tealMat],
        [0.08, -0.28, coralMat],
        [-0.28, -0.05, goldMat],
        [0.28, 0.05, tealMat],
      ];

      for (const [sx, sy, smat] of studPositions) {
        addTile(qGroup, geoSquareStud, smat, sx, sy, 0.03);
      }

      parent.add(qGroup);
    }

    // Build complete face mosaic (4 quadrants around ribbon cross)
    function buildFullFace(rotationY, rotationX = 0) {
      const faceGroup = new THREE.Group();
      faceGroup.rotation.y = rotationY;
      faceGroup.rotation.x = rotationX;

      const zFront = halfSize;
      const quadOffset = 0.54;

      // 4 Quadrants per face
      buildMosaicQuadrant(faceGroup, -quadOffset, quadOffset, zFront); // Top-Left
      buildMosaicQuadrant(faceGroup, quadOffset, quadOffset, zFront);  // Top-Right
      buildMosaicQuadrant(faceGroup, -quadOffset, -quadOffset, zFront); // Bottom-Left
      buildMosaicQuadrant(faceGroup, quadOffset, -quadOffset, zFront);  // Bottom-Right

      // Corner mosaic accents
      const cornerY = [0.85, 0.45, -0.45, -0.85];
      for (const cy of cornerY) {
        addTile(faceGroup, geoCornerBar, goldMat, -halfSize + 0.04, cy, zFront + 0.01);
        addTile(faceGroup, geoCornerBar, coralMat, halfSize - 0.04, cy, zFront + 0.01);
      }

      reliefGroup.add(faceGroup);
    }

    // Populate all 4 side faces
    buildFullFace(0);             // Front (+Z)
    buildFullFace(Math.PI / 2);    // Right (+X)
    buildFullFace(Math.PI);        // Back (-Z)
    buildFullFace(-Math.PI / 2);   // Left (-X)

    // Top Face Mosaic
    const topFace = new THREE.Group();
    topFace.rotation.x = -Math.PI / 2;
    const topQuadOffset = 0.54;
    buildMosaicQuadrant(topFace, -topQuadOffset, topQuadOffset, halfSize, true);
    buildMosaicQuadrant(topFace, topQuadOffset, topQuadOffset, halfSize, true);
    buildMosaicQuadrant(topFace, -topQuadOffset, -topQuadOffset, halfSize, true);
    buildMosaicQuadrant(topFace, topQuadOffset, -topQuadOffset, halfSize, true);
    reliefGroup.add(topFace);

    // 5. Metallic Copper-Bronze Cross Ribbon
    const ribbonWidth = 0.38;
    const ribbonThick = 0.07;
    const ribbonSpan = boxSize + 0.08;

    // Side Ribbon Bands (Vertical along Y)
    // Front/Back vertical
    const ribZVertical = new THREE.Mesh(
      new THREE.BoxGeometry(ribbonWidth, ribbonSpan, ribbonSpan + ribbonThick),
      copperRibbonMat
    );
    ribZVertical.castShadow = true;
    rootGroup.add(ribZVertical);

    // Left/Right vertical
    const ribXVertical = new THREE.Mesh(
      new THREE.BoxGeometry(ribbonSpan + ribbonThick, ribbonSpan, ribbonWidth),
      copperRibbonMat
    );
    ribXVertical.castShadow = true;
    rootGroup.add(ribXVertical);

    // 6. Sculpted 4-Loop Folded Ribbon Bow on Top
    const bowGroup = new THREE.Group();
    bowGroup.position.set(0, halfSize + 0.05, 0);
    rootGroup.add(bowGroup);

    // Center Rounded Cushion Knot
    const knotGeo = new THREE.BoxGeometry(0.36, 0.28, 0.36);
    const knotMesh = new THREE.Mesh(knotGeo, copperRibbonMat);
    knotMesh.position.y = 0.12;
    knotMesh.castShadow = true;
    bowGroup.add(knotMesh);

    // 4 Architectural Ribbon Loops
    // Helper to create smooth folded ribbon loop matching reference photo
    function createRibbonLoop(angleY) {
      const loopGroup = new THREE.Group();
      loopGroup.rotation.y = angleY;

      // Outer curved band (smooth torus slice / folded loop)
      const loopGeo = new THREE.TorusGeometry(0.32, 0.09, 20, 36, Math.PI * 1.15);
      const loopMesh = new THREE.Mesh(loopGeo, copperRibbonMat);
      loopMesh.rotation.x = Math.PI / 2;
      loopMesh.rotation.y = Math.PI / 7;
      loopMesh.position.set(0.24, 0.22, 0);
      loopMesh.scale.set(1.1, 0.75, 1.4);
      loopMesh.castShadow = true;
      loopGroup.add(loopMesh);

      // Inner folded lip for double-ribbon thickness look
      const innerGeo = new THREE.BoxGeometry(0.18, 0.16, 0.32);
      const innerMesh = new THREE.Mesh(innerGeo, copperRibbonMat);
      innerMesh.position.set(0.18, 0.16, 0);
      innerMesh.rotation.z = Math.PI / 8;
      innerMesh.castShadow = true;
      loopGroup.add(innerMesh);

      return loopGroup;
    }

    bowGroup.add(createRibbonLoop(0));               // Right (+X)
    bowGroup.add(createRibbonLoop(Math.PI / 2));     // Front (+Z)
    bowGroup.add(createRibbonLoop(Math.PI));         // Left (-X)
    bowGroup.add(createRibbonLoop(-Math.PI / 2));    // Back (-Z)

    // 7. Ground Contact Soft Radial Shadow Disk
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext("2d");
    const sGrad = sCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    sGrad.addColorStop(0, "rgba(10, 18, 22, 0.65)");
    sGrad.addColorStop(0.4, "rgba(10, 18, 22, 0.32)");
    sGrad.addColorStop(0.8, "rgba(10, 18, 22, 0.08)");
    sGrad.addColorStop(1, "rgba(10, 18, 22, 0)");
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(4.8, 4.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -halfSize - 0.02;
    scene.add(shadowMesh);

    // 8. Multi-Point Studio Lighting (Exact Reference Lighting)
    // Ambient fill matching dark teal background
    const ambientLight = new THREE.AmbientLight(0xd5e5eb, 1.3);
    scene.add(ambientLight);

    // Warm Key Light from Top-Left (matching highlights on top and front tiles)
    const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.6);
    keyLight.position.set(6, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Cool Turquoise Rim Light from Top-Right (highlighting teal tiles & bevels)
    const rimLight = new THREE.DirectionalLight(0x78b8cc, 1.4);
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    // Warm Copper Specular Highlight Light directly on Bow
    const bowLight = new THREE.PointLight(0xffaa77, 1.8, 8);
    bowLight.position.set(0, 3.2, 0.8);
    scene.add(bowLight);

    // Soft underside bounce light
    const bounceLight = new THREE.DirectionalLight(0x234552, 0.8);
    bounceLight.position.set(0, -5, 0);
    scene.add(bounceLight);

    // Default Angle & Isometric Rotation matching photo
    rootGroup.rotation.y = Math.PI / 4.4;
    rootGroup.rotation.x = 0.12;

    camera.lookAt(0, 0.05, 0);

    // 9. Interactive Drag & Mouse Orbit Handling
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotVelocityX = 0;
    let rotVelocityY = 0;

    const onPointerDown = (e) => {
      if (!interactive) return;
      isDragging = true;
      prevMouseX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      prevMouseY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    };

    const onPointerMove = (e) => {
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      if (isDragging) {
        const deltaX = clientX - prevMouseX;
        const deltaY = clientY - prevMouseY;
        rotVelocityY = deltaX * 0.007;
        rotVelocityX = deltaY * 0.007;
        prevMouseX = clientX;
        prevMouseY = clientY;
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);

    container.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);

    // Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 10. Animation Loop
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Subtle breathing levitation
      rootGroup.position.y = Math.sin(elapsed * 1.6) * 0.06;

      // Inertial Rotation & Auto-Spin
      if (isDragging) {
        rootGroup.rotation.y += rotVelocityY;
        rootGroup.rotation.x += rotVelocityX;
      } else {
        if (isRotatingRef.current) {
          rootGroup.rotation.y += 0.006;
        }
        rotVelocityX *= 0.92;
        rotVelocityY *= 0.92;
      }

      // Constrain tilt pitch
      rootGroup.rotation.x = Math.max(-0.4, Math.min(0.55, rootGroup.rotation.x));

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      container.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);

      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });

      if (shadowTex) shadowTex.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [interactive]);

  return (
    <div className="mosaic-3d-wrapper">
      {/* 3D Viewport with Slate Teal Studio Gradient */}
      <div
        ref={mountRef}
        className="mosaic-3d-viewport"
        style={{ cursor: "grab" }}
        title="Interactive 3D Artisan Hamper • Drag to rotate"
      />

      {/* Modern Floating UI Controls */}
      <div className="mosaic-3d-badge-bar">
        <span className="mosaic-tag-pill">
          ✨ Handcrafted Mosaic Hamper Box
        </span>
        <button
          type="button"
          className="mosaic-action-btn"
          onClick={() => setIsRotating((prev) => !prev)}
          title={isRotating ? "Pause rotation" : "Auto-rotate"}
        >
          <RotateCw size={14} className={isRotating ? "spin-active" : ""} />
          <span>{isRotating ? "Orbiting" : "Paused"}</span>
        </button>
      </div>
    </div>
  );
}
