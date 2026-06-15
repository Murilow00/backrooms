import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls, PointerLockControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { localPlayerState } from './Multiplayer';

const WALK_SPEED = 5;
const SPRINT_SPEED = 8;

export const Player = () => {
  const ref = useRef<RapierRigidBody>(null);
  const controlsRef = useRef<any>(null);
  const [, getKeys] = useKeyboardControls();
  const { camera } = useThree();
  const { setGameState } = useStore();

  const direction = new THREE.Vector3();
  const frontVector = new THREE.Vector3();
  const sideVector = new THREE.Vector3();
  const bobbingPhase = useRef(0);

  // Flashlight refs
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetObj = useRef(new THREE.Object3D());

  const handleUnlock = useCallback(() => {
    setGameState('MENU');
  }, [setGameState]);

  // Lock pointer on first click after entering the game
  useEffect(() => {
    const lockPointer = () => {
      if (controlsRef.current) {
        controlsRef.current.lock();
      }
    };
    document.addEventListener('click', lockPointer, { once: true });
    return () => document.removeEventListener('click', lockPointer);
  }, []);

  useFrame((_state, delta) => {
    if (!ref.current) return;

    const { forward, backward, left, right, sprint } = getKeys();

    const velocity = ref.current.linvel();
    const position = ref.current.translation();

    // Movement
    frontVector.set(0, 0, Number(backward) - Number(forward));
    sideVector.set(Number(left) - Number(right), 0, 0);

    direction.subVectors(frontVector, sideVector).normalize();
    direction.applyEuler(new THREE.Euler(0, camera.rotation.y, 0));

    const currentSpeed = sprint ? SPRINT_SPEED : WALK_SPEED;
    direction.multiplyScalar(currentSpeed);

    ref.current.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);

    // Head Bobbing
    const isMoving = Math.abs(direction.x) > 0.1 || Math.abs(direction.z) > 0.1;
    if (isMoving) {
      bobbingPhase.current += delta * (sprint ? 14 : 9);
    } else {
      bobbingPhase.current *= 0.9;
    }
    const bobOffset = Math.sin(bobbingPhase.current) * 0.04;

    // First Person Camera
    camera.position.set(position.x, position.y + 0.8 + bobOffset, position.z);

    // Flashlight follows camera
    if (lightRef.current) {
      lightRef.current.position.copy(camera.position);
      const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      targetObj.current.position.copy(camera.position).add(lookDir.multiplyScalar(10));
      lightRef.current.target = targetObj.current;
    }

    // Sync for multiplayer
    localPlayerState.position = [position.x, position.y - 0.8, position.z];
    localPlayerState.rotation = [0, camera.rotation.y, 0];
  });

  return (
    <>
      <PointerLockControls ref={controlsRef} onUnlock={handleUnlock} />

      {/* Flashlight */}
      <spotLight
        ref={lightRef}
        angle={0.55}
        penumbra={0.4}
        intensity={4}
        distance={25}
        castShadow
        color="#fffce6"
        shadow-mapSize={512}
      />
      <primitive object={targetObj.current} />

      <RigidBody
        ref={ref}
        colliders={false}
        mass={1}
        type="dynamic"
        position={[0, 3, 0]}
        enabledRotations={[false, false, false]}
        friction={0}
      >
        <CapsuleCollider args={[0.5, 0.5]} />
      </RigidBody>
    </>
  );
};
