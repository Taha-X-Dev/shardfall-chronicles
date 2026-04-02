import { type MutableRefObject, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";

type LevelPortalProps = {
  active: boolean;
  position: [number, number, number];
  color: string;
  heroRef: MutableRefObject<THREE.Object3D | null>;
  onEnter: () => void;
};

export function LevelPortal({ active, position, color, heroRef, onEnter }: LevelPortalProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const enteredRef = useRef(false);

  useEffect(() => {
    if (!active) {
      enteredRef.current = false;
    }
  }, [active]);

  useFrame((state) => {
    if (!active) return;
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 1.2;
    }

    if (enteredRef.current) return;
    const hero = heroRef.current;
    if (!hero) return;

    const dx = hero.position.x - position[0];
    const dz = hero.position.z - position[2];
    const distance = Math.hypot(dx, dz);
    const isJumping = hero.position.y > 0.22;
    if (distance < 1.15 && isJumping) {
      enteredRef.current = true;
      onEnter();
    }
  });

  if (!active) return null;

  return (
    <group position={position}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.08, 22, 90]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
      </mesh>

      <mesh rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 2.1, 32, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.24} side={2} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.02, 0]}>
        <ringGeometry args={[0.9, 1.14, 28]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}
