"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import type * as THREE from "three";
import type { GraphicsQuality } from "@/store/game-settings";

function PlayerAvatar() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
  });

  return (
    <group ref={groupRef} position={[-1.35, 0.2, 0]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.28, 1.18, 8, 16]} />
        <meshStandardMaterial color="#a5f3fc" metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.08, 0.13]} castShadow>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial color="#082f49" emissive="#22d3ee" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.5, 0.45, 0]} rotation={[0, 0, -0.45]} castShadow>
        <boxGeometry args={[0.12, 1.35, 0.12]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function BossMonolith({ x, color }: { x: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = 0.25 + Math.sin(state.clock.elapsedTime + x) * 0.06;
  });

  return (
    <mesh ref={ref} position={[x, 0.25, -1.7]} castShadow>
      <dodecahedronGeometry args={[0.22, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.3} />
    </mesh>
  );
}

function FloatingShards() {
  const positions = useMemo(
    () => [
      [-2.2, 1.45, -0.5],
      [1.6, 1.1, -0.8],
      [2.1, 1.7, 0.5],
      [-1.8, 1.9, 0.95],
    ],
    [],
  );

  return (
    <>
      {positions.map((position, index) => (
        <Float
          key={`${position[0]}-${position[2]}`}
          speed={1.2 + index * 0.2}
          rotationIntensity={1.2}
          floatIntensity={1.1}
        >
          <mesh position={[position[0], position[1], position[2]]} castShadow>
            <octahedronGeometry args={[0.19, 0]} />
            <meshStandardMaterial color="#a5f3fc" emissive="#67e8f9" emissiveIntensity={1} />
          </mesh>
        </Float>
      ))}
    </>
  );
}

function Ground() {
  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[4.8, 80]} />
        <meshStandardMaterial color="#020617" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.43, 0]}>
        <ringGeometry args={[2.05, 2.24, 96]} />
        <meshStandardMaterial color="#164e63" emissive="#22d3ee" emissiveIntensity={0.9} />
      </mesh>
    </>
  );
}

type LobbySceneProps = {
  mouseSensitivity: number;
  graphicsQuality: GraphicsQuality;
  activeAction: string | null;
};

const qualityPresets: Record<
  GraphicsQuality,
  {
    dpr: [number, number];
    starsCount: number;
    sparklesCount: number;
    bloomIntensity: number;
    shadowMapSize: number;
    enableShadows: boolean;
  }
> = {
  low: {
    dpr: [1, 1.1],
    starsCount: 900,
    sparklesCount: 20,
    bloomIntensity: 0.2,
    shadowMapSize: 256,
    enableShadows: false,
  },
  medium: {
    dpr: [1, 1.5],
    starsCount: 1600,
    sparklesCount: 36,
    bloomIntensity: 0.4,
    shadowMapSize: 512,
    enableShadows: true,
  },
  high: {
    dpr: [1, 2],
    starsCount: 2800,
    sparklesCount: 60,
    bloomIntensity: 0.8,
    shadowMapSize: 1024,
    enableShadows: true,
  },
  ultra: {
    dpr: [1, 2.4],
    starsCount: 4200,
    sparklesCount: 90,
    bloomIntensity: 1.2,
    shadowMapSize: 2048,
    enableShadows: true,
  },
};

const actionColors: Record<string, string> = {
  forward: "#22d3ee",
  back: "#f97316",
  left: "#a78bfa",
  right: "#34d399",
  jump: "#fde047",
  skill: "#fb7185",
};

export function LobbyScene({
  mouseSensitivity,
  graphicsQuality,
  activeAction,
}: LobbySceneProps) {
  const normalizedSensitivity = Math.min(100, Math.max(1, mouseSensitivity));
  const rotateSpeed = 0.35 + normalizedSensitivity / 35;
  const zoomSpeed = 0.2 + normalizedSensitivity / 120;
  const quality = qualityPresets[graphicsQuality];
  const actionKey = activeAction || "";
  const actionColor = actionColors[actionKey] || "#22d3ee";
  const actionBoost = activeAction ? 1 : 0;

  return (
    <div className="h-[440px] w-full overflow-hidden rounded-3xl border border-cyan-300/30 bg-gradient-to-b from-slate-900 via-slate-950 to-black shadow-[0_0_80px_-28px_rgba(34,211,238,0.8)]">
      <Canvas
        dpr={quality.dpr}
        shadows={quality.enableShadows}
        camera={{ position: [0, 1.35, 5.1], fov: 48 }}
      >
        <color attach="background" args={["#020617"]} />
        <fog attach="fog" args={["#020617", 4.5, 9.5]} />

        <ambientLight intensity={0.45} />
        <directionalLight
          intensity={1.6}
          position={[3.5, 5, 2]}
          castShadow={quality.enableShadows}
          shadow-mapSize-width={quality.shadowMapSize}
          shadow-mapSize-height={quality.shadowMapSize}
        />
        <pointLight
          position={[-2, 1.1, 1.2]}
          color={actionColor}
          intensity={22 + actionBoost * 6}
          distance={6}
        />

        <Stars
          radius={85}
          depth={30}
          count={quality.starsCount}
          factor={4}
          saturation={0}
          fade
          speed={1.1}
        />
        <Sparkles
          count={quality.sparklesCount}
          scale={[7, 2.6, 6]}
          speed={0.45 + actionBoost * 0.3}
          size={1.9 + actionBoost * 0.4}
          color={actionColor}
        />

        <Ground />
        <PlayerAvatar />
        <BossMonolith x={-0.5} color="#fb7185" />
        <BossMonolith x={0.1} color="#f59e0b" />
        <BossMonolith x={0.7} color="#22d3ee" />
        <BossMonolith x={1.3} color="#818cf8" />
        <FloatingShards />

        <Environment preset="night" />
        <OrbitControls
          enablePan={false}
          maxDistance={7}
          minDistance={3.5}
          maxPolarAngle={Math.PI / 2.05}
          rotateSpeed={rotateSpeed}
          zoomSpeed={zoomSpeed}
        />
        <EffectComposer>
          <Bloom
            mipmapBlur
            luminanceThreshold={0.2}
            intensity={quality.bloomIntensity + actionBoost * 0.25}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
