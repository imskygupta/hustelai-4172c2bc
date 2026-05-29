import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { EDGES, LAYERS, nodePosition } from "./missionControlInventory";

/**
 * Mission Control — 6 scenes, distinct physics per scene.
 * See mem/product/v3-mission-control-contract.md.
 *
 *   phase 1 — chaotic drift (no grid, no edges)
 *   phase 2 — magnetic convergence into the grid
 *   phase 3 — pulse propagation along edges
 *   phase 4 — outbound packets fly to Delivery
 *   phase 5 — circular loops around Outcomes
 *   phase 6 — camera pulls back, full reveal
 */

const LAYER_ACCENTS: Record<string, string> = {
  inputs: "#38bdf8",
  planning: "#a78bfa",
  intelligence: "#34d399",
  execution: "#f59e0b",
  delivery: "#f472b6",
  outcomes: "#10b981",
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
// "Window" — ramps 0→1 across [start, start+1], stays 1 after.
function windowAt(phase: number, start: number) {
  return clamp01(phase - start);
}

// Deterministic pseudo-random for chaos positions.
function hashRand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

interface NodeRuntime {
  id: string;
  label: string;
  layer: string;
  layerIndex: number;
  grid: THREE.Vector3;
  chaos: THREE.Vector3;
  chaosDrift: THREE.Vector3;
}

function buildNodes(): NodeRuntime[] {
  const out: NodeRuntime[] = [];
  let i = 0;
  for (const l of LAYERS) {
    for (const n of l.nodes) {
      const gp = nodePosition(n.id);
      i++;
      out.push({
        id: n.id,
        label: n.label,
        layer: l.id,
        layerIndex: l.index,
        grid: new THREE.Vector3(gp[0], gp[1], gp[2]),
        chaos: new THREE.Vector3(
          (hashRand(i) - 0.5) * 12,
          (hashRand(i + 99) - 0.5) * 6 + 1,
          (hashRand(i + 33) - 0.5) * 4,
        ),
        chaosDrift: new THREE.Vector3(
          (hashRand(i + 7) - 0.5) * 0.6,
          (hashRand(i + 13) - 0.5) * 0.4,
          (hashRand(i + 21) - 0.5) * 0.3,
        ),
      });
    }
  }
  return out;
}

/** A node card whose position lerps from chaos → grid as phase crosses 1→2. */
function NodeMesh({
  node,
  phaseRef,
}: {
  node: NodeRuntime;
  phaseRef: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, dt) => {
    if (!groupRef.current) return;
    const phase = phaseRef.current;
    const t = clock.getElapsedTime();

    // Convergence amount: 0 during scene 1, 1 by scene 2.
    const converge = windowAt(phase, 1);

    // Chaos position drifts over time (scene 1 only).
    tmp.set(
      node.chaos.x + Math.sin(t * 0.4 + node.chaos.x) * node.chaosDrift.x * 1.5,
      node.chaos.y + Math.cos(t * 0.35 + node.chaos.y) * node.chaosDrift.y * 1.5,
      node.chaos.z + Math.sin(t * 0.3 + node.chaos.z) * node.chaosDrift.z,
    );

    // Lerp toward grid as we converge.
    const targetX = THREE.MathUtils.lerp(tmp.x, node.grid.x, converge);
    const targetY = THREE.MathUtils.lerp(tmp.y, node.grid.y, converge);
    const targetZ = THREE.MathUtils.lerp(tmp.z, node.grid.z, converge);

    groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetX, 4, dt);
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 4, dt);
    groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetZ, 4, dt);

    // Chaos rotation in scene 1, snap flat after.
    const wobble = (1 - converge) * 0.4;
    groupRef.current.rotation.x = THREE.MathUtils.damp(
      groupRef.current.rotation.x,
      Math.sin(t * 0.6 + node.chaos.x) * wobble,
      3,
      dt,
    );
    groupRef.current.rotation.z = THREE.MathUtils.damp(
      groupRef.current.rotation.z,
      Math.cos(t * 0.5 + node.chaos.y) * wobble,
      3,
      dt,
    );

    // Per-layer activation: layer N lights up when phase crosses N+1.
    // Scene 2 = capture (planning), 3 = intel, 4 = delivery (execution+delivery), 5 = outcomes, 6 = full.
    let layerLit = 0;
    if (phase >= 6) layerLit = 1;
    else if (node.layer === "inputs") layerLit = windowAt(phase, 1.2);
    else if (node.layer === "planning") layerLit = windowAt(phase, 1.6);
    else if (node.layer === "intelligence") layerLit = windowAt(phase, 2.6);
    else if (node.layer === "execution") layerLit = windowAt(phase, 3.4);
    else if (node.layer === "delivery") layerLit = windowAt(phase, 3.8);
    else if (node.layer === "outcomes") layerLit = windowAt(phase, 4.6);

    if (matRef.current) {
      matRef.current.emissiveIntensity = THREE.MathUtils.damp(
        matRef.current.emissiveIntensity,
        0.15 + layerLit * 1.4,
        5,
        dt,
      );
      matRef.current.opacity = THREE.MathUtils.damp(
        matRef.current.opacity,
        // Scene 1: chaos cards faint and muted; show only sparingly.
        converge < 0.5 ? 0.45 + converge * 0.4 : 0.85 + layerLit * 0.15,
        5,
        dt,
      );
    }

    if (labelRef.current) {
      labelRef.current.style.opacity = String(
        converge < 0.4 ? 0 : 0.4 + layerLit * 0.6,
      );
    }
  });

  return (
    <group ref={groupRef} position={[node.chaos.x, node.chaos.y, node.chaos.z]}>
      <mesh>
        <boxGeometry args={[1.55, 0.55, 0.22]} />
        <meshStandardMaterial
          ref={matRef}
          color="#0b1220"
          emissive={LAYER_ACCENTS[node.layer]}
          emissiveIntensity={0.2}
          metalness={0.5}
          roughness={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>
      <Html
        center
        distanceFactor={9}
        position={[0, 0, 0.13]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          ref={labelRef}
          className="font-mono text-[11px] tracking-wide text-white whitespace-nowrap drop-shadow"
          style={{ opacity: 0 }}
        >
          {node.label}
        </div>
      </Html>
    </group>
  );
}

/**
 * Edge line that fades in during scene 2 (with grid) and animates a pulse
 * traveling along it during scene 3. We use a dashed shader trick via
 * setting `gapSize` / `dashOffset` on LineDashedMaterial proxied via the
 * builtin Line2 would be heavier — keep simple: alpha map via texture coord
 * is overkill, so we render the line + a small traveling sphere as the pulse.
 */
function EdgeWithPulse({
  from,
  to,
  accentTo,
  phaseRef,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  accentTo: string;
  phaseRef: React.MutableRefObject<number>;
}) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([from.x, from.y, from.z, to.x, to.y, to.z], 3),
    );
    return g;
  }, [from, to]);
  const lineMatRef = useRef<THREE.LineBasicMaterial>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const pulseMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }, dt) => {
    const phase = phaseRef.current;
    const t = clock.getElapsedTime();

    // Edges appear during scene 2.
    const lineVis = windowAt(phase, 1.5);
    // Pulses live primarily in scene 3 and persist faintly through 4/5/6.
    const pulseVis = clamp01(Math.min(windowAt(phase, 2.4), 6 - Math.max(phase, 3)) * 1);
    const pulseFull = phase >= 2.6 ? 1 : 0;

    if (lineMatRef.current) {
      lineMatRef.current.opacity = THREE.MathUtils.damp(
        lineMatRef.current.opacity,
        0.05 + lineVis * 0.55,
        4,
        dt,
      );
    }

    if (pulseRef.current && pulseMatRef.current) {
      // Travel along the edge with time, repeating.
      const u = (t * 0.45) % 1;
      pulseRef.current.position.lerpVectors(from, to, u);
      const op =
        pulseFull *
        clamp01(pulseVis) *
        (0.7 + 0.3 * Math.sin(t * 4));
      pulseMatRef.current.opacity = THREE.MathUtils.damp(
        pulseMatRef.current.opacity,
        op,
        6,
        dt,
      );
      const s = 0.06 + 0.04 * Math.sin(t * 5);
      pulseRef.current.scale.setScalar(s * (0.5 + 0.5 * op));
    }
  });

  return (
    <group>
      <line>
        <primitive object={geom} attach="geometry" />
        <lineBasicMaterial
          ref={lineMatRef}
          color={accentTo}
          transparent
          opacity={0.05}
        />
      </line>
      <mesh ref={pulseRef}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial ref={pulseMatRef} color={accentTo} transparent opacity={0} />
      </mesh>
    </group>
  );
}

