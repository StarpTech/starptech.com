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

  function tinyAsteroidGeometry(index: number) {
    const asteroid = new THREE.IcosahedronGeometry(smallViewport ? 0.032 : 0.043, 1);
    const asteroidPositions = asteroid.attributes.position as Three.BufferAttribute;
    const vertex = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const seed = index * 2.371 + 0.83;

    for (let vertexIndex = 0; vertexIndex < asteroidPositions.count; vertexIndex += 1) {
      vertex.fromBufferAttribute(asteroidPositions, vertexIndex);
      direction.copy(vertex).normalize();
      const deformation =
        1 +
        Math.sin(direction.x * 6.3 + seed) * 0.13 +
        Math.cos(direction.y * 8.7 - seed * 1.4) * 0.09 +
        Math.sin(direction.z * 5.1 + direction.x * 4.2 + seed * 0.7) * 0.08;
      vertex.multiplyScalar(deformation);
      asteroidPositions.setXYZ(vertexIndex, vertex.x, vertex.y, vertex.z);
    }

    asteroidPositions.needsUpdate = true;
    asteroid.computeVertexNormals();
    return asteroid;
  }

  const trailPointCount = 24;
  const agents = Array.from({ length: smallViewport ? 5 : 12 }, (_, index) => {
    const group = new THREE.Group();
    const accent = index % 3 === 0 ? accentA : accentB;
    const material = new THREE.MeshStandardMaterial({
      color: index % 3 === 0 ? 0x756d68 : 0x65696f,
      roughness: 1,
      metalness: 0,
      flatShading: true,
      transparent: true,
      depthWrite: false,
    });
    const trailMaterial = new THREE.LineBasicMaterial({
      color: accent.color,
      transparent: true,
      opacity: smallViewport ? 0.12 : 0.18,
      depthWrite: false,
    });
    const head = new THREE.Mesh(tinyAsteroidGeometry(index), material);
    const trailPositions = new Float32Array(trailPointCount * 3);
    const trailGeometry = new THREE.BufferGeometry();
    const trail = new THREE.Line(trailGeometry, trailMaterial);

    material.opacity = smallViewport ? 0.28 : 0.36;
    head.position.z = 0.035;
    head.scale.set(
      0.82 + (index % 4) * 0.09,
      0.66 + ((index + 2) % 5) * 0.075,
      0.78 + ((index + 1) % 3) * 0.11,
    );
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
      spin: new THREE.Vector3(
        0.17 + (index % 4) * 0.031,
        0.13 + ((index + 2) % 5) * 0.027,
        0.09 + ((index + 1) % 3) * 0.022,
      ),
    };
  });

  /* Procedural black hole in the Interstellar style: a thin accretion disk
     seen nearly edge-on, whose far side is lensed into an arc over the top of
     the shadow and a fainter arc beneath it, with a razor photon ring hugging
     the event horizon. Everything is painted in screen space on one plane.
     Shader units: 1.0 = shadow radius. */
  const shadowRadius = 0.62;
  const diskWidth = 12.4;
  const diskHeight = 4.6;
  const blackHole = new THREE.Group();
  const diskMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uExtent: {
        value: new THREE.Vector2(diskWidth / shadowRadius, diskHeight / shadowRadius),
      },
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
      uniform vec2 uExtent;
      varying vec2 vUvPosition;

      const float TAU = 6.28318530718;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      /* Value noise that wraps in y every \`period\` cells, so the azimuth
         seam of the disk never shows. */
      float pnoise(vec2 p, float period) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float y0 = mod(i.y, period);
        float y1 = mod(i.y + 1.0, period);
        return mix(
          mix(hash(vec2(i.x, y0)), hash(vec2(i.x + 1.0, y0)), f.x),
          mix(hash(vec2(i.x, y1)), hash(vec2(i.x + 1.0, y1)), f.x),
          f.y
        );
      }

      float fbm(vec2 p, float period) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amplitude * pnoise(p, period);
          p = p * 2.0 + vec2(13.7, 0.0);
          period *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      /* Sheared, streaky gas in disk coordinates. Two time-offset layers are
         cross-faded so differential rotation never tears the noise apart. */
      float gas(float rho, float phi) {
        float cycle = 36.0;
        float omega = 0.11 / pow(rho, 1.5);
        float t1 = mod(uTime, cycle);
        float t2 = mod(uTime + cycle * 0.5, cycle);
        float w2 = abs(t1 / cycle * 2.0 - 1.0);
        float phiN = phi / TAU;
        vec2 coarse1 = vec2(rho * 2.8, (phiN - omega * t1 / TAU) * 5.0);
        vec2 coarse2 = vec2(rho * 2.8 + 2.7, (phiN - omega * t2 / TAU) * 5.0 + 1.3);
        vec2 fine1 = vec2(rho * 8.0, (phiN - omega * t1 / TAU) * 7.0);
        vec2 fine2 = vec2(rho * 8.0 + 1.9, (phiN - omega * t2 / TAU) * 7.0 + 0.7);
        float coarse = mix(fbm(coarse1, 5.0), fbm(coarse2, 5.0), w2);
        float fine = mix(fbm(fine1, 7.0), fbm(fine2, 7.0), w2);
        /* Soft cloud clumps with drifting wisps, no hard streak lines. */
        float clouds = smoothstep(0.22, 0.78, coarse * 0.68 + fine * 0.32);
        return 0.3 + clouds * 0.95;
      }

      vec3 diskColor(float rho, float tex) {
        vec3 cream = vec3(1.0, 0.9, 0.76);
        vec3 peach = vec3(0.96, 0.72, 0.5);
        vec3 tan = vec3(0.72, 0.5, 0.34);
        vec3 dust = vec3(0.4, 0.3, 0.24);
        float h = clamp((rho - 1.05) / 6.0, 0.0, 1.0);
        vec3 color = mix(cream, peach, smoothstep(0.0, 0.2, h));
        color = mix(color, tan, smoothstep(0.15, 0.5, h));
        color = mix(color, dust, smoothstep(0.45, 1.0, h));
        return mix(color * vec3(0.62, 0.48, 0.42), color, clamp(tex, 0.0, 1.0));
      }

      /* Disk radiance at disk radius rho: rgb plus a scalar weight used for
         occlusion. The innermost gas burns white; the body cools outward. */
      vec4 shade(float rho, float tex, float innerEdge) {
        float inner = smoothstep(innerEdge - 0.1, innerEdge + 0.16, rho);
        float outer = 1.0 - smoothstep(4.5, 8.0, rho);
        float body = 1.4 * pow(1.12 / max(rho, 1.12), 1.15);
        float hot = exp(-(rho - 1.0) / 0.55) * 1.7;
        float gain = inner * outer * (0.45 + tex * 0.8);
        vec3 color = diskColor(rho, tex) * body + vec3(1.0, 0.97, 0.92) * hot * (0.75 + tex * 0.35);
        return vec4(color * gain, (body + hot) * gain);
      }

      void main() {
        vec2 p = (vUvPosition - 0.5) * uExtent;
        float r = length(p);

        /* Foreshortening of the disk plane. Lensing lifts the far side over
           the top of the shadow and folds a second image beneath it. */
        float perspective = 1.0 + 0.35 * smoothstep(-8.0, 8.0, p.x);
        float eps = 0.12 * perspective;
        float epsNear = 0.22 * perspective;
        float epsUp = eps + 0.88 * exp(-(r - 1.0) / 0.8);
        float epsDown = eps + 0.88 * exp(-(r - 1.0) / 0.9);
        float outside = smoothstep(0.985, 1.02, r);

        float upperHalf = smoothstep(-0.1, 0.1, p.y);
        float lowerHalf = 1.0 - upperHalf;

        /* Far side of the disk, lensed into the arch above. */
        float rhoUp = sqrt(p.x * p.x + (p.y / epsUp) * (p.y / epsUp));
        float phiUp = atan(p.y / epsUp, p.x);
        float texUp = gas(rhoUp, phiUp);
        vec3 far = shade(rhoUp, texUp, 1.0).rgb * outside * upperHalf;

        /* Near side of the disk, passing in front of the lower shadow. In
           front of the shadow it sits a little lower and darker, as the
           optically thick band does in the film. */
        float inFront = 1.0 - smoothstep(0.8, 1.7, abs(p.x));
        float yNear = p.y + 0.16 * inFront;
        float rhoNear = sqrt(p.x * p.x + (yNear / epsNear) * (yNear / epsNear));
        float phiNear = atan(yNear / epsNear, p.x);
        float texNear = gas(rhoNear, phiNear);
        vec4 nearShade = shade(rhoNear, texNear, 1.0);
        float silhouette = mix(0.45, 1.0, 1.0 - inFront);
        vec3 near = nearShade.rgb * lowerHalf * silhouette;
        near = mix(near * vec3(0.9, 0.6, 0.48), near, silhouette);
        float nearAlpha = clamp(nearShade.a * lowerHalf * 1.6, 0.0, 1.0);

        /* Secondary image of the disk, wrapped under the shadow. */
        float rhoDown = sqrt(p.x * p.x + (p.y / epsDown) * (p.y / epsDown));
        float phiDown = atan(p.y / epsDown, p.x);
        float texDown = gas(rhoDown, phiDown);
        vec3 under = shade(rhoDown, texDown, 1.0).rgb * outside * lowerHalf;
        under *= 0.85 * smoothstep(-0.12, -0.7, p.y);

        /* Vertical thickness: diffuse gas above and below the disk plane, so
           the band has fuzzy edges instead of a cut line. */
        float rhoMid = max(abs(p.x), 1.0);
        float texMid = gas(rhoMid, atan(0.0, p.x));
        vec4 midShade = shade(rhoMid, texMid, 1.0);
        float thickness = 0.24 + 0.07 * abs(p.x);
        float puff = exp(-pow(p.y / thickness, 2.0)) * (0.5 + texMid * 0.6) * 0.42;
        vec3 haze = midShade.rgb * puff * outside;

        /* Scattered light: a broad warm halo around the whole system. */
        vec3 halo = vec3(0.9, 0.72, 0.56) * exp(-(r - 1.0) / 1.1) * 0.12 * outside;
        halo *= 1.0 - smoothstep(2.2, 4.5, r);

        /* Relativistic beaming: the approaching (left) side burns whiter. */
        float beam = mix(1.28, 0.84, smoothstep(-6.0, 6.0, p.x));
        vec3 beamTint = mix(vec3(1.0, 1.0, 1.04), vec3(1.0, 0.86, 0.72), smoothstep(-4.0, 4.0, p.x));

        /* Photon ring: a thin white edge hugging the shadow, with a soft rim. */
        float ring = exp(-pow((r - 1.0) / 0.011, 2.0)) * (0.35 + texUp * 0.9) * beam;
        float rim = exp(-pow((r - 1.03) / 0.08, 2.0)) * 0.12 * outside;

        float occlusion = 1.0 - nearAlpha * 0.88;
        vec3 color = (far + under + haze + halo) * beam * beamTint * occlusion;
        color += near * beam * beamTint;
        color += vec3(1.0, 0.98, 0.95) * (ring * 1.1 + rim) * occlusion;

        /* Never let the plane's own rectangle show. */
        vec2 edge = smoothstep(vec2(0.0), vec2(0.06, 0.12), vUvPosition)
          * smoothstep(vec2(1.0), vec2(0.94, 0.88), vUvPosition);
        color *= edge.x * edge.y;

        color *= uOpacity;
        float intensity = max(max(color.r, color.g), color.b);
        if (intensity < 0.004) discard;
        /* Alpha follows the light so faint regions leave the page background
           showing through instead of turning the canvas opaque black. */
        gl_FragColor = vec4(color, clamp(intensity * 1.4, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  const disk = new THREE.Mesh(
    new THREE.PlaneGeometry(diskWidth, diskHeight),
    diskMaterial,
  );
  disk.rotation.z = -0.09;
  disk.renderOrder = 2;

  /* The shadow is a flat black disc painted beneath the emissive field. */
  const shadowMaterial = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 1 } },
    vertexShader: `
      varying vec2 vUvPosition;

      void main() {
        vUvPosition = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec2 vUvPosition;

      void main() {
        float r = length(vUvPosition - 0.5) * 2.0;
        float alpha = 1.0 - smoothstep(0.985, 1.005, r);
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(0.0, 0.0, 0.0, alpha * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const eventHorizon = new THREE.Mesh(
    new THREE.PlaneGeometry(shadowRadius * 2, shadowRadius * 2),
    shadowMaterial,
  );
  eventHorizon.renderOrder = 1;
  blackHole.add(eventHorizon, disk);

  /* Deep star field: stars are scattered through a long depth range behind
     the scene, so distance shows in size, brightness, and parallax. Each
     star carries its own color temperature and twinkle phase. */
  const cameraZ = 8.5;
  const starCount = smallViewport ? 500 : 1400;
  const starPositions = new Float32Array(starCount * 3);
  const baseStarPositions = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  const starPhases = new Float32Array(starCount);
  const starColors = new Float32Array(starCount * 3);
  for (let index = 0; index < starCount; index += 1) {
    const depthRoll = Math.random();
    /* Distance from the camera, biased toward the far layers. */
    const distance = 12 + Math.pow(depthRoll, 0.65) * 30;
    const spreadY = distance * 0.4;
    const spreadX = spreadY * 2.6;
    baseStarPositions[index * 3] = (Math.random() - 0.5) * spreadX;
    baseStarPositions[index * 3 + 1] = (Math.random() - 0.5) * spreadY;
    baseStarPositions[index * 3 + 2] = cameraZ - distance;

    const magnitude = Math.random();
    starSizes[index] = 1.3 + Math.pow(magnitude, 5.5) * 6.0;
    starPhases[index] = Math.random() * Math.PI * 2;

    const temperature = Math.random();
    let red = 0.82;
    let green = 0.88;
    let blue = 1;
    if (temperature > 0.9) {
      red = 1;
      green = 0.78;
      blue = 0.58;
    } else if (temperature > 0.62) {
      red = 1;
      green = 0.95;
      blue = 0.86;
    } else if (temperature > 0.3) {
      red = 0.94;
      green = 0.96;
      blue = 1;
    }
    starColors[index * 3] = red;
    starColors[index * 3 + 1] = green;
    starColors[index * 3 + 2] = blue;
  }
  starPositions.set(baseStarPositions);
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute("aSize", new THREE.BufferAttribute(starSizes, 1));
  starGeometry.setAttribute("aPhase", new THREE.BufferAttribute(starPhases, 1));
  starGeometry.setAttribute("aColor", new THREE.BufferAttribute(starColors, 3));
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uPixelRatio: { value: 1 },
      uLightMode: { value: 0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aSize;
      attribute float aPhase;
      attribute vec3 aColor;
      varying vec3 vColor;
      varying float vGlow;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float distance = -mvPosition.z;
        float twinkle = 0.78 + 0.22 * sin(uTime * (0.6 + aPhase * 0.25) + aPhase * 7.0);
        float attenuation = 22.0 / distance;
        vColor = aColor;
        vGlow = twinkle * clamp(attenuation, 0.5, 1.7) * (0.55 + aSize * 0.14);
        gl_PointSize = max(aSize * attenuation * uPixelRatio, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uLightMode;
      varying vec3 vColor;
      varying float vGlow;

      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = exp(-d * d * 7.0);
        float halo = exp(-d * 3.2) * 0.32;
        float intensity = (core + halo) * vGlow;
        if (intensity < 0.008) discard;
        vec3 color = mix(vColor, vec3(0.28, 0.31, 0.38), uLightMode);
        gl_FragColor = vec4(color * intensity * uOpacity, intensity * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.renderOrder = -1;

  /* Faint interstellar haze far behind everything, for the sense of a
     volume rather than a backdrop. */
  const nebulaDistance = 44;
  const nebulaMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
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
          p = p * 2.07 + vec2(31.3, 17.1);
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 p = (vUvPosition - 0.5) * vec2(2.6, 1.0) * 3.2;
        float drift = uTime * 0.006;
        float warp = fbm(p * 0.7 + vec2(drift, -drift * 0.6));
        float cloud = fbm(p * 1.3 + vec2(warp * 1.6, warp * 0.9) + vec2(-drift * 0.5, drift));
        float wisps = fbm(p * 3.1 - vec2(warp * 2.2, drift));
        float density = smoothstep(0.34, 0.78, cloud) * (0.55 + wisps * 0.8);
        float edge = 1.0 - smoothstep(0.55, 1.0, length((vUvPosition - 0.5) * vec2(1.6, 2.0)));
        vec3 cold = vec3(0.3, 0.38, 0.55);
        vec3 warm = vec3(0.5, 0.36, 0.3);
        vec3 color = mix(cold, warm, smoothstep(0.35, 0.75, wisps));
        float alpha = density * edge * 0.5 * uOpacity;
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(color * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const nebula = new THREE.Mesh(
    new THREE.PlaneGeometry(nebulaDistance * 1.4 * 2.6, nebulaDistance * 1.4),
    nebulaMaterial,
  );
  nebula.position.z = cameraZ - nebulaDistance;
  nebula.renderOrder = -2;
  let width = 1;
  let height = 1;
  let animationFrame = 0;
  const gravityCenterLocal = new THREE.Vector3();
  const gravityCenterWorld = new THREE.Vector3();
  const gravityPoint = new THREE.Vector3();
  const asteroidKeyLight = new THREE.DirectionalLight(0xffe2b5, 1.65);
  const asteroidFillLight = new THREE.HemisphereLight(0xaab9d0, 0x17191e, 0.72);

  camera.position.set(0, 0, cameraZ);
  asteroidKeyLight.position.set(-3.5, 4.5, 6);
  field.position.set(1.3, -0.15, -1.5);
  field.rotation.set(-0.42, 0.2, -0.08);
  field.add(plane, ...agents.flatMap((agent) => [agent.trail, agent.group]));
  scene.add(nebula, stars, field, blackHole, asteroidKeyLight, asteroidFillLight);

  function cssColor(name: string, fallback: string) {
    return getComputedStyle(root).getPropertyValue(name).trim() || fallback;
  }

  /* The wrapper used to be dimmed with CSS opacity in dark mode. That cap is
     gone so the disk can reach white, and the ambient layers carry the
     same dimming here instead. */
  function ambientLevel() {
    const dark = root.dataset.theme === "dark";
    return dark ? (smallViewport ? 0.48 : 0.56) : 1;
  }

  function syncTheme() {
    const dark = root.dataset.theme === "dark";
    const ambient = ambientLevel();

    blackHole.visible = dark;
    wire.color.set(cssColor("--line-strong", dark ? "#444240" : "#bfc1c4"));
    wire.opacity = (dark ? 0.22 : 0.14) * ambient;
    accentA.color.set(cssColor("--signal-accent-1", dark ? "#73a8d8" : "#2f6f9f"));
    accentB.color.set(cssColor("--signal-accent-2", dark ? "#a9c9e6" : "#7fa6c4"));
    accentA.opacity = (dark ? 0.42 : 0.32) * ambient;
    accentB.opacity = (dark ? 0.34 : 0.25) * ambient;
    diskMaterial.uniforms.uOpacity.value = dark ? 0.6 : 0.4;
    shadowMaterial.uniforms.uOpacity.value = dark ? 1 : 0.94;
    starMaterial.uniforms.uOpacity.value = dark ? (smallViewport ? 0.45 : 0.55) : 0.14;
    starMaterial.uniforms.uLightMode.value = dark ? 0 : 1;
    starMaterial.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    starMaterial.needsUpdate = true;
    nebula.visible = dark;
    nebulaMaterial.uniforms.uOpacity.value = smallViewport ? 0.4 : 0.55;
    asteroidKeyLight.intensity = dark ? 1.65 : 1.15;
    asteroidFillLight.intensity = dark ? 0.72 : 1.05;

    for (const [index, agent] of agents.entries()) {
      const accentColor = index % 3 === 0 ? accentA.color : accentB.color;
      agent.material.color.set(
        index % 3 === 0
          ? dark ? "#82766b" : "#655d56"
          : dark ? "#69717a" : "#515860",
      );
      agent.trailMaterial.color.copy(accentColor);
    }
  }

  function resize() {
    const nextWidth = window.innerWidth;
    const nextHeight = window.innerHeight;

    /* Mobile browser chrome changes innerHeight while scrolling. Rebuilding the
       camera for that height-only change makes the fixed black hole drift. */
    if (smallViewport && width > 1 && Math.abs(nextWidth - width) < 2) return;

    width = nextWidth;
    height = nextHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const blackHoleScale = smallViewport ? 0.5 : Math.min(0.84, 0.66 + width / 7200);
    blackHole.scale.setScalar(blackHoleScale);
    blackHole.position.set(
      smallViewport ? 1.35 : Math.min(3.75, camera.aspect * 2.35),
      smallViewport ? 1.58 : 0.72,
      -0.45,
    );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallViewport ? 1.25 : 1.6));
    starMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    renderer.setSize(width, height, false);
  }

  function gravityInfluence(distance: number, horizon: number, capture: number) {
    const value = 1 - Math.max(0, Math.min(1, (distance - horizon) / (capture - horizon)));
    return value * value * (3 - 2 * value);
  }

  function orbitAroundGravity(
    point: Three.Vector3,
    center: Three.Vector3,
    time: number,
    seed: number,
    capture: number,
    horizon: number,
  ) {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distance = Math.hypot(dx, dy);
    if (distance >= capture) return point;

    const influence = gravityInfluence(distance, horizon, capture);
    const angle =
      Math.atan2(dy, dx) +
      influence * (0.24 + time * (0.16 + (Math.abs(seed) % 5) * 0.012));
    const orbitRadius = Math.max(horizon, distance * (1 - influence * 0.13));

    point.x = center.x + Math.cos(angle) * orbitRadius;
    point.y = center.y + Math.sin(angle) * orbitRadius;
    point.z += influence * 0.08;
    return point;
  }

  function shape(time: number, gravityCenter: Three.Vector3) {
    for (let i = 0; i < positions.count; i += 1) {
      const x = basePositions[i * 3];
      const y = basePositions[i * 3 + 1];
      const dx = x - gravityCenter.x;
      const dy = y - gravityCenter.y;
      const distance = Math.hypot(dx, dy);
      const influence = gravityInfluence(distance, 0.72, 3.05);
      const radialPull = 1 - influence * 0.075;
      const warpedX = gravityCenter.x + dx * radialPull;
      const warpedY = gravityCenter.y + dy * radialPull;
      const z =
        Math.sin(x * 0.9 + time * 0.42) * 0.28 +
        Math.cos(y * 1.7 - time * 0.26) * 0.16 +
        Math.sin((x + y) * 0.55 + time * 0.18) * 0.12 -
        influence * 0.7;

      positions.setXYZ(i, warpedX, warpedY, z);
    }

    positions.needsUpdate = true;
    geometry.computeBoundingSphere();
  }

  function agentPosition(
    phase: number,
    lane: number,
    drift: number,
    time: number,
  ) {
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
    const dark = root.dataset.theme === "dark";
    const ambient = ambientLevel();
    for (const agent of agents) {
      const phase = (agent.offset + time * agent.speed) % 1;
      const current = agentPosition(
        phase,
        agent.lane,
        agent.drift,
        time,
      );

      agent.group.position.copy(current);
      agent.group.rotation.set(
        time * agent.spin.x + agent.offset * Math.PI * 2,
        time * agent.spin.y + agent.offset * Math.PI * 1.3,
        time * agent.spin.z + agent.offset * Math.PI * 0.7,
      );
      const pointOpacity = dark
        ? smallViewport ? 0.58 : 0.68
        : smallViewport ? 0.48 : 0.6;
      const trailOpacity = dark
        ? smallViewport ? 0.13 : 0.16
        : smallViewport ? 0.1 : 0.14;
      agent.material.opacity =
        (pointOpacity + Math.sin(time * 1.8 + agent.offset * 12) * 0.045) * ambient;
      agent.trailMaterial.opacity =
        (trailOpacity + Math.sin(time * 1.2 + agent.offset * 9) * 0.025) * ambient;

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

  function placeStars(time: number) {
    const starAttribute = starGeometry.attributes.position as Three.BufferAttribute;
    const blackHoleScale = blackHole.scale.x;
    blackHole.getWorldPosition(gravityCenterWorld);
    const holeDistance = cameraZ - gravityCenterWorld.z;

    for (let index = 0; index < starCount; index += 1) {
      const z = baseStarPositions[index * 3 + 2];
      const distance = cameraZ - z;
      /* Parallax: the pointer shifts near layers more than far ones. */
      const nearness = Math.max(0, Math.min(1, 1 - (distance - 12) / 30));
      const parallax = 0.55 * nearness * nearness;
      gravityPoint.set(
        baseStarPositions[index * 3] + pointer.x * parallax * 1.6,
        baseStarPositions[index * 3 + 1] + pointer.y * parallax,
        z,
      );
      /* Lens in screen space: project the hole onto this star's depth. */
      const depthRatio = distance / holeDistance;
      gravityCenterLocal.set(
        gravityCenterWorld.x * depthRatio,
        gravityCenterWorld.y * depthRatio,
        z,
      );
      orbitAroundGravity(
        gravityPoint,
        gravityCenterLocal,
        time,
        index * 0.37,
        3.15 * blackHoleScale * depthRatio,
        0.76 * blackHoleScale * depthRatio,
      );
      starAttribute.setXYZ(index, gravityPoint.x, gravityPoint.y, z);
    }

    starAttribute.needsUpdate = true;
  }

  function render(now = 0) {
    const time = reducedMotion.matches ? 0 : now * 0.001;

    pointer.lerp(pointerTarget, 0.035);
    field.rotation.x = -0.42 + pointer.y * 0.08;
    field.rotation.y = 0.2 + pointer.x * 0.14;
    field.rotation.z = -0.08 + pointer.x * 0.025;
    scene.updateMatrixWorld(true);
    blackHole.getWorldPosition(gravityCenterLocal);
    field.worldToLocal(gravityCenterLocal);
    shape(time, gravityCenterLocal);
    diskMaterial.uniforms.uTime.value = time;
    starMaterial.uniforms.uTime.value = time;
    nebulaMaterial.uniforms.uTime.value = time;

    placeStars(time);
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
      if (event.pointerType === "touch") return;
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
