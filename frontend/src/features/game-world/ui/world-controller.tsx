import { type MutableRefObject, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";
import { Vector3 } from "three";
import type { Keybinds } from "@/store/game-settings";
import { lerpAngle, normalizeKey } from "@/features/game-world/model/combat-utils";

type WorldControllerProps = {
  heroRef: MutableRefObject<THREE.Object3D | null>;
  movingRef: MutableRefObject<boolean>;
  keybinds: Keybinds;
  interactive: boolean;
  respawnToken: number;
  mouseSensitivity: number;
  attackTimerRef: MutableRefObject<number>;
  attackTypeRef: MutableRefObject<"light" | "heavy" | null>;
  cameraShakeRef: MutableRefObject<number>;
};

export function WorldController({
  heroRef,
  movingRef,
  keybinds,
  interactive,
  respawnToken,
  mouseSensitivity,
  attackTimerRef,
  attackTypeRef,
  cameraShakeRef,
}: WorldControllerProps) {
  const { camera } = useThree();
  const pressedKeysRef = useRef(new Set<string>());
  const velocityYRef = useRef(0);
  const horizontalVelocityRef = useRef(new Vector3());
  const zeroVelocityRef = useRef(new Vector3());
  const desiredVelocityRef = useRef(new Vector3());
  const rightVecRef = useRef(new Vector3());
  const forwardVecRef = useRef(new Vector3());
  const playerPosRef = useRef(new Vector3(0, 0, 5));
  const yawTargetRef = useRef(0);
  const pitchTargetRef = useRef(0);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const cameraTargetRef = useRef(new Vector3());

  useEffect(() => {
    if (!interactive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      pressedKeysRef.current.add(normalizeKey(event.key));
    };

    const onKeyUp = (event: KeyboardEvent) => {
      pressedKeysRef.current.delete(normalizeKey(event.key));
    };

    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement == null) return;
      const normalized = Math.min(100, Math.max(1, mouseSensitivity)) / 100;
      const sens = 0.00012 + normalized * normalized * 0.00048;
      yawTargetRef.current -= event.movementX * sens;
      pitchTargetRef.current -= event.movementY * sens;
      pitchTargetRef.current = Math.max(-1.25, Math.min(1.25, pitchTargetRef.current));
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      pressedKeysRef.current.clear();
    };
  }, [interactive, mouseSensitivity]);

  useEffect(() => {
    pressedKeysRef.current.clear();
    velocityYRef.current = 0;
    horizontalVelocityRef.current.set(0, 0, 0);
    desiredVelocityRef.current.set(0, 0, 0);
    playerPosRef.current.set(0, 0, 5);
    yawTargetRef.current = 0;
    pitchTargetRef.current = 0;
    yawRef.current = 0;
    pitchRef.current = 0;
    attackTimerRef.current = 0;
    attackTypeRef.current = null;
    cameraShakeRef.current = 0;
  }, [attackTimerRef, attackTypeRef, cameraShakeRef, respawnToken]);

  useFrame((_, delta) => {
    const hero = heroRef.current;
    if (!hero) return;

    const moveSpeed = 3.9;
    const acceleration = 11;
    const deceleration = 14;
    const jumpForce = 5.2;
    const gravity = 13;
    const maxZone = 10.5;

    if (interactive) {
      const forwardKey = (keybinds.forward || "W").toUpperCase();
      const backKey = (keybinds.back || "S").toUpperCase();
      const leftKey = (keybinds.left || "A").toUpperCase();
      const rightKey = (keybinds.right || "D").toUpperCase();
      const jumpKey = (keybinds.jump || "SPACE").toUpperCase();

      const forward = pressedKeysRef.current.has(forwardKey);
      const back = pressedKeysRef.current.has(backKey);
      const left = pressedKeysRef.current.has(leftKey);
      const right = pressedKeysRef.current.has(rightKey);
      const jump = pressedKeysRef.current.has(jumpKey);

      const directionX = (right ? 1 : 0) - (left ? 1 : 0);
      const directionZ = (forward ? 1 : 0) - (back ? 1 : 0);
      const moving = directionX !== 0 || directionZ !== 0;
      movingRef.current = moving;

      const rightVec = rightVecRef.current.set(Math.cos(yawRef.current), 0, Math.sin(yawRef.current));
      const forwardVec = forwardVecRef.current.set(Math.sin(yawRef.current), 0, -Math.cos(yawRef.current));

      const desiredVelocity = desiredVelocityRef.current.set(0, 0, 0);
      if (moving) {
        const length = Math.hypot(directionX, directionZ) || 1;
        const nx = directionX / length;
        const nz = directionZ / length;

        desiredVelocity
          .addScaledVector(rightVec, nx)
          .addScaledVector(forwardVec, nz)
          .normalize()
          .multiplyScalar(moveSpeed);
      }

      horizontalVelocityRef.current.lerp(
        desiredVelocity,
        Math.min(1, delta * (moving ? acceleration : deceleration)),
      );
      playerPosRef.current.addScaledVector(horizontalVelocityRef.current, delta);

      if (jump && Math.abs(playerPosRef.current.y) < 0.001) {
        velocityYRef.current = jumpForce;
      }

      velocityYRef.current -= gravity * delta;
      playerPosRef.current.y += velocityYRef.current * delta;
      if (playerPosRef.current.y < 0) {
        playerPosRef.current.y = 0;
        velocityYRef.current = 0;
      }

      playerPosRef.current.x = Math.min(maxZone, Math.max(-maxZone, playerPosRef.current.x));
      playerPosRef.current.z = Math.min(maxZone, Math.max(-maxZone, playerPosRef.current.z));
    } else {
      movingRef.current = false;
      horizontalVelocityRef.current.lerp(zeroVelocityRef.current, Math.min(1, delta * 10));
      playerPosRef.current.addScaledVector(horizontalVelocityRef.current, delta);
    }

    const lookSmoothing = 1 - Math.exp(-18 * delta);
    yawRef.current += (yawTargetRef.current - yawRef.current) * lookSmoothing;
    pitchRef.current += (pitchTargetRef.current - pitchRef.current) * lookSmoothing;

    hero.position.copy(playerPosRef.current);

    cameraTargetRef.current.set(
      playerPosRef.current.x,
      playerPosRef.current.y + 1.65 + Math.sin(Date.now() * 0.007) * (movingRef.current ? 0.015 : 0),
      playerPosRef.current.z,
    );

    const cameraFollow = 1 - Math.exp(-22 * delta);
    camera.position.lerp(cameraTargetRef.current, cameraFollow);
    camera.rotation.order = "YXZ";
    camera.rotation.y = yawRef.current;
    camera.rotation.x = pitchRef.current;
    hero.rotation.y = lerpAngle(hero.rotation.y, yawRef.current, 1 - Math.exp(-14 * delta));

    if (attackTimerRef.current > 0) {
      attackTimerRef.current = Math.max(0, attackTimerRef.current - delta);
      cameraShakeRef.current = Math.max(0, cameraShakeRef.current - delta * 4.5);
      if (attackTimerRef.current === 0) {
        attackTypeRef.current = null;
      }
    }
  });

  return null;
}