/** Outbound packets (scene 4): little cubes fly from Execution out to Delivery nodes. */
function OutboundPackets({
  executionPositions,
  deliveryPositions,
  phaseRef,
}: {
  executionPositions: THREE.Vector3[];
  deliveryPositions: THREE.Vector3[];
  phaseRef: React.MutableRefObject<number>;
}) {
  const COUNT = 14;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () => Array.from({ length: COUNT }, (_, i) => ({
      from: i % executionPositions.length,
      to: i % deliveryPositions.length,
      offset: hashRand(i + 1) * 1,
      speed: 0.35 + hashRand(i + 7) * 0.25,
    })),
    [executionPositions, deliveryPositions],
  );

  useFrame(({ clock }, dt) => {
    if (!meshRef.current || !matRef.current) return;
    const phase = phaseRef.current;
    const t = clock.getElapsedTime();
    // Active in scene 4, residual in 5/6.
    const vis = clamp01(windowAt(phase, 3.4) - clamp01(phase - 5.5) * 0.7);
    matRef.current.opacity = THREE.MathUtils.damp(matRef.current.opacity, vis * 0.95, 4, dt);

    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i];
      const u = (t * s.speed + s.offset) % 1;
      const from = executionPositions[s.from];
      const to = deliveryPositions[s.to];
      dummy.position.lerpVectors(from, to, u);
      // Slight arc upward in the middle.
      dummy.position.y += Math.sin(u * Math.PI) * 0.25;
      const scale = vis * (0.06 + 0.04 * Math.sin(u * Math.PI));
      dummy.scale.setScalar(scale);
      dummy.rotation.set(t * 1.2 + i, t * 0.8 + i, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial ref={matRef} color="#f472b6" transparent opacity={0} />
    </instancedMesh>
  );
}

