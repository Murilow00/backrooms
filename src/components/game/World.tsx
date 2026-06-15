import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { KeyboardControls } from '@react-three/drei';
import { EffectComposer, Noise, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Player } from './Player';
import { Multiplayer } from './Multiplayer';
import { useStore } from '../../store/useStore';

// Lightweight Backrooms - uses simple meshes with a single compound collider
const MAZE_SIZE = 20;
const TILE_SIZE = 6;
const WALL_HEIGHT = 4;
const WALL_THICKNESS = 0.3;

const BackroomsLevel = () => {
  // Generate wall data once
  const wallData = useMemo(() => {
    const data: { pos: [number, number, number]; rot: number; }[] = [];
    for (let x = -MAZE_SIZE / 2; x < MAZE_SIZE / 2; x++) {
      for (let z = -MAZE_SIZE / 2; z < MAZE_SIZE / 2; z++) {
        // Keep spawn area clear
        if (Math.abs(x) < 3 && Math.abs(z) < 3) continue;

        const r = Math.random();
        if (r > 0.75) {
          data.push({ pos: [x * TILE_SIZE, WALL_HEIGHT / 2, z * TILE_SIZE], rot: 0 });
        } else if (r > 0.6) {
          data.push({ pos: [x * TILE_SIZE, WALL_HEIGHT / 2, z * TILE_SIZE], rot: Math.PI / 2 });
        }
      }
    }
    return data;
  }, []);

  return (
    <>
      {/* All walls as simple meshes (no individual physics!) */}
      {wallData.map((wall, i) => (
        <mesh
          key={i}
          position={wall.pos}
          rotation={[0, wall.rot, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[TILE_SIZE, WALL_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color="#c2b280" roughness={1} />
        </mesh>
      ))}

      {/* Single compound RigidBody for ALL wall collisions */}
      <RigidBody type="fixed" colliders={false}>
        {wallData.map((wall, i) => {
          // Rotate the collider half-extents based on wall rotation
          const isVertical = wall.rot !== 0;
          return (
            <CuboidCollider
              key={i}
              args={isVertical ? [WALL_THICKNESS / 2, WALL_HEIGHT / 2, TILE_SIZE / 2] : [TILE_SIZE / 2, WALL_HEIGHT / 2, WALL_THICKNESS / 2]}
              position={wall.pos}
            />
          );
        })}
      </RigidBody>

      {/* Ceiling */}
      <mesh position={[0, WALL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[MAZE_SIZE * TILE_SIZE, MAZE_SIZE * TILE_SIZE]} />
        <meshStandardMaterial color="#d9d2b0" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* Floor */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.25, 0]} receiveShadow>
          <boxGeometry args={[MAZE_SIZE * TILE_SIZE, 0.5, MAZE_SIZE * TILE_SIZE]} />
          <meshStandardMaterial color="#5c5436" roughness={0.95} />
        </mesh>
      </RigidBody>

      {/* Fluorescent Lights (NO shadows - much cheaper) */}
      {Array.from({ length: 20 }).map((_, i) => (
        <pointLight
          key={i}
          position={[
            (Math.random() - 0.5) * MAZE_SIZE * TILE_SIZE * 0.8,
            WALL_HEIGHT - 0.3,
            (Math.random() - 0.5) * MAZE_SIZE * TILE_SIZE * 0.8,
          ]}
          intensity={0.6}
          distance={18}
          color="#fff5cc"
        />
      ))}
    </>
  );
};

// The Entity (Monster AI)
const Entity = () => {
  const meshRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((_state, delta) => {
    if (!meshRef.current) return;

    const target = new THREE.Vector3(camera.position.x, 0, camera.position.z);
    const pos = meshRef.current.position;

    const dir = target.clone().sub(pos);
    dir.y = 0;
    const dist = dir.length();
    dir.normalize();

    const speed = 3 * delta;
    meshRef.current.position.add(dir.multiplyScalar(speed));
    meshRef.current.lookAt(new THREE.Vector3(target.x, meshRef.current.position.y, target.z));

    // Respawn if caught player
    if (dist < 2) {
      meshRef.current.position.set(
        (Math.random() - 0.5) * 80,
        0,
        (Math.random() - 0.5) * 80,
      );
    }
  });

  return (
    <group ref={meshRef} position={[40, 0, 40]}>
      <mesh position={[0, 2, 0]}>
        <capsuleGeometry args={[0.4, 3, 4, 8]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} />
      </mesh>
      <mesh position={[0, 3.8, 0]}>
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} />
      </mesh>
      {/* Glowing eyes */}
      <mesh position={[0.15, 3.85, 0.35]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[-0.15, 3.85, 0.35]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
    </group>
  );
};

// Main World Component
export const World = () => {
  const { gameState } = useStore();

  return (
    <KeyboardControls
      map={[
        { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
        { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
        { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
        { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
        { name: 'sprint', keys: ['Shift'] },
      ]}
    >
      <Canvas
        style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, backgroundColor: '#0a0a05' }}
        shadows
        camera={{ fov: 80, near: 0.1, far: 200 }}
      >
        <ambientLight intensity={0.08} />

        <Physics gravity={[0, -20, 0]}>
          <BackroomsLevel />
          <Entity />
          {gameState === 'PLAYING' && <Player />}
          <Multiplayer />
        </Physics>

        <EffectComposer enableNormalPass={false}>
          <Noise opacity={0.25} />
          <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
          <Vignette eskil={false} offset={0.3} darkness={0.85} />
        </EffectComposer>
      </Canvas>

      {/* HUD Overlay */}
      {gameState === 'PLAYING' && (
        <div className="vhs-overlay">
          <div style={{ position: 'absolute', top: '1rem', right: '2rem', fontFamily: 'VT323', color: '#ff3333', fontSize: '2rem', opacity: 0.9 }}>
            ● REC
          </div>
          <div style={{ position: 'absolute', bottom: '1rem', left: '2rem', fontFamily: 'VT323', color: 'white', fontSize: '1.5rem', opacity: 0.6 }}>
            CAM 01 &nbsp; SP 0:00:00
          </div>
        </div>
      )}
    </KeyboardControls>
  );
};
