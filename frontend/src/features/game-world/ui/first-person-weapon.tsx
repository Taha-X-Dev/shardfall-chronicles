import { type MutableRefObject, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";
import { Vector3 } from "three";

type FirstPersonWeaponProps = {
  cameraShakeRef: MutableRefObject<number>;
  movingRef: MutableRefObject<boolean>;
  attackTimerRef: MutableRefObject<number>;
  attackTypeRef: MutableRefObject<"light" | "heavy" | null>;
};

export function FirstPersonWeapon({
  cameraShakeRef,
  movingRef,
  attackTimerRef,
  attackTypeRef,
}: FirstPersonWeaponProps) {
  const { camera } = useThree();
  const rootRef = useRef<THREE.Group>(null);
  const weaponRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const targetPosition = useMemo(() => new Vector3(), []);
  const localPosition = useMemo(() => new Vector3(), []);
  const weaponOffset = useMemo(() => new Vector3(0.36, -0.43, -0.67), []);

  useFrame((state, delta) => {
    if (!rootRef.current || !weaponRef.current) return;

    const t = state.clock.elapsedTime;
    const walkBob = movingRef.current ? Math.sin(t * 9) * 0.018 : 0;
    const shake = cameraShakeRef.current;

    const isAttacking = attackTimerRef.current > 0;
    const attackType = attackTypeRef.current;
    let attackX = 0;
    let attackY = 0;
    let attackZ = 0;
    let rotX = -0.12;
    let rotY = 0;
    let rotZ = 0;
    let rightArmSwing = movingRef.current ? Math.sin(t * 9) * 0.08 : 0;

    if (isAttacking) {
      const duration = attackType === "heavy" ? 0.34 : 0.22;
      const progress = 1 - Math.max(0, attackTimerRef.current) / duration;
      const swing = Math.sin(progress * Math.PI);
      const heavyMul = attackType === "heavy" ? 1.4 : 1;

      attackX = -0.07 * swing * heavyMul;
      attackY = 0.08 * swing;
      attackZ = 0.05 * swing;
      rotX = -0.12 - 0.58 * swing * heavyMul;
      rotY = 0.08 + 0.16 * swing;
      rotZ = -0.16 * swing;
      rightArmSwing += -0.95 * swing * heavyMul;
    }

    localPosition.set(
      weaponOffset.x + attackX,
      weaponOffset.y + walkBob + attackY,
      weaponOffset.z + attackZ,
    );
    targetPosition.copy(localPosition).applyQuaternion(camera.quaternion).add(camera.position);
    const followAlpha = 1 - Math.exp(-24 * delta);

    rootRef.current.position.lerp(targetPosition, followAlpha);
    rootRef.current.quaternion.slerp(camera.quaternion, followAlpha);
    weaponRef.current.rotation.set(rotX + shake * 0.03, rotY, rotZ);

    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = rightArmSwing;
      rightArmRef.current.rotation.y = 0.18;
      rightArmRef.current.rotation.z = -0.18;
    }
  });

  return (
    <group ref={rootRef}>
      <group ref={weaponRef}>
        <group ref={rightArmRef} position={[0.24, -0.04, -0.1]}>
          <mesh>
            <boxGeometry args={[0.11, 0.43, 0.12]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.24, 0.02]}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
          </mesh>

          <mesh position={[0.05, 0.18, -0.02]}>
            <boxGeometry args={[0.11, 0.19, 0.13]} />
            <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.45} />
          </mesh>
          <mesh position={[0.1, 0.66, -0.02]}>
            <boxGeometry args={[0.045, 1.1, 0.06]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.86} roughness={0.15} />
          </mesh>
          <mesh position={[0.1, 1.09, -0.02]}>
            <coneGeometry args={[0.05, 0.16, 10]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.08} />
          </mesh>
          <mesh position={[0.1, 0.39, -0.02]}>
            <boxGeometry args={[0.22, 0.03, 0.1]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>
      </group>
    </group>
  );
}
