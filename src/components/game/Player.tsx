import { useRef, useEffect } from 'react';
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
  const [, getKeys] = useKeyboardControls();
  const { camera, gl } = useThree();
  const { setGameState } = useStore();

  const direction = new THREE.Vector3();
  const frontVector = new THREE.Vector3();
  const sideVector = new THREE.Vector3();
  
  // Head bobbing state
  const bobbingPhase = useRef(0);
  
  // Flashlight refs
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    try {
       gl.domElement.requestPointerLock();
    } catch(e) { console.error(e) }
  }, [gl.domElement]);

  useFrame((_state, delta) => {
    if (!ref.current) return;
    
    const { forward, backward, left, right, sprint } = getKeys();
    
    const velocity = ref.current.linvel();
    const position = ref.current.translation();
    
    // Movement logic (First Person)
    frontVector.set(0, 0, Number(backward) - Number(forward));
    sideVector.set(Number(left) - Number(right), 0, 0);
    
    direction.subVectors(frontVector, sideVector).normalize();
    direction.applyEuler(new THREE.Euler(0, camera.rotation.y, 0)); 
    
    const currentSpeed = sprint ? SPRINT_SPEED : WALK_SPEED;
    direction.multiplyScalar(currentSpeed);

    ref.current.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);

    // Head Bobbing logic
    const isMoving = direction.length() > 0.1;
    if (isMoving) {
      bobbingPhase.current += delta * (sprint ? 15 : 10);
    } else {
      // Return to neutral smoothly
      bobbingPhase.current = THREE.MathUtils.lerp(bobbingPhase.current, 0, 0.1);
    }
    const bobOffset = Math.sin(bobbingPhase.current) * 0.05;

    // First Person Camera (Attach to head)
    camera.position.set(position.x, position.y + 0.8 + bobOffset, position.z);

    // Update flashlight to point where camera is looking
    if (lightRef.current && targetRef.current) {
      lightRef.current.position.copy(camera.position);
      
      // Calculate a point 10 units in front of the camera
      const lookAtVector = new THREE.Vector3(0, 0, -10);
      lookAtVector.applyQuaternion(camera.quaternion);
      targetRef.current.position.copy(camera.position).add(lookAtVector);
    }

    // Sync state for Multiplayer (Others will see our position)
    localPlayerState.position = [position.x, position.y - 0.8, position.z];
    localPlayerState.rotation = [0, camera.rotation.y, 0];
  });

  return (
    <>
      <PointerLockControls selector="#root" onUnlock={() => setGameState('MENU')} />
      
      {/* Flashlight attached to camera */}
      <spotLight 
        ref={lightRef}
        angle={0.6} 
        penumbra={0.5} 
        intensity={3} 
        distance={30} 
        castShadow 
        color="#fffce6"
        target={targetRef.current || undefined}
      />
      <primitive object={new THREE.Object3D()} ref={targetRef} />

      <RigidBody 
        ref={ref} 
        colliders={false} 
        mass={1} 
        type="dynamic" 
        position={[0, 2, 0]} 
        enabledRotations={[false, false, false]}
        friction={0} 
      >
        <CapsuleCollider args={[0.5, 0.9]} />
        {/* Local player is invisible to themselves in First Person */}
      </RigidBody>
    </>
  );
};
