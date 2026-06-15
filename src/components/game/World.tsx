import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody } from '@react-three/rapier';
import { KeyboardControls } from '@react-three/drei';
import {
    EffectComposer,
    Noise,
    ChromaticAberration,
    Scanline,
    Vignette,
} from '@react-three/postprocessing';
import * as THREE from 'three';
import { Player } from './Player';
import { Multiplayer } from './Multiplayer';
import { useStore } from '../../store/useStore';

// Procedural Backrooms Maze Generator
const MAZE_SIZE = 30; // 30x30 grid
const TILE_SIZE = 5; // Each tile is 5x5 meters
const WALL_HEIGHT = 4;

const BackroomsLevel = () => {
    const walls = useMemo(() => {
        const instances = [];
        for (let x = -MAZE_SIZE / 2; x < MAZE_SIZE / 2; x++) {
            for (let z = -MAZE_SIZE / 2; z < MAZE_SIZE / 2; z++) {
                // Keep a small clearing at the center spawn (0,0)
                if (Math.abs(x) < 2 && Math.abs(z) < 2) continue;

                // Randomly place walls to create a chaotic, liminal space
                if (Math.random() > 0.7) {
                    // Horizontal wall
                    instances.push({
                        position: [x * TILE_SIZE, WALL_HEIGHT / 2, z * TILE_SIZE],
                        rotation: [0, 0, 0],
                        scale: [TILE_SIZE, WALL_HEIGHT, 0.5],
                    });
                } else if (Math.random() > 0.7) {
                    // Vertical wall
                    instances.push({
                        position: [x * TILE_SIZE, WALL_HEIGHT / 2, z * TILE_SIZE],
                        rotation: [0, Math.PI / 2, 0],
                        scale: [TILE_SIZE, WALL_HEIGHT, 0.5],
                    });
                }
            }
        }
        return instances;
    }, []);

    return (
        <>
            <group>
                {walls.map((wall, index) => (
                    <RigidBody key={index} type="fixed" colliders="cuboid">
                        <mesh
                            position={wall.position}
                            rotation={wall.rotation}
                            scale={wall.scale}
                            castShadow
                            receiveShadow>
                            <boxGeometry />
                            <meshStandardMaterial color="#c2b280" roughness={1} />{' '}
                            {/* Yellow Wallpaper color */}
                        </mesh>
                    </RigidBody>
                ))}
            </group>

            {/* Ceiling */}
            <mesh position={[0, WALL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[MAZE_SIZE * TILE_SIZE, MAZE_SIZE * TILE_SIZE]} />
                <meshStandardMaterial color="#eeeeee" roughness={0.9} />
            </mesh>

            {/* Floor (Moist Carpet) */}
            <RigidBody type="fixed" colliders="cuboid" friction={1}>
                <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[MAZE_SIZE * TILE_SIZE, MAZE_SIZE * TILE_SIZE]} />
                    <meshStandardMaterial color="#5c5436" roughness={0.9} />
                </mesh>
            </RigidBody>

            {/* Buzzing Fluorescent Lights (Randomly scattered) */}
            {Array.from({ length: 40 }).map((_, i) => (
                <pointLight
                    key={i}
                    position={[
                        (Math.random() - 0.5) * MAZE_SIZE * TILE_SIZE,
                        WALL_HEIGHT - 0.5,
                        (Math.random() - 0.5) * MAZE_SIZE * TILE_SIZE,
                    ]}
                    intensity={0.5}
                    distance={15}
                    color="#fff5cc"
                    castShadow
                />
            ))}
        </>
    );
};

// The Entity (Monster AI)
const Entity = () => {
    const meshRef = useRef<THREE.Group>(null);
    const { camera } = useThree();

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        // Very simple chase AI: move towards the local player (camera) constantly
        const target = new THREE.Vector3(camera.position.x, 0, camera.position.z);
        const pos = meshRef.current.position;

        const direction = target.clone().sub(pos).normalize();
        const speed = 4 * delta; // Slightly faster than walking speed

        // Move
        meshRef.current.position.add(direction.multiplyScalar(speed));

        // Look at player
        meshRef.current.lookAt(target);

        // Jumpscare logic (if very close)
        const distance = pos.distanceTo(target);
        if (distance < 1.5) {
            // Caught
            // For now just teleport the monster away
            meshRef.current.position.set(
                (Math.random() - 0.5) * 100,
                0,
                (Math.random() - 0.5) * 100,
            );
        }
    });

    return (
        <group ref={meshRef} position={[20, 0, 20]}>
            {/* A tall distorted black figure */}
            <mesh position={[0, 2, 0]}>
                <capsuleGeometry args={[0.4, 3, 4, 8]} />
                <meshStandardMaterial color="#000000" roughness={1} />
            </mesh>
            <mesh position={[0, 3.5, 0]}>
                <sphereGeometry args={[0.5, 8, 8]} />
                <meshStandardMaterial color="#000000" roughness={1} />
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
            ]}>
            <Canvas
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 0,
                    backgroundColor: '#000',
                }}
                shadows
                camera={{ fov: 80 }}>
                <ambientLight intensity={0.05} />

                <Physics gravity={[0, -20, 0]}>
                    <BackroomsLevel />
                    <Entity />

                    {/* Players */}
                    {gameState === 'PLAYING' && <Player />}
                    <Multiplayer />
                </Physics>

                {/* Found Footage Post Processing */}
                <EffectComposer disableNormalPass>
                    <Noise opacity={0.3} />
                    <Scanline density={1.5} opacity={0.5} />
                    <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
                    <Vignette eskil={false} offset={0.3} darkness={0.8} />
                </EffectComposer>
            </Canvas>

            {/* HUD Overlay */}
            {gameState === 'PLAYING' && (
                <div className="vhs-overlay">
                    <div
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '2rem',
                            fontFamily: 'VT323',
                            color: 'white',
                            fontSize: '2rem',
                            opacity: 0.8,
                        }}>
                        REC •
                    </div>
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '1rem',
                            left: '2rem',
                            fontFamily: 'VT323',
                            color: 'white',
                            fontSize: '1.5rem',
                            opacity: 0.8,
                        }}>
                        SP 0:00:00
                    </div>
                </div>
            )}
        </KeyboardControls>
    );
};
