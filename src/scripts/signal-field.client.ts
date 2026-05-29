import type * as Three from "three";

const canvas = document.getElementById("signalField") as HTMLCanvasElement | null;

if (canvas) {
  const THREE = await import("three");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const smallViewport = window.matchMedia("(max-width: 640px)").matches;
  const root = document.documentElement;
  const scene = new THREE.Scene();
  const field = new THREE.Group();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    canvas,
    powerPreference: "low-power",
  });

  const segmentsX = smallViewport ? 28 : 58;
  const segmentsY = smallViewport ? 10 : 18;
  const geometry = new THREE.PlaneGeometry(14, 6.2, segmentsX, segmentsY);
  const positions = geometry.attributes.position as Three.BufferAttribute;
  const basePositions = new Float32Array(positions.array);
  const pointer = new THREE.Vector2(0, 0);
  const pointerTarget = new THREE.Vector2(0, 0);
  const wire = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#d4d4d4"),
    transparent: true,
    opacity: 0.13,
    wireframe: true,
    depthWrite: false,
  });
  const accentA = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#2563eb"),
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const accentB = accentA.clone();
  const plane = new THREE.Mesh(geometry, wire);
  const traceHeadGeometry = new THREE.SphereGeometry(smallViewport ? 0.014 : 0.018, 14, 7);
  const trailPointCount = 24;
  const agents = Array.from({ length: smallViewport ? 5 : 12 }, (_, index) => {
    const group = new THREE.Group();
    const material = (index % 3 === 0 ? accentA : accentB).clone();
    const trailMaterial = new THREE.LineBasicMaterial({
      color: material.color,
      transparent: true,
      opacity: smallViewport ? 0.12 : 0.18,
      depthWrite: false,
    });
    const head = new THREE.Mesh(traceHeadGeometry, material);
    const trailPositions = new Float32Array(trailPointCount * 3);
    const trailGeometry = new THREE.BufferGeometry();
    const trail = new THREE.Line(trailGeometry, trailMaterial);

    material.opacity = smallViewport ? 0.28 : 0.36;
    head.position.z = 0.035;
    trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    group.add(head);

    return {
      group,
      material,
      trail,
      trailGeometry,
      trailMaterial,
      trailPositions,
      offset: index / (smallViewport ? 5 : 12),
      speed: 0.01 + (index % 6) * 0.0012,
      lane: -2.3 + (index % 6) * 0.92,
      drift: 0.12 + (index % 4) * 0.07,
      branch: index % 2 === 0 ? 1 : -1,
    };
  });
  let width = 1;
  let height = 1;
  let animationFrame = 0;

  camera.position.set(0, 0, 8.5);
  field.position.set(1.3, -0.15, -1.5);
  field.rotation.set(-0.42, 0.2, -0.08);
  field.add(plane, ...agents.flatMap((agent) => [agent.trail, agent.group]));
  scene.add(field);

  function cssColor(name: string, fallback: string) {
    return getComputedStyle(root).getPropertyValue(name).trim() || fallback;
  }

  function syncTheme() {
    const dark = root.dataset.theme === "dark";

    wire.color.set(cssColor("--line-strong", dark ? "#404040" : "#d4d4d4"));
    wire.opacity = dark ? 0.18 : 0.2;
    accentA.color.set(cssColor("--grad-1", dark ? "#60a5fa" : "#2563eb"));
    accentB.color.set(cssColor("--grad-3", dark ? "#f472b6" : "#ec4899"));
    accentA.opacity = dark ? 0.42 : 0.32;
    accentB.opacity = dark ? 0.34 : 0.25;

    for (const [index, agent] of agents.entries()) {
      const color = index % 3 === 0 ? accentA.color : accentB.color;
      agent.material.color.copy(color);
      agent.trailMaterial.color.copy(color);
    }
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallViewport ? 1.25 : 1.6));
    renderer.setSize(width, height, false);
  }

  function shape(time: number) {
    for (let i = 0; i < positions.count; i += 1) {
      const x = basePositions[i * 3];
      const y = basePositions[i * 3 + 1];
      const z =
        Math.sin(x * 0.9 + time * 0.42) * 0.28 +
        Math.cos(y * 1.7 - time * 0.26) * 0.16 +
        Math.sin((x + y) * 0.55 + time * 0.18) * 0.12;

      positions.setXYZ(i, x, y, z);
    }

    positions.needsUpdate = true;
    geometry.computeBoundingSphere();
  }

  function agentPosition(phase: number, lane: number, drift: number, time: number) {
    const x = (phase % 1) * 14 - 7;
    const y =
      lane +
      Math.sin(phase * Math.PI * 2 + lane) * drift +
      Math.sin(phase * Math.PI * 6 + time * 0.34) * drift * 0.38;
    const z =
      Math.sin(x * 0.9 + time * 0.42) * 0.28 +
      Math.cos(y * 1.7 - time * 0.26) * 0.16;

    return new THREE.Vector3(x, y, z);
  }

  function placeAgents(time: number) {
    for (const agent of agents) {
      const phase = (agent.offset + time * agent.speed) % 1;
      const current = agentPosition(phase, agent.lane, agent.drift, time);

      agent.group.position.copy(current);
      agent.material.opacity = (smallViewport ? 0.2 : 0.28) + Math.sin(time * 1.8 + agent.offset * 12) * 0.06;
      agent.trailMaterial.opacity = (smallViewport ? 0.08 : 0.12) + Math.sin(time * 1.2 + agent.offset * 9) * 0.035;

      for (let i = 0; i < trailPointCount; i += 1) {
        const branchShift = i > trailPointCount * 0.56 ? agent.branch * 0.015 * (i - trailPointCount * 0.56) : 0;
        const point = agentPosition(
          (phase - i * 0.0042 + branchShift + 1) % 1,
          agent.lane,
          agent.drift,
          time,
        );
        const fade = 1 - i / trailPointCount;

        agent.trailPositions[i * 3] = point.x;
        agent.trailPositions[i * 3 + 1] = point.y;
        agent.trailPositions[i * 3 + 2] = point.z + fade * 0.035;
      }

      const trailAttribute = agent.trailGeometry.attributes.position as Three.BufferAttribute;
      trailAttribute.needsUpdate = true;
    }
  }

  function render(now = 0) {
    const time = reducedMotion.matches ? 0 : now * 0.001;

    pointer.lerp(pointerTarget, 0.035);
    shape(time);

    field.rotation.x = -0.42 + pointer.y * 0.08;
    field.rotation.y = 0.2 + pointer.x * 0.14;
    field.rotation.z = -0.08 + pointer.x * 0.025;

    placeAgents(time);
    renderer.render(scene, camera);

    if (!reducedMotion.matches) {
      animationFrame = requestAnimationFrame(render);
    }
  }

  function restart() {
    cancelAnimationFrame(animationFrame);
    if (reducedMotion.matches) {
      render(0);
      return;
    }
    animationFrame = requestAnimationFrame(render);
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      pointerTarget.x = (event.clientX / width - 0.5) * 2;
      pointerTarget.y = (event.clientY / height - 0.5) * -2;
    },
    { passive: true },
  );
  window.addEventListener("resize", resize, { passive: true });
  reducedMotion.addEventListener("change", restart);

  new MutationObserver(syncTheme).observe(root, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  syncTheme();
  resize();
  restart();
}
