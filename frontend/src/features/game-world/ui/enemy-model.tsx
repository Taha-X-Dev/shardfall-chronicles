import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { clamp, getEnemyPalette, lerpAngle } from "@/features/game-world/model/combat-utils";
import type { EnemyInstance } from "@/features/game-world/model/types";

type EnemyModelProps = {
  enemy: EnemyInstance;
  highlighted: boolean;
};

export function EnemyModel({ enemy, highlighted }: EnemyModelProps) {
  const ref = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const bodyMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const auraMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const healthRatio = clamp(enemy.currentHealth / Math.max(1, enemy.maxHealth), 0, 1);
  const scale = Math.min(1.65, 0.9 + enemy.level * 0.06);
  const palette = getEnemyPalette(enemy.level);

  useFrame((state, delta) => {
    if (!ref.current) return;

    const now = Date.now();
    const t = state.clock.elapsedTime;
    const isChasing = enemy.behavior === "chase";
    const isAttacking = enemy.behavior === "attack";

    const spawnWindowMs = 640;
    const spawnProgress = clamp((now - enemy.spawnAt) / spawnWindowMs, 0, 1);
    const spawnEase = 1 - Math.pow(1 - spawnProgress, 3);
    const spawnDrop = (1 - spawnEase) * 1.2;
    const spawnScaleMul = 0.72 + spawnEase * 0.28;
    const spawnGlow = (1 - spawnEase) * 0.4;

    const hitWindowMs = 220;
    const hitRemaining = Math.max(0, enemy.hitUntil - now);
    const hitProgress = hitRemaining > 0 ? 1 - hitRemaining / hitWindowMs : 0;
    const hitPunch = hitRemaining > 0 ? Math.sin(hitProgress * Math.PI) : 0;

    const attackWindowMs = 280;
    const attackRemaining = Math.max(0, enemy.attackUntil - now);
    const attackProgress = attackRemaining > 0 ? 1 - attackRemaining / attackWindowMs : 0;
    const attackSwing = attackRemaining > 0 ? Math.sin(attackProgress * Math.PI) : 0;

    const idleBob = Math.sin(t * 2 + enemy.phase) * 0.055;
    const chaseBob = Math.sin(t * 10 + enemy.phase) * (isChasing ? 0.06 : 0);
    const attackLift = attackSwing * (isAttacking ? 0.035 : 0);
    const forwardX = Math.sin(enemy.facing);
    const forwardZ = -Math.cos(enemy.facing);
    const lungeDistance = attackSwing * (isAttacking ? 0.28 : 0);
    const sidestep = Math.sin(t * 7 + enemy.phase) * (isChasing ? 0.04 : 0);
    const hitKick = hitPunch * 0.2;
    const hitTilt = hitPunch * 0.22;

    ref.current.position.x =
      enemy.x + forwardX * lungeDistance + forwardZ * sidestep - forwardX * hitKick;
    ref.current.position.z =
      enemy.z + forwardZ * lungeDistance - forwardX * sidestep - forwardZ * hitKick;
    ref.current.position.y =
      0.78 - spawnDrop + (idleBob + chaseBob + attackLift) * (0.7 + scale * 0.35);
    ref.current.scale.setScalar(scale * spawnScaleMul * (1 + hitPunch * 0.05));

    if (enemy.behavior === "idle") {
      ref.current.rotation.y += 0.0023 + enemy.level * 0.00018;
    } else {
      const targetYaw = enemy.facing + attackSwing * 0.22 + hitTilt * 0.35;
      ref.current.rotation.y = lerpAngle(
        ref.current.rotation.y,
        targetYaw,
        1 - Math.exp(-12 * delta),
      );
    }
    ref.current.rotation.z = hitTilt * 0.12;

    if (bodyMatRef.current) {
      const baseEmissive = highlighted ? 0.6 : 0.18;
      const chaseBoost = isChasing ? 0.1 : 0;
      const attackBoost = isAttacking ? 0.18 : 0;
      const hitBoost = hitPunch * 0.7;
      bodyMatRef.current.emissiveIntensity =
        baseEmissive + chaseBoost + attackBoost + hitBoost + spawnGlow;
      bodyMatRef.current.color.set(highlighted || hitPunch > 0.2 ? "#fecaca" : palette.body);
      bodyMatRef.current.emissive.set(
        highlighted || hitPunch > 0.12 ? "#ef4444" : palette.emissive,
      );
    }

    if (auraMatRef.current) {
      const auraIdle = 0.46 + Math.sin(t * 4 + enemy.phase) * 0.07;
      const auraBoost = (isChasing ? 0.1 : 0) + (isAttacking ? 0.15 : 0) + hitPunch * 0.18;
      auraMatRef.current.opacity = clamp(auraIdle + auraBoost + spawnGlow * 0.3, 0.24, 0.86);
    }

    const idleArmSwing = enemy.behavior === "idle" ? Math.sin(t * 3.4 + enemy.phase) * 0.1 : 0;
    const runArmSwing = isChasing ? Math.sin(t * 12 + enemy.phase) * 0.48 : 0;
    const armAttack = attackSwing * (isAttacking ? 1.2 : 0);
    const armSwing = idleArmSwing + runArmSwing;
    const armFlinch = hitPunch * 0.8;

    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = 0.2 + armSwing + armAttack + armFlinch;
      leftArmRef.current.rotation.z = 0.1;
    }

    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = -0.2 - armSwing + armAttack * 0.25 + armFlinch * 0.2;
      rightArmRef.current.rotation.z = -0.1;
    }
  });

  return (
    <group ref={ref} position={[enemy.x, 0.78, enemy.z]} scale={[scale, scale, scale]}>
      <mesh castShadow>
        <boxGeometry args={[0.75, 0.9, 0.55]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color={highlighted ? "#fca5a5" : palette.body}
          emissive={highlighted ? "#ef4444" : palette.emissive}
          emissiveIntensity={highlighted ? 0.6 : 0.18}
          roughness={0.45}
        />
      </mesh>

      <group ref={leftArmRef} position={[-0.44, 0.08, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.52, 0.16]} />
          <meshStandardMaterial color={palette.body} roughness={0.42} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.44, 0.08, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.52, 0.16]} />
          <meshStandardMaterial color={palette.body} roughness={0.42} />
        </mesh>
      </group>

      <mesh castShadow position={[0, 0.62, 0.04]}>
        <sphereGeometry args={[0.28, 20, 20]} />
        <meshStandardMaterial color="#111827" roughness={0.35} metalness={0.15} />
      </mesh>

      <mesh castShadow position={[0.17, 0.66, 0.25]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color={palette.eye} emissive={palette.eye} emissiveIntensity={0.65} />
      </mesh>
      <mesh castShadow position={[-0.17, 0.66, 0.25]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color={palette.eye} emissive={palette.eye} emissiveIntensity={0.65} />
      </mesh>

      <mesh castShadow position={[0.18, 0.93, 0]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.09, 0.22, 10]} />
        <meshStandardMaterial color={palette.horn} />
      </mesh>
      <mesh castShadow position={[-0.18, 0.93, 0]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.09, 0.22, 10]} />
        <meshStandardMaterial color={palette.horn} />
      </mesh>

      {enemy.level >= 5 ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.39, 0]}>
          <ringGeometry args={[0.46, 0.56, 28]} />
          <meshBasicMaterial ref={auraMatRef} color={palette.aura} transparent opacity={0.55} />
        </mesh>
      ) : null}

      <group position={[0, 1.18, 0]}>
        <mesh>
          <planeGeometry args={[0.94, 0.11]} />
          <meshBasicMaterial color="#020617" transparent opacity={0.8} />
        </mesh>
        <mesh position={[-(0.86 * (1 - healthRatio)) / 2, 0, 0.01]}>
          <planeGeometry args={[Math.max(0.01, 0.86 * healthRatio), 0.07]} />
          <meshBasicMaterial color={palette.health} />
        </mesh>
      </group>
    </group>
  );
}
