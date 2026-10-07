import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Sparkles, Eye, RotateCw, Gift } from "lucide-react";

// Curated Luxury Color Palettes
const THEMES = [
  {
    id: "royal",
    name: "Royal Crimson & Gold",
    boxColor: 0x6e1422,
    lidColor: 0x540e19,
    ribbonColor: 0xf5b731,
    ribbonRoughness: 0.12,
    ribbonMetalness: 0.95,
    sparkleColor: 0xffd54f,
    glowColor: 0xffb300,
    badgeBg: "linear-gradient(135deg, #721224, #b76e79)",
  },
  {
    id: "emerald",
    name: "Imperial Emerald & Champagne",
    boxColor: 0x0d3822,
    lidColor: 0x092818,
    ribbonColor: 0xecd08c,
    ribbonRoughness: 0.15,
    ribbonMetalness: 0.9,
    sparkleColor: 0xa7f3d0,
    glowColor: 0x34d399,
    badgeBg: "linear-gradient(135deg, #0d3822, #059669)",
  },
  {
    id: "midnight",
    name: "Midnight Sapphire & Platinum",
    boxColor: 0x0f1c30,
    lidColor: 0x091220,
    ribbonColor: 0xd8e2dc,
    ribbonRoughness: 0.1,
    ribbonMetalness: 0.96,
    sparkleColor: 0x93c5fd,
    glowColor: 0x60a5fa,
    badgeBg: "linear-gradient(135deg, #0f1c30, #3b82f6)",
  },
];

export default function GiftBoxCanvas({ interactive = true }) {
  const mountRef = useRef(null);
  const [currentTheme, setCurrentTheme] = useState(THEMES[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);

  // References to communicate state changes to the Three.js loop without re-creating scene
  const themeRef = useRef(THEMES[0]);
  const isOpenRef = useRef(false);

  useEffect(() => {
    themeRef.current = currentTheme;
  }, [currentTheme]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 440;
    const height = container.clientHeight || 440;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 5.2);

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
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Root gift box group
    const giftGroup = new THREE.Group();
    scene.add(giftGroup);

    // Split into Box Base Group and Lid Group (for realistic unboxing/opening)
    const baseGroup = new THREE.Group();
    const lidGroup = new THREE.Group();
    giftGroup.add(baseGroup);
    giftGroup.add(lidGroup);

    // Helper: Create Rounded Bevel Box Geometry
    function createBeveledBox(w, h, d, r = 0.08) {
      const shape = new THREE.Shape();
      const hw = w / 2 - r;
      const hd = d / 2 - r;

      shape.moveTo(-hw, -hd - r);
      shape.lineTo(hw, -hd - r);
      shape.quadraticCurveTo(hw + r, -hd - r, hw + r, -hd);
      shape.lineTo(hw + r, hd);
      shape.quadraticCurveTo(hw + r, hd + r, hw, hd + r);
      shape.lineTo(-hw, hd + r);
      shape.quadraticCurveTo(-hw - r, hd + r, -hw - r, hd);
      shape.lineTo(-hw - r, -hd);
      shape.quadraticCurveTo(-hw - r, -hd - r, -hw, -hd - r);

      const extrudeSettings = {
        depth: h - r * 2,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: r,
        bevelThickness: r,
      };

      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.center();
      return geo;
    }

    // 2. High-End Physical Materials (PBR Satin Lacquer)
    const boxMat = new THREE.MeshPhysicalMaterial({
      color: themeRef.current.boxColor,
      roughness: 0.18,
      metalness: 0.12,
      clearcoat: 0.85,
      clearcoatRoughness: 0.15,
      reflectivity: 0.8,
    });

    const lidMat = new THREE.MeshPhysicalMaterial({
      color: themeRef.current.lidColor,
      roughness: 0.16,
      metalness: 0.18,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      reflectivity: 0.85,
    });

    const ribbonMat = new THREE.MeshStandardMaterial({
      color: themeRef.current.ribbonColor,
      roughness: themeRef.current.ribbonRoughness,
      metalness: themeRef.current.ribbonMetalness,
    });

    // 3. Construct Box Body
    const boxMesh = new THREE.Mesh(createBeveledBox(1.9, 1.45, 1.9, 0.08), boxMat);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    baseGroup.add(boxMesh);

    // Box Body Vertical Ribbons
    const ribZ = new THREE.Mesh(createBeveledBox(0.38, 1.47, 1.93, 0.02), ribbonMat);
    ribZ.castShadow = true;
    baseGroup.add(ribZ);

    const ribX = new THREE.Mesh(createBeveledBox(1.93, 1.47, 0.38, 0.02), ribbonMat);
    ribX.castShadow = true;
    baseGroup.add(ribX);

    // 4. Construct Fitted Lid
    const lidMesh = new THREE.Mesh(createBeveledBox(2.04, 0.36, 2.04, 0.08), lidMat);
    lidMesh.castShadow = true;
    lidGroup.add(lidMesh);

    // Lid Ribbons
    const ribLidZ = new THREE.Mesh(createBeveledBox(0.4, 0.38, 2.06, 0.02), ribbonMat);
    ribLidZ.castShadow = true;
    lidGroup.add(ribLidZ);

    const ribLidX = new THREE.Mesh(createBeveledBox(2.06, 0.38, 0.4, 0.02), ribbonMat);
    ribLidX.castShadow = true;
    lidGroup.add(ribLidX);

    // 5. Luxury Multi-Loop Rosette Bow
    const bowGroup = new THREE.Group();
    bowGroup.position.set(0, 0.22, 0);

    const loopCount = 8;
    const loopGeo = new THREE.TorusGeometry(0.34, 0.075, 20, 36);

    for (let i = 0; i < loopCount; i++) {
      const angle = (i * Math.PI * 2) / loopCount;
      const loop = new THREE.Mesh(loopGeo, ribbonMat);
      loop.rotation.y = angle;
      loop.rotation.x = Math.PI / 4.2;
      loop.position.x = Math.cos(angle) * 0.16;
      loop.position.z = Math.sin(angle) * 0.16;
      loop.position.y = 0.06;
      loop.castShadow = true;
      bowGroup.add(loop);
    }

    // Center Gold Knot Emblem
    const knotMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 24), ribbonMat);
    knotMesh.position.y = 0.08;
    knotMesh.castShadow = true;
    bowGroup.add(knotMesh);

    // Flowing Draped Ribbon Tails
    function createRibbonTail(startX, startZ, angle) {
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(startX, 0.05, startZ),
        new THREE.Vector3(startX * 1.5, -0.2, startZ * 1.5),
        new THREE.Vector3(startX * 1.8, -0.6, startZ * 1.8),
        new THREE.Vector3(startX * 2.1, -1.0, startZ * 2.1)
      );
      const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.05, 8, false);
      const tail = new THREE.Mesh(tubeGeo, ribbonMat);
      tail.castShadow = true;
      return tail;
    }

    bowGroup.add(createRibbonTail(0.2, 0.2, 0));
    bowGroup.add(createRibbonTail(-0.2, 0.2, 0));
    lidGroup.add(bowGroup);

    // Default Lid Position (Resting on top of box)
    const LID_CLOSED_Y = 0.88;
    const LID_OPEN_Y = 1.95;
    lidGroup.position.y = LID_CLOSED_Y;

    // 6. Interior Golden Hamper Glow Light (inside box)
    const innerLight = new THREE.PointLight(themeRef.current.glowColor, 0, 8);
    innerLight.position.set(0, 0.5, 0);
    scene.add(innerLight);

    // 7. Ground Contact Shadow Disk (Smooth Radial Occlusion)
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext("2d");
    const sGrad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    sGrad.addColorStop(0, "rgba(20, 8, 6, 0.45)");
    sGrad.addColorStop(0.5, "rgba(20, 8, 6, 0.18)");
    sGrad.addColorStop(1, "rgba(20, 8, 6, 0)");
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.92;
    scene.add(shadowMesh);

    // 8. Festive Floating Stardust Particles
    const particleCount = 70;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 5.0;
      particlePositions[i + 1] = (Math.random() - 0.5) * 3.8 + 0.4;
      particlePositions[i + 2] = (Math.random() - 0.5) * 5.0;
      particleScales[i / 3] = Math.random() * 0.08 + 0.03;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: themeRef.current.sparkleColor,
      size: 0.07,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 9. Multi-Point Studio Lighting (Dramatic Luxury Highlights)
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 1.25);
    scene.add(ambientLight);

    // Main Warm Key Light
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.4);
    keyLight.position.set(5, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    // Rim / Backlight for specular ribbon edge glow
    const rimLight = new THREE.DirectionalLight(0xffeedd, 1.5);
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    // Golden Accent Point Light
    const accentLight = new THREE.PointLight(0xffd700, 1.2, 10);
    accentLight.position.set(-3, 2, 3);
    scene.add(accentLight);

    camera.lookAt(0, 0.1, 0);

    // 10. Interactive Drag & Mouse Orbit Handling
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotVelocityX = 0;
    let rotVelocityY = 0;
    let mouseHoverX = 0;
    let mouseHoverY = 0;

    const onPointerDown = (e) => {
      if (!interactive) return;
      isDragging = true;
      prevMouseX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      prevMouseY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      setHintVisible(false);
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
      } else {
        const rect = container.getBoundingClientRect();
        mouseHoverX = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouseHoverY = -(((clientY - rect.top) / rect.height) * 2 - 1);
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

    // Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 11. Render & Animation Loop with Smooth Interpolation
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Dynamic Theme Sync (instant color transitions)
      const theme = themeRef.current;
      boxMat.color.lerp(new THREE.Color(theme.boxColor), 0.08);
      lidMat.color.lerp(new THREE.Color(theme.lidColor), 0.08);
      ribbonMat.color.lerp(new THREE.Color(theme.ribbonColor), 0.08);
      particleMat.color.lerp(new THREE.Color(theme.sparkleColor), 0.08);
      innerLight.color.lerp(new THREE.Color(theme.glowColor), 0.08);

      // Floating harmonic levitation
      const floatY = Math.sin(elapsed * 1.8) * 0.09;
      giftGroup.position.y = floatY;

      // Unboxing & Opening Animation (Lid lift & tilt + inner gold radiance)
      const targetLidY = isOpenRef.current ? LID_OPEN_Y : LID_CLOSED_Y;
      const targetLidRotZ = isOpenRef.current ? 0.35 : 0;
      const targetLidRotX = isOpenRef.current ? -0.25 : 0;
      const targetGlow = isOpenRef.current ? 3.5 : 0;

      lidGroup.position.y += (targetLidY - lidGroup.position.y) * 0.09;
      lidGroup.rotation.z += (targetLidRotZ - lidGroup.rotation.z) * 0.09;
      lidGroup.rotation.x += (targetLidRotX - lidGroup.rotation.x) * 0.09;
      innerLight.intensity += (targetGlow - innerLight.intensity) * 0.08;

      // Inertial Rotation and Ambient Spin
      if (isDragging) {
        giftGroup.rotation.y += rotVelocityY;
        giftGroup.rotation.x += rotVelocityX;
      } else {
        // Natural gentle idle orbit + subtle hover parallax
        giftGroup.rotation.y += 0.007;
        giftGroup.rotation.y += (mouseHoverX * 0.4 - giftGroup.rotation.y) * 0.015;
        giftGroup.rotation.x += (mouseHoverY * 0.25 - giftGroup.rotation.x) * 0.02;

        rotVelocityX *= 0.92;
        rotVelocityY *= 0.92;
      }

      // Constrain tilt pitch to prevent excessive flips
      giftGroup.rotation.x = Math.max(-0.4, Math.min(0.6, giftGroup.rotation.x));

      // Twinkling Stardust particle orbital drift
      particles.rotation.y = elapsed * 0.04;
      particles.rotation.x = Math.sin(elapsed * 0.5) * 0.05;

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
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [interactive]);

  return (
    <div className="luxury-3d-wrapper">
      {/* Interactive 3D Canvas Mount */}
      <div
        ref={mountRef}
        className="luxury-3d-viewport"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{ cursor: "grab" }}
      />

      {/* Floating Modern Interactive UI Controls */}
      <div className="luxury-3d-overlay">
        {/* Unbox / Peek Action Pill */}
        <button
          type="button"
          className={`unbox-toggle-pill ${isOpen ? "active" : ""}`}
          onClick={() => setIsOpen((prev) => !prev)}
          title="Click to peek inside the luxury hamper"
        >
          <Gift size={15} className="pill-icon" />
          <span>{isOpen ? "Close Box" : "Unbox Hamper ✨"}</span>
        </button>

        {/* Theme Palette Switcher Chips */}
        <div className="theme-chips-row">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`theme-chip ${currentTheme.id === t.id ? "selected" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentTheme(t);
              }}
              title={`Switch to ${t.name}`}
            >
              <span className="chip-dot" style={{ background: t.badgeBg }} />
              <span className="chip-label">{t.id.toUpperCase()}</span>
            </button>
          ))}
        </div>

        {/* Floating Interactive Badge Hint */}
        {hintVisible && (
          <div className="hint-pill">
            <RotateCw size={13} className="spin-icon" />
            <span>Drag 360° to inspect • Click to unbox</span>
          </div>
        )}
      </div>
    </div>
  );
}
