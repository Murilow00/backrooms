import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { KeyboardControls, Text } from '@react-three/drei';
import { EffectComposer, Noise, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Player } from './Player';
import { Multiplayer } from './Multiplayer';
import { useStore } from '../../store/useStore';

const MAZE_SIZE = 80; // 80x80 grid — increased for exploration
const TILE_SIZE = 6;
const WALL_HEIGHT = 4;
const WALL_THICKNESS = 0.3;
const SAFE_ROOM_TILES = 5; // safe room radius in tiles (center)

// === Instanced Mesh Walls (extremely lightweight) ===
const BackroomsLevel = () => {
    const wallData = useMemo(() => {
        const rng = (seed: number) => {
            let s = seed;
            return () => {
                s = (s * 9301 + 49297) % 233280;
                return s / 233280;
            };
        };
        const rand = rng(42); // deterministic seed — same layout every time

        const data: { pos: [number, number, number]; rot: number }[] = [];
        for (let x = -MAZE_SIZE / 2; x < MAZE_SIZE / 2; x++) {
            for (let z = -MAZE_SIZE / 2; z < MAZE_SIZE / 2; z++) {
                if (Math.abs(x) < SAFE_ROOM_TILES && Math.abs(z) < SAFE_ROOM_TILES) continue; // clear spawn (safe room)

                const r = rand();
                if (r > 0.72) {
                    data.push({ pos: [x * TILE_SIZE, WALL_HEIGHT / 2, z * TILE_SIZE], rot: 0 });
                } else if (r > 0.57) {
                    data.push({
                        pos: [x * TILE_SIZE, WALL_HEIGHT / 2, z * TILE_SIZE],
                        rot: Math.PI / 2,
                    });
                }
            }
        }
        return data;
    }, []);

    const wallMesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const wallMat = useMemo(
        () => new THREE.MeshStandardMaterial({ color: '#c2b280', roughness: 1 }),
        [],
    );

    useMemo(() => {
        if (!wallMesh.current) return;
        wallData.forEach((w, i) => {
            dummy.position.set(...w.pos);
            dummy.rotation.set(0, w.rot, 0);
            dummy.scale.set(TILE_SIZE, WALL_HEIGHT, WALL_THICKNESS);
            dummy.updateMatrix();
            wallMesh.current!.setMatrixAt(i, dummy.matrix);
        });
        wallMesh.current.instanceMatrix.needsUpdate = true;
    }, [wallData, dummy]);

    return (
        <>
            {/* Instanced walls — single draw call */}
            <instancedMesh
                ref={wallMesh}
                args={[undefined, undefined, wallData.length]}
                receiveShadow
                castShadow>
                <boxGeometry />
                <primitive object={wallMat} attach="material" />
            </instancedMesh>

            {/* All colliders in ONE compound RigidBody */}
            <RigidBody type="fixed" colliders={false}>
                {wallData.map((w, i) => {
                    const isV = w.rot !== 0;
                    return (
                        <CuboidCollider
                            key={i}
                            args={
                                isV
                                    ? [WALL_THICKNESS / 2, WALL_HEIGHT / 2, TILE_SIZE / 2]
                                    : [TILE_SIZE / 2, WALL_HEIGHT / 2, WALL_THICKNESS / 2]
                            }
                            position={w.pos}
                        />
                    );
                })}
            </RigidBody>

            {/* Ceiling */}
            <mesh position={[0, WALL_HEIGHT, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[MAZE_SIZE * TILE_SIZE + 20, MAZE_SIZE * TILE_SIZE + 20]} />
                <meshStandardMaterial color="#d4cba0" roughness={0.95} side={THREE.DoubleSide} />
            </mesh>

            {/* Floor */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh position={[0, -0.25, 0]} receiveShadow>
                    <boxGeometry
                        args={[MAZE_SIZE * TILE_SIZE + 20, 0.5, MAZE_SIZE * TILE_SIZE + 20]}
                    />
                    <meshStandardMaterial color="#4a4228" roughness={0.98} />
                </mesh>
            </RigidBody>

            {/* Dim scattered lights — NO castShadow for perf */}
            {Array.from({ length: 18 }).map((_, i) => {
                const lx = (((i * 47) % MAZE_SIZE) - MAZE_SIZE / 2) * TILE_SIZE * 0.9;
                const lz = (((i * 31) % MAZE_SIZE) - MAZE_SIZE / 2) * TILE_SIZE * 0.9;
                return (
                    <pointLight
                        key={i}
                        position={[lx, WALL_HEIGHT - 0.4, lz]}
                        intensity={0.5}
                        distance={20}
                        color="#fff0aa"
                    />
                );
            })}

            {/* Haunting messages scrawled on walls */}
            <HauntingMessages wallData={wallData} />
        </>
    );
};

// === Safe Room at spawn ===
const SafeRoom = () => {
    const size = SAFE_ROOM_TILES * TILE_SIZE;
    const wallMat = useMemo(
        () => new THREE.MeshStandardMaterial({ color: '#e9e1c6', roughness: 0.9 }),
        [],
    );

    return (
        <group>
            {/* floor */}
            <mesh position={[0, -0.25, 0]}>
                <boxGeometry args={[size + 6, 0.5, size + 6]} />
                <meshStandardMaterial color="#f2eedb" roughness={0.95} />
            </mesh>

            {/* four walls */}
            <mesh position={[0, WALL_HEIGHT / 2, -(size / 2) - 0.15]}>
                {' '}
                {/* back wall */}
                <boxGeometry args={[size + 6, WALL_HEIGHT, 0.5]} />
                <primitive object={wallMat} attach="material" />
            </mesh>
            <mesh position={[-(size / 2) - 0.15, WALL_HEIGHT / 2, 0]}>
                {' '}
                {/* left */}
                <boxGeometry args={[0.5, WALL_HEIGHT, size]} />
                <primitive object={wallMat} attach="material" />
            </mesh>
            <mesh position={[size / 2 + 0.15, WALL_HEIGHT / 2, 0]}>
                {' '}
                {/* right */}
                <boxGeometry args={[0.5, WALL_HEIGHT, size]} />
                <primitive object={wallMat} attach="material" />
            </mesh>
            {/* front wall split to simulate a doorway */}
            <mesh position={[-(size * 0.33), WALL_HEIGHT / 2, size / 2 + 0.15]}>
                <boxGeometry args={[size * 0.66, WALL_HEIGHT, 0.5]} />
                <primitive object={wallMat} attach="material" />
            </mesh>

            {/* soft interior light */}
            <pointLight
                position={[0, WALL_HEIGHT - 0.5, 0]}
                intensity={1.2}
                distance={12}
                color="#fff7dd"
            />
        </group>
    );
};

// === Psychological Messages written on walls ===
const MESSAGES = [
    'TURN BACK',
    'ITS BEHIND YOU',
    'YOU WILL NOT ESCAPE',
    'HELP ME',
    'DONT LOOK',
    'ITS WATCHING',
    'LEVEL 0',
    'NO EXIT',
    '???',
    'RUN',
    'YOU ARE NOT ALONE',
];

const HauntingMessages = ({
    wallData,
}: {
    wallData: { pos: [number, number, number]; rot: number }[];
}) => {
    const positions = useMemo(() => {
        // Place messages on a random subset of walls
        return wallData
            .filter((_, i) => i % 17 === 0)
            .slice(0, 12)
            .map((w, i) => ({
                pos: [w.pos[0], w.pos[1] + 0.3, w.pos[2]] as [number, number, number],
                rot: w.rot,
                text: MESSAGES[i % MESSAGES.length],
            }));
    }, [wallData]);

    return (
        <>
            {positions.map((m, i) => (
                <Text
                    key={i}
                    position={m.pos}
                    rotation={[0, m.rot + Math.PI / 2, 0]}
                    fontSize={0.4}
                    color="#8b0000"
                    anchorX="center"
                    anchorY="middle"
                    font="https://fonts.gstatic.com/s/vt323/v17/pxiKyp0ihIEF2isfFJU.woff2"
                    renderOrder={1}>
                    {m.text}
                </Text>
            ))}
        </>
    );
};

// === The Entity (Psychological, unpredictable AI) ===
const Entity = ({ onJumpScare }: { onJumpScare?: () => void }) => {
    const meshRef = useRef<THREE.Group>(null);
    const { camera } = useThree();
    const phaseRef = useRef<'hunt' | 'stalk' | 'vanish'>('stalk');
    const timerRef = useRef(0);
    const speedRef = useRef(2.5);
    const jumpedRef = useRef(false);

    useFrame((_s, delta) => {
        if (!meshRef.current) return;

        timerRef.current += delta;

        // Phase switching — creates unpredictable behaviour
        if (timerRef.current > 12 && phaseRef.current === 'stalk') {
            phaseRef.current = 'hunt';
            timerRef.current = 0;
        } else if (timerRef.current > 6 && phaseRef.current === 'hunt') {
            phaseRef.current = 'vanish';
            timerRef.current = 0;
            // Teleport behind player but far enough to not be seen immediately
            const behind = new THREE.Vector3(0, 0, 30).applyQuaternion(camera.quaternion);
            meshRef.current.position.set(
                camera.position.x + behind.x,
                0,
                camera.position.z + behind.z,
            );
        } else if (timerRef.current > 3 && phaseRef.current === 'vanish') {
            phaseRef.current = 'stalk';
            timerRef.current = 0;
        }

        const target = new THREE.Vector3(camera.position.x, 0, camera.position.z);
        const pos = meshRef.current.position.clone();
        const dir = target.clone().sub(pos);
        dir.y = 0;
        const dist = dir.length();

        if (phaseRef.current === 'hunt') {
            speedRef.current = Math.min(speedRef.current + delta * 0.3, 7);
            dir.normalize();
            meshRef.current.position.add(dir.multiplyScalar(speedRef.current * delta));
        } else if (phaseRef.current === 'stalk') {
            // Slowly drifts 15–25 units behind the player
            if (dist > 22) {
                dir.normalize();
                meshRef.current.position.add(dir.multiplyScalar(2 * delta));
            } else if (dist < 14) {
                dir.normalize();
                meshRef.current.position.sub(dir.multiplyScalar(1.5 * delta));
            }
            speedRef.current = 2.5;
        }

        meshRef.current.lookAt(new THREE.Vector3(target.x, meshRef.current.position.y, target.z));

        // Caught player -> trigger jump scare then teleport away
        if (dist < 1.8) {
            if (!jumpedRef.current) {
                jumpedRef.current = true;
                onJumpScare?.();
            }
            meshRef.current.position.set(
                (Math.random() - 0.5) * 120,
                0,
                (Math.random() - 0.5) * 120,
            );
            phaseRef.current = 'stalk';
            timerRef.current = 0;
            speedRef.current = 2.5;
            // reset jumped state slowly
            setTimeout(() => {
                jumpedRef.current = false;
            }, 3000);
        }
    });

    return (
        <group ref={meshRef} position={[50, 0, 50]}>
            <mesh position={[0, 2.2, 0]}>
                <capsuleGeometry args={[0.35, 3.5, 4, 8]} />
                <meshStandardMaterial color="#060606" roughness={1} />
            </mesh>
            <mesh position={[0, 4.1, 0]}>
                <sphereGeometry args={[0.42, 8, 8]} />
                <meshStandardMaterial color="#060606" roughness={1} />
            </mesh>
            {/* Glowing red eyes */}
            <mesh position={[0.14, 4.15, 0.33]}>
                <sphereGeometry args={[0.07, 6, 6]} />
                <meshBasicMaterial color="#ff0000" />
            </mesh>
            <mesh position={[-0.14, 4.15, 0.33]}>
                <sphereGeometry args={[0.07, 6, 6]} />
                <meshBasicMaterial color="#ff0000" />
            </mesh>
        </group>
    );
};

// === Flickering lights + proximity horror effects ===
const PsychologicalEffects = ({
    setChromaOffset,
    setNoiseOpacity,
}: {
    setChromaOffset: (v: THREE.Vector2) => void;
    setNoiseOpacity: (n: number) => void;
}) => {
    const { scene } = useThree();
    const flickerRef = useRef(0);
    const pulseTime = useRef(0);

    useFrame((_s, delta) => {
        flickerRef.current += delta;

        // subtle base fog jitter
        const flicker = Math.sin(flickerRef.current * 2.3) * Math.sin(flickerRef.current * 7.1);
        scene.fog = new THREE.FogExp2('#050403', 0.04 + flicker * 0.01);

        // Random pulse events that increase noise and chromatic aberration briefly
        if (pulseTime.current > 0) {
            pulseTime.current -= delta;
            // during pulse, ramp up
            const t = Math.max(0, pulseTime.current);
            setNoiseOpacity(0.6 * (t / 1.5));
            setChromaOffset(new THREE.Vector2(0.008 * (t / 1.5), 0.008 * (t / 1.5)));
        } else if (Math.random() < 0.008 * delta * 60) {
            // start a pulse lasting ~1.5s
            pulseTime.current = 1.5;
        } else {
            // decay to normal
            setNoiseOpacity(0.22 + Math.abs(flicker) * 0.03);
            setChromaOffset(
                new THREE.Vector2(
                    0.002 + Math.abs(flicker) * 0.001,
                    0.002 + Math.abs(flicker) * 0.001,
                ),
            );
        }
    });

    return null;
};

// === Main World ===
export const World = () => {
    const { gameState } = useStore();
    const [chromaOffset, setChromaOffset] = useState(new THREE.Vector2(0.002, 0.002));
    const [noiseOpacity, setNoiseOpacity] = useState(0.25);
    const [jumpScare, setJumpScare] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const triggerJumpScare = () => {
        if (jumpScare) return;
        setJumpScare(true);
        // ensure audio context
        try {
            if (!audioCtxRef.current)
                audioCtxRef.current = new (
                    window.AudioContext || (window as any).webkitAudioContext
                )();
            const ctx = audioCtxRef.current!;
            const bufferSize = ctx.sampleRate * 0.6;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++)
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            const gain = ctx.createGain();
            gain.gain.value = 0.0001;
            src.connect(gain).connect(ctx.destination);
            src.start();
            gain.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            setChromaOffset(new THREE.Vector2(0.01, 0.01));
            setNoiseOpacity(0.95);
            setTimeout(() => {
                setJumpScare(false);
                setNoiseOpacity(0.22);
                setChromaOffset(new THREE.Vector2(0.002, 0.002));
                try {
                    src.stop();
                } catch (e) {}
            }, 1200);
        } catch (e) {
            setTimeout(() => setJumpScare(false), 1000);
        }
    };

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
                    backgroundColor: '#050403',
                }}
                shadows={false} // global shadows off for perf — only flashlight uses it
                camera={{ fov: 80, near: 0.15, far: 120 }}
                dpr={[1, 1.2]} // cap pixel ratio for perf
                gl={{ antialias: false, powerPreference: 'high-performance' }}>
                <fog attach="fog" args={['#050403', 6, 50]} />
                <ambientLight intensity={0.12} />

                <PsychologicalEffects
                    setChromaOffset={setChromaOffset}
                    setNoiseOpacity={setNoiseOpacity}
                />

                <Physics gravity={[0, -20, 0]} timeStep="vary">
                    <SafeRoom />
                    <BackroomsLevel />
                    <Entity onJumpScare={triggerJumpScare} />
                    {gameState === 'PLAYING' && <Player />}
                    <Multiplayer />
                </Physics>

                <EffectComposer enableNormalPass={false} multisampling={0}>
                    <Noise opacity={noiseOpacity} />
                    <ChromaticAberration offset={chromaOffset} />
                    <Vignette eskil={false} offset={0.25} darkness={0.95} />
                </EffectComposer>
            </Canvas>

            {/* Jump-scare visual flash */}
            {jumpScare && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(255,30,30,0.95)',
                        zIndex: 99999,
                        pointerEvents: 'none',
                        mixBlendMode: 'screen',
                    }}
                />
            )}

            {/* VHS HUD */}
            {gameState === 'PLAYING' && (
                <div className="vhs-overlay">
                    <div
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '2rem',
                            fontFamily: 'VT323',
                            color: '#cc0000',
                            fontSize: '2rem',
                            animation: 'blink 1.5s step-start infinite',
                        }}>
                        ● REC
                    </div>
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '1rem',
                            left: '2rem',
                            fontFamily: 'VT323',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '1.4rem',
                        }}>
                        CAM-01 &nbsp;|&nbsp; LEVEL 0
                    </div>
                    <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
                </div>
            )}
        </KeyboardControls>
    );
};
