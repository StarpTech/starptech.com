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
    color: new THREE.Color("#bfc2cb"),
    transparent: true,
    opacity: 0.13,
    wireframe: true,
    depthWrite: false,
  });
  const accentA = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#655bd7"),
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const accentB = accentA.clone();
  const plane = new THREE.Mesh(geometry, wire);
  const traceHeadGeometry = new THREE.SphereGeometry(smallViewport ? 0.026 : 0.034, 14, 7);
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

  /* Procedural black hole: the accretion flow, photon ring, and lensing halo
     are one continuous screen-space field around the event horizon. */
  const blackHole = new THREE.Group();
  const diskMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.78 },
    },
    vertexShader: `
      varying vec2 vUvPosition;

      void main() {
        vUvPosition = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUvPosition;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p = p * 2.03 + vec2(17.17, 9.23);
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 point = (vUvPosition - 0.5) * 6.4;
        float radius = length(point);
        float angle = atan(point.y, point.x);
        vec2 flow = vec2(
          angle * 2.1 - uTime * 0.085,
          radius * 3.7 - uTime * 0.045
        );
        float warp = fbm(flow * 0.68);
        float turbulence = fbm(flow * 1.7 + vec2(warp * 2.2, -warp));
        float filaments = 0.5 + 0.5 * sin(
          angle * 18.0 - radius * 22.0 + turbulence * 8.0 - uTime * 0.28
        );

        float outsideShadow = smoothstep(0.62, 0.72, radius);
        float outerFade = 1.0 - smoothstep(2.35, 3.12, radius);

        /* The near side remains a thin equatorial band. */
        float bandWidth = 0.045 + turbulence * 0.055;
        float equatorial = exp(-pow(abs(point.y) / bandWidth, 1.35));
        equatorial *= smoothstep(0.63, 0.82, radius) * outerFade;

        /* Light from the far side bends into upper and lower Einstein arcs. */
        float arcRadius = 1.03 + (warp - 0.5) * 0.1;
        float arcWidth = 0.105 + turbulence * 0.09;
        float arc = exp(-pow((radius - arcRadius) / arcWidth, 2.0));
        float verticalBias = 0.2 + 0.8 * pow(abs(sin(angle)), 0.62);
        arc *= verticalBias * outsideShadow;

        /* Broad, turbulent material gives the lens a continuous natural body. */
        float envelope = exp(-pow((radius - 1.42) / 0.72, 2.0));
        envelope *= outsideShadow * outerFade;
        envelope *= 0.13 + turbulence * 0.3 + filaments * 0.12;

        float density = max(equatorial * (0.7 + filaments * 0.55), arc);
        density = max(density, envelope);

        float heat = 1.0 - smoothstep(0.68, 2.85, radius);
        vec3 smoke = vec3(0.24, 0.29, 0.3);
        vec3 copper = vec3(0.76, 0.39, 0.2);
        vec3 whiteHot = vec3(1.0, 0.88, 0.7);
        vec3 color = mix(smoke, copper, smoothstep(0.03, 0.68, heat));
        color = mix(color, whiteHot, pow(heat, 3.0));

        /* Relativistic beaming: the approaching side burns brighter. */
        float doppler = mix(
          0.62,
          1.36,
          smoothstep(-2.6, 2.6, point.x)
        );
        color *= doppler * (0.76 + turbulence * 0.5);

        /* The photon ring grows out of the same field—no separate outline. */
        float photonRing = exp(-pow((radius - 0.7) / 0.024, 2.0));
        photonRing *= 0.52 + turbulence * 0.72;
        photonRing *= 0.86 + doppler * 0.12;
        float innerGlow = exp(-pow((radius - 0.79) / 0.16, 2.0)) * 0.16;
        color += whiteHot * photonRing * 1.3;
        color += vec3(0.2, 0.24, 0.25) * innerGlow;

        float alpha = max(density * uOpacity, photonRing * 0.72 + innerGlow);
        alpha *= outsideShadow;
        if (alpha < 0.012) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const disk = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 6.4),
    diskMaterial,
  );
  const eventHorizon = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, smallViewport ? 40 : 64, smallViewport ? 20 : 32),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  );
  eventHorizon.renderOrder = 2;
  blackHole.add(disk, eventHorizon);

  const starCount = smallViewport ? 90 : 220;
  const starPositions = new Float32Array(starCount * 3);
  for (let index = 0; index < starCount; index += 1) {
    starPositions[index * 3] = (Math.random() - 0.5) * 19;
    starPositions[index * 3 + 1] = (Math.random() - 0.5) * 10;
    starPositions[index * 3 + 2] = -3 - Math.random() * 3;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0xdfe6f2,
      size: smallViewport ? 0.012 : 0.016,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  let width = 1;
  let height = 1;
  let animationFrame = 0;

  camera.position.set(0, 0, 8.5);
  field.position.set(1.3, -0.15, -1.5);
  field.rotation.set(-0.42, 0.2, -0.08);
  field.add(plane, ...agents.flatMap((agent) => [agent.trail, agent.group]));
  scene.add(stars, field, blackHole);

  function cssColor(name: string, fallback: string) {
    return getComputedStyle(root).getPropertyValue(name).trim() || fallback;
  }

  function syncTheme() {
    const dark = root.dataset.theme === "dark";

    wire.color.set(cssColor("--line-strong", dark ? "#373e4e" : "#bfc2cb"));
    wire.opacity = dark ? 0.22 : 0.17;
    accentA.color.set(cssColor("--signal-accent-1", dark ? "#8b9cf6" : "#655bd7"));
    accentB.color.set(cssColor("--signal-accent-2", dark ? "#ef88b4" : "#b04a78"));
    accentA.opacity = dark ? 0.42 : 0.32;
    accentB.opacity = dark ? 0.34 : 0.25;
    diskMaterial.uniforms.uOpacity.value = dark ? 0.78 : 0.6;
    (stars.material as Three.PointsMaterial).opacity = dark ? 0.34 : 0.2;

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
    const blackHoleScale = smallViewport ? 0.54 : Math.min(0.92, 0.72 + width / 7200);
    blackHole.scale.setScalar(blackHoleScale);
    blackHole.position.set(
      smallViewport ? 1.35 : Math.min(3.75, camera.aspect * 2.35),
      smallViewport ? 1.58 : 0.72,
      -0.45,
    );
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
      agent.material.opacity = (smallViewport ? 0.34 : 0.38) + Math.sin(time * 1.8 + agent.offset * 12) * 0.06;
      agent.trailMaterial.opacity = (smallViewport ? 0.13 : 0.16) + Math.sin(time * 1.2 + agent.offset * 9) * 0.035;

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
    diskMaterial.uniforms.uTime.value = time;

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
