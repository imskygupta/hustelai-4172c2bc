import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { EDGES, LAYERS, nodePosition } from "./missionControlInventory";

/**
 * Mission Control 3D scene.
 *
 * Locked to the V3 contract (mem/product/v3-mission-control-contract.md):
 *   - 6 layers, only the listed nodes, only the listed edges.
 *   - Story-driven (phase 1..5 scrubbed by scroll), not a spinning model.
 *   - Desktop-only; mobile uses the isometric fallback.
 */

function layerActivation(phase: number, layerIndex: number) {
  // Layer lights up as phase crosses its threshold (1-indexed).
  // Outcomes (idx 5) shares phase 5 with delivery.
  const threshold = Math.min(layerIndex + 1, 5);
  return Math.max(0, Math.min(1, phase - threshold + 1));
}

function NodeMesh({
  position,
  label,
  active,
  accent,
}: {
  position: [number, number, number];
  label: string;
  active: number; // 0..1
  accent: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((_, dt) => {
    if (!ref.current || !matRef.current) return;
    const target = 0.15 + active * 1.4;
    matRef.current.emissiveIntensity = THREE.MathUtils.damp(
      matRef.current.emissiveIntensity,
      target,
      6,
      dt,
    );
    const targetY = position[1] + active * 0.08;
    ref.current.position.y = THREE.MathUtils.damp(
      ref.current.position.y,
      targetY,
      6,
      dt,
    );
  });

  return (
    <group position={position}>
      <mesh ref={ref}>
        <boxGeometry args={[1.55, 0.55, 0.22]} />
        <meshStandardMaterial
          ref={matRef}
          color="#0f172a"
          emissive={accent}
          emissiveIntensity={0.2}
          metalness={0.4}
          roughness={0.35}
        />
      </mesh>
      <Html
        center
        distanceFactor={9}
        position={[0, 0, 0.13]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          className="font-mono text-[11px] tracking-wide text-white whitespace-nowrap"
          style={{ opacity: 0.55 + active * 0.45 }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

function Edge({
  from,
  to,
  active,
  accent,
}: {
  from: [number, number, number];
  to: [number, number, number];
  active: number;
  accent: string;
}) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([...from, ...to], 3),
    );
    return g;
  }, [from, to]);
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  useFrame((_, dt) => {
    if (!matRef.current) return;
    matRef.current.opacity = THREE.MathUtils.damp(
      matRef.current.opacity,
      0.12 + active * 0.75,
      6,
      dt,
    );
  });
  return (
    <line>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial
        ref={matRef}
        color={accent}
        transparent
        opacity={0.12}
      />
    </line>
  );
}

const LAYER_ACCENTS: Record<string, string> = {
  inputs: "#38bdf8",
  planning: "#a78bfa",
  intelligence: "#34d399",
  execution: "#f59e0b",
  delivery: "#f472b6",
  outcomes: "#10b981",
};

function SceneContents({ phaseRef }: { phaseRef: React.MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Pre-compute node positions and layer lookup.
  const nodes = useMemo(
    () =>
      LAYERS.flatMap((l) =>
        l.nodes.map((n) => ({
          id: n.id,
          label: n.label,
          layer: l.id,
          layerIndex: l.index,
          position: nodePosition(n.id),
        })),
      ),
    [],
  );

  const edges = useMemo(
    () =>
      EDGES.map(([a, b]) => {
        const an = nodes.find((n) => n.id === a)!;
        const bn = nodes.find((n) => n.id === b)!;
        return { a: an, b: bn };
      }),
    [nodes],
  );

  // Story-driven camera drift + ambient breath. As phase advances the camera
  // descends through layers and pushes slightly closer at mid-arc, so the
  // user feels pulled through the system instead of staring at a pinned model.
  useFrame(({ clock }, dt) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    const phase = phaseRef.current; // 0.4..5
    const p = Math.max(0, Math.min(1, (phase - 0.4) / 4.6));

    group.current.rotation.y = Math.sin(t * 0.22) * 0.05 - 0.16 + p * 0.05;
    group.current.rotation.x = -0.18 - p * 0.06;

    const targetY = 2.2 - p * 4.0;
    const targetZ = 11.5 - Math.sin(p * Math.PI) * 1.6;
    const targetX = Math.sin(t * 0.18) * 0.25;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 2.2, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 2.2, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 2.2, dt);
    camera.lookAt(0, targetY * 0.6, 0);
  });

  // Per-frame activation values via refs avoids re-renders.
  const nodeActivations = useRef<Record<string, number>>({});
  const edgeActivations = useRef<number[]>([]);

  useFrame(() => {
    const phase = phaseRef.current;
    for (const n of nodes) {
      nodeActivations.current[n.id] = layerActivation(phase, n.layerIndex);
    }
    edgeActivations.current = edges.map(({ a, b }) => {
      const av = layerActivation(phase, a.layerIndex);
      const bv = layerActivation(phase, b.layerIndex);
      return Math.min(av, bv);
    });
  });

  return (
    <group ref={group} position={[0, -0.5, 0]}>
      {edges.map(({ a, b }, i) => (
        <EdgeWithActivation
          key={`${a.id}-${b.id}`}
          from={a.position}
          to={b.position}
          accent={LAYER_ACCENTS[b.layer]}
          getActive={() => edgeActivations.current[i] ?? 0}
        />
      ))}
      {nodes.map((n) => (
        <NodeWithActivation
          key={n.id}
          position={n.position}
          label={n.label}
          accent={LAYER_ACCENTS[n.layer]}
          getActive={() => nodeActivations.current[n.id] ?? 0}
        />
      ))}
      {/* Layer captions on the left */}
      {LAYERS.map((l) => (
        <Html
          key={l.id}
          position={[-5.2, -l.index * 1.35 + 1.35 * 2.5, 0]}
          center
          distanceFactor={9}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div className="text-right">
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

// Wrappers that read activation via a getter (avoids re-render per frame).
function NodeWithActivation({
  getActive,
  ...rest
}: Omit<Parameters<typeof NodeMesh>[0], "active"> & { getActive: () => number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const a = getActive();
    if (matRef.current) {
      matRef.current.emissiveIntensity = THREE.MathUtils.damp(
        matRef.current.emissiveIntensity,
        0.15 + a * 1.4,
        6,
        dt,
      );
    }
    if (meshRef.current) {
      meshRef.current.position.y = THREE.MathUtils.damp(
        meshRef.current.position.y,
        a * 0.08,
        6,
        dt,
      );
    }
  });
  return (
    <group position={rest.position}>
      <mesh ref={meshRef}>
        <boxGeometry args={[1.55, 0.55, 0.22]} />
        <meshStandardMaterial
          ref={matRef}
          color="#0b1220"
          emissive={rest.accent}
          emissiveIntensity={0.2}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      <Html
        center
        distanceFactor={9}
        position={[0, 0, 0.13]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div className="font-mono text-[11px] tracking-wide text-white whitespace-nowrap drop-shadow">
          {rest.label}
        </div>
      </Html>
    </group>
  );
}

function EdgeWithActivation({
  from,
  to,
  accent,
  getActive,
}: {
  from: [number, number, number];
  to: [number, number, number];
  accent: string;
  getActive: () => number;
}) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([...from, ...to], 3),
    );
    return g;
  }, [from, to]);
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  useFrame((_, dt) => {
    if (!matRef.current) return;
    const a = getActive();
    matRef.current.opacity = THREE.MathUtils.damp(
      matRef.current.opacity,
      0.1 + a * 0.8,
      6,
      dt,
    );
  });
  return (
    <line>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial ref={matRef} color={accent} transparent opacity={0.1} />
    </line>
  );
}

export interface MissionControlSceneProps {
  phaseRef: React.MutableRefObject<number>;
}

export default function MissionControlScene({ phaseRef }: MissionControlSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.5, 11], fov: 38 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 6, 5]} intensity={0.8} />
      <directionalLight position={[-6, -3, -4]} intensity={0.25} color="#38bdf8" />
      <Suspense fallback={null}>
        <SceneContents phaseRef={phaseRef} />
      </Suspense>
      {/* Story-first: no orbit/zoom for visitors. */}
      <OrbitControls enabled={false} />
    </Canvas>
  );
}

// Avoid the unused NodeMesh warning while keeping the simpler reference impl.
void NodeMesh;
void Edge;