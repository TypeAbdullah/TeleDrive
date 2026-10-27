<template>
  <div class="three-hero-container" ref="containerRef">
    <canvas ref="canvasRef" class="three-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

let animationFrameId: number;
let renderer: any = null;
let scene: any = null;
let camera: any = null;
let orbMesh: any = null;
let innerOrbMesh: any = null;
let ring1: any = null;
let ring2: any = null;
let particles: any = null;

let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

const handleMouseMove = (event: MouseEvent) => {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  mouseX = (event.clientX - centerX) * 0.0025;
  mouseY = (event.clientY - centerY) * 0.0025;
};

onMounted(async () => {
  if (typeof window === 'undefined' || !canvasRef.value || !containerRef.value) return;

  const THREE = await import('three');

  const width = containerRef.value.clientWidth || 380;
  const height = containerRef.value.clientHeight || 380;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.z = 6.2;

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 1. Central Wireframe Polyhedron (TeleDrive Storage Core)
  const icoGeo = new THREE.IcosahedronGeometry(1.85, 2);
  const wireGeo = new THREE.WireframeGeometry(icoGeo);
  const wireMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
    linewidth: 1
  });
  orbMesh = new THREE.LineSegments(wireGeo, wireMat);
  scene.add(orbMesh);

  // 2. Inner Core with Solid/Transparent Faces
  const innerGeo = new THREE.IcosahedronGeometry(1.15, 1);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.15
  });
  innerOrbMesh = new THREE.Mesh(innerGeo, innerMat);
  scene.add(innerOrbMesh);

  // 3. Orbiting Geometric Rings (Data Pipelines)
  const ringGeo1 = new THREE.RingGeometry(2.35, 2.38, 64);
  const ringMat1 = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.22
  });
  ring1 = new THREE.Mesh(ringGeo1, ringMat1);
  ring1.rotation.x = Math.PI / 3.2;
  scene.add(ring1);

  const ringGeo2 = new THREE.RingGeometry(2.7, 2.73, 64);
  const ringMat2 = new THREE.MeshBasicMaterial({
    color: 0x888888,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.18
  });
  ring2 = new THREE.Mesh(ringGeo2, ringMat2);
  ring2.rotation.x = -Math.PI / 4;
  ring2.rotation.y = Math.PI / 5;
  scene.add(ring2);

  // 4. Ambient Data Chunks (Particle Constellation)
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const radius = 2.4 + Math.random() * 2.8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Circular particle point
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 16;
  pCanvas.height = 16;
  const pCtx = pCanvas.getContext('2d');
  if (pCtx) {
    const gradient = pCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    pCtx.fillStyle = gradient;
    pCtx.fillRect(0, 0, 16, 16);
  }
  const pTexture = new THREE.CanvasTexture(pCanvas);

  const particleMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    map: pTexture,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  const handleResize = () => {
    if (!containerRef.value || !renderer || !camera) return;
    const newWidth = containerRef.value.clientWidth;
    const newHeight = containerRef.value.clientHeight;
    if (newWidth && newHeight) {
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    }
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('mousemove', handleMouseMove);

  let clock = new THREE.Clock();

  const animate = () => {
    animationFrameId = requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    targetX += (mouseX - targetX) * 0.06;
    targetY += (mouseY - targetY) * 0.06;

    if (orbMesh) {
      orbMesh.rotation.y = elapsedTime * 0.18 + targetX * 1.8;
      orbMesh.rotation.x = elapsedTime * 0.1 + targetY * 1.8;
    }

    if (innerOrbMesh) {
      innerOrbMesh.rotation.y = -elapsedTime * 0.25 + targetX;
      innerOrbMesh.rotation.z = elapsedTime * 0.12;
    }

    if (ring1) {
      ring1.rotation.z = elapsedTime * 0.15;
      ring1.rotation.y = Math.sin(elapsedTime * 0.4) * 0.25;
    }

    if (ring2) {
      ring2.rotation.z = -elapsedTime * 0.1;
      ring2.rotation.x = -Math.PI / 4 + Math.cos(elapsedTime * 0.3) * 0.2;
    }

    if (particles) {
      particles.rotation.y = elapsedTime * 0.05 + targetX * 0.5;
      particles.rotation.x = targetY * 0.5;
    }

    renderer.render(scene, camera);
  };

  animate();
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', handleMouseMove);
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (renderer) {
    renderer.dispose();
  }
});
</script>

<style scoped>
.three-hero-container {
  width: 100%;
  height: 100%;
  min-height: 340px;
  max-width: 420px;
  aspect-ratio: 1 / 1;
  margin: 0 auto;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.three-canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
  filter: drop-shadow(0 0 35px rgba(255, 255, 255, 0.15));
}
</style>