/** Circular revenue loops (scene 5): orbits around the Outcomes row. */
function RevenueLoops({
  outcomesPositions,
  phaseRef,
}: {
  outcomesPositions: THREE.Vector3[];
  phaseRef: React.MutableRefObject<number>;
}) {
  const center = useMemo(() => {
    const c = new THREE.Vector3();
    outcomesPositions.forEach((p) => c.add(p));
    return c.multiplyScalar(1 / Math.max(outcomesPositions.length, 1));
  }, [outcomesPositions]);

  const ringGeom = useMemo(() => {
    const seg = 128;
    const pts: number[] = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pts.push(Math.cos(a), 0, Math.sin(a));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  const ringRefs = useRef<(THREE.LineBasicMaterial | null)[]>([]);
  const dotRef = useRef<THREE.Mesh>(null);
  const dotMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }, dt) => {
    const phase = phaseRef.current;
    const t = clock.getElapsedTime();
    const vis = clamp01(windowAt(phase, 4.4));
    ringRefs.current.forEach((m, i) => {
      if (!m) return;
      m.opacity = THREE.MathUtils.damp(m.opacity, vis * (0.5 - i * 0.1), 4, dt);
    });
    if (dotRef.current && dotMatRef.current) {
      const u = (t * 0.4) % 1;
      const a = u * Math.PI * 2;
      dotRef.current.position.set(
        center.x + Math.cos(a) * 3.5,
        center.y,
        center.z + Math.sin(a) * 3.5,
      );
      dotMatRef.current.opacity = THREE.MathUtils.damp(dotMatRef.current.opacity, vis, 4, dt);
      dotRef.current.scale.setScalar(0.1 + 0.04 * Math.sin(t * 4));
    }
  });

  return (
    <group position={[center.x, center.y, center.z]} rotation={[Math.PI / 2.4, 0, 0]}>
      {[3.5, 2.6, 1.8].map((r, i) => (
        <line key={r} scale={[r, 1, r]} position={[-center.x, -center.y, -center.z]}>
          <primitive object={ringGeom} attach="geometry" />
          <lineBasicMaterial
            ref={(m) => (ringRefs.current[i] = m)}
            color="#10b981"
            transparent
            opacity={0}
          />
        </line>
      ))}
      <mesh ref={dotRef} position={[0, 0, 0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial ref={dotMatRef} color="#34d399" transparent opacity={0} />
      </mesh>
    </group>
  );
}

function SceneContents({ phaseRef }: { phaseRef: React.MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const nodes = useMemo(() => buildNodes(), []);

  const edges = useMemo(
    () =>
      EDGES.map(([a, b]) => {
        const an = nodes.find((n) => n.id === a)!;
        const bn = nodes.find((n) => n.id === b)!;
        return { a: an, b: bn };
      }),
    [nodes],
  );

  const executionPositions = useMemo(
    () => nodes.filter((n) => n.layer === "execution").map((n) => n.grid),
    [nodes],
  );
  const deliveryPositions = useMemo(
    () => nodes.filter((n) => n.layer === "delivery").map((n) => n.grid),
    [nodes],
  );
  const outcomesPositions = useMemo(
    () => nodes.filter((n) => n.layer === "outcomes").map((n) => n.grid),
    [nodes],
  );

  // Camera choreography per scene.
  useFrame(({ clock }, dt) => {
    const phase = phaseRef.current;
    const t = clock.getElapsedTime();

    // Scene targets — interpolated.
    // 1 chaos: close, off-center
    // 2 capture: center, mid distance
    // 3 intel: settle, slight zoom-in
    // 4 delivery: pan right slightly to imply outward flow
    // 5 revenue: tilt down to outcomes row
    // 6 reveal: pull WAY back, top-down-ish
    let tx = 0, ty = 0, tz = 11, lookY = 0;
    if (phase < 2) {
      const u = clamp01(phase - 0.4);
      tx = THREE.MathUtils.lerp(2.5, 0, u);
      ty = THREE.MathUtils.lerp(2, 1.5, u);
      tz = THREE.MathUtils.lerp(9.5, 11, u);
      lookY = 0.5;
    } else if (phase < 3) {
      const u = clamp01(phase - 2);
      tx = 0;
      ty = THREE.MathUtils.lerp(1.5, 1.0, u);
      tz = THREE.MathUtils.lerp(11, 10, u);
      lookY = THREE.MathUtils.lerp(0.5, 0, u);
    } else if (phase < 4) {
      const u = clamp01(phase - 3);
      tx = THREE.MathUtils.lerp(0, 1.5, u);
      ty = THREE.MathUtils.lerp(1.0, -1.0, u);
      tz = 10.5;
      lookY = THREE.MathUtils.lerp(0, -1.2, u);
    } else if (phase < 5) {
      const u = clamp01(phase - 4);
      tx = THREE.MathUtils.lerp(1.5, 0, u);
      ty = THREE.MathUtils.lerp(-1.0, -2.8, u);
      tz = THREE.MathUtils.lerp(10.5, 10, u);
      lookY = THREE.MathUtils.lerp(-1.2, -2.5, u);
    } else {
      const u = clamp01(phase - 5);
      tx = 0;
      ty = THREE.MathUtils.lerp(-2.8, -0.5, u);
      tz = THREE.MathUtils.lerp(10, 22, u);
      lookY = THREE.MathUtils.lerp(-2.5, -1.0, u);
    }

    // Subtle breath always.
    tx += Math.sin(t * 0.18) * 0.15;
    ty += Math.cos(t * 0.22) * 0.08;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, 2, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, ty, 2, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, tz, 2, dt);
    camera.lookAt(0, lookY, 0);

    if (group.current) {
      // Layer labels group rotates slightly during scene 1 chaos.
      const converge = windowAt(phase, 1);
      group.current.rotation.y = THREE.MathUtils.damp(
        group.current.rotation.y,
        -0.16 + (1 - converge) * Math.sin(t * 0.4) * 0.1,
        3,
        dt,
      );
      group.current.rotation.x = THREE.MathUtils.damp(
        group.current.rotation.x,
        -0.18,
        3,
        dt,
      );
    }
  });

  // Layer captions opacity ramps with convergence.
  const captionsRef = useRef<HTMLDivElement[]>([]);
  useFrame((_, dt) => {
    const phase = phaseRef.current;
    const converge = windowAt(phase, 1.2);
    captionsRef.current.forEach((el) => {
      if (!el) return;
      const cur = parseFloat(el.style.opacity || "0");
      const next = cur + (converge * 0.9 - cur) * Math.min(1, dt * 4);
      el.style.opacity = String(next);
    });
  });

  return (
    <group ref={group} position={[0, -0.5, 0]}>
      {edges.map(({ a, b }) => (
        <EdgeWithPulse
          key={`${a.id}-${b.id}`}
          from={a.grid}
          to={b.grid}
          accentTo={LAYER_ACCENTS[b.layer]}
          phaseRef={phaseRef}
        />
      ))}
      {nodes.map((n) => (
        <NodeMesh key={n.id} node={n} phaseRef={phaseRef} />
      ))}
      <OutboundPackets
        executionPositions={executionPositions}
        deliveryPositions={deliveryPositions}
        phaseRef={phaseRef}
      />
      <RevenueLoops outcomesPositions={outcomesPositions} phaseRef={phaseRef} />

      {LAYERS.map((l, idx) => (
        <Html
          key={l.id}
          position={[-5.2, -l.index * 1.35 + 1.35 * 2.5, 0]}
          center
          distanceFactor={9}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            ref={(el) => {
              if (el) captionsRef.current[idx] = el;
            }}
            className="text-right"
            style={{ opacity: 0 }}
          >
            <div
              className="text-[10px] uppercase tracking-[0.2em] font-semibold"
              style={{ color: LAYER_ACCENTS[l.id] }}
            >
              {l.title}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
              {l.caption}
            </div>
          </div>
        </Html>
      ))}
    </group>
  );
}

export interface MissionControlSceneProps {
  phaseRef: React.MutableRefObject<number>;
}

export default function MissionControlScene({ phaseRef }: MissionControlSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [2.5, 2, 9.5], fov: 38 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 6, 5]} intensity={0.8} />
      <directionalLight position={[-6, -3, -4]} intensity={0.25} color="#38bdf8" />
      <Suspense fallback={null}>
        <SceneContents phaseRef={phaseRef} />
      </Suspense>
      <OrbitControls enabled={false} />
    </Canvas>
  );
}