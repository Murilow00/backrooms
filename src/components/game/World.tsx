import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

const Tape = ({
    position,
    id,
    playerPos,
    onCollect,
}: {
    position: [number, number, number];
    id: number;
    playerPos: THREE.Vector3;
    onCollect: (id: number) => void;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const collected = useStore((state) => state.collectedTapes.includes(id));

    useFrame(() => {
        if (!meshRef.current || collected) return;

        // Rotação animada
        meshRef.current.rotation.y += 0.02;
        meshRef.current.rotation.x += 0.01;

        // Flutuação mais pronunciada
        meshRef.current.position.y = position[1] + Math.sin(Date.now() * 0.001) * 0.5;

        // Verificar coleta
        const dist = meshRef.current.position.distanceTo(playerPos);
        if (dist < 2) {
            onCollect(id);
        }
    });

    if (collected) return null;

    return (
        <mesh ref={meshRef} position={position} castShadow>
            <boxGeometry args={[0.5, 1.8, 2.4]} />
            <meshStandardMaterial
                color="#ff4500"
                emissive="#ff6b35"
                emissiveIntensity={0.8}
                roughness={0.2}
                metalness={0.8}
            />
            <pointLight position={[0, 0, 0]} intensity={2} color="#ff6b35" distance={15} />
        </mesh>
    );
};

const Entity = ({ playerPos }: { playerPos: THREE.Vector3 }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const posRef = useRef(new THREE.Vector3(-30, 1.8, -30));

    useFrame((_state, delta) => {
        if (!meshRef.current) return;

        const dir = playerPos.clone().sub(posRef.current);
        const dist = dir.length();

        if (dist > 0.5) {
            dir.normalize();
            posRef.current.add(dir.multiplyScalar(1.8 * delta));
        }

        meshRef.current.position.copy(posRef.current);
        meshRef.current.lookAt(playerPos);
    });

    return (
        <mesh ref={meshRef} position={posRef.current}>
            <boxGeometry args={[0.8, 2.2, 0.6]} />
            <meshStandardMaterial
                color="#1a1a1a"
                emissive="#330000"
                roughness={0.9}
                metalness={0}
            />
            <mesh position={[0.15, 0.35, 0.35]}>
                <sphereGeometry args={[0.12, 8, 8]} />
                <meshStandardMaterial color="#ff1111" emissive="#ff0000" />
            </mesh>
            <mesh position={[-0.15, 0.35, 0.35]}>
                <sphereGeometry args={[0.12, 8, 8]} />
                <meshStandardMaterial color="#ff1111" emissive="#ff0000" />
            </mesh>
        </mesh>
    );
};

const FlickeringLight = ({ position }: { position: [number, number, number] }) => {
    const [intensity, setIntensity] = useState(2);

    useFrame(() => {
        setIntensity(Math.random() > 0.95 ? Math.random() * 0.5 : 2);
    });

    return (
        <>
            <pointLight position={position} intensity={intensity} color="#ffffcc" distance={40} />
            <mesh position={position}>
                <boxGeometry args={[0.8, 0.2, 0.8]} />
                <meshStandardMaterial color="#fffacd" emissive="#ffff99" emissiveIntensity={0.6} />
            </mesh>
        </>
    );
};

interface Room {
    x: number;
    z: number;
    width: number;
    depth: number;
    type: 'small' | 'medium' | 'large' | 'hall';
}

// Geração procedural simples e confiável
const generateRooms = (): Room[] => {
    const rooms: Room[] = [];
    const usedPositions = new Set<string>();

    // Usar seed simples e determinístico
    const seed = 42;
    let rng = seed;

    const random = () => {
        rng = (rng * 9301 + 49297) % 233280;
        return rng / 233280;
    };

    // Gerar salas em grid com variação
    for (let gx = -3; gx <= 3; gx++) {
        for (let gz = -3; gz <= 3; gz++) {
            const baseX = gx * 60;
            const baseZ = gz * 60;

            // Offset aleatório baseado em seed
            const offsetX = (random() - 0.5) * 20;
            const offsetZ = (random() - 0.5) * 20;

            const x = baseX + offsetX;
            const z = baseZ + offsetZ;

            // Tipo de sala baseado em noise
            const roomType = random();
            let type: Room['type'] = 'small';
            let width = 25;
            let depth = 25;

            if (roomType > 0.6) {
                type = 'large';
                width = 50;
                depth = 50;
            } else if (roomType > 0.3) {
                type = 'medium';
                width = 35;
                depth = 35;
            } else if (roomType > 0.1) {
                type = 'hall';
                width = 60;
                depth = 20;
            }

            const key = `${Math.round(x)}-${Math.round(z)}`;
            if (!usedPositions.has(key)) {
                usedPositions.add(key);
                rooms.push({ x, z, width, depth, type });
            }
        }
    }

    return rooms;
};

const ProceduralLevel = ({
    playerCamPos,
    onTapeCollect,
}: {
    playerCamPos: THREE.Vector3;
    onTapeCollect: (id: number) => void;
}) => {
    const floorColor = '#fffacd';
    const wallColor = '#fff8dc';
    const rooms = useRef(generateRooms()).current;

    // Gerar luzes e decoração baseado em salas
    const lights = useRef<[number, number, number][]>([]);
    const decorations = useRef<{ pos: [number, number, number]; size: number }[]>([]);

    if (lights.current.length === 0) {
        rooms.forEach((room) => {
            // Luz principal da sala
            lights.current.push([room.x, 5.5, room.z] as [number, number, number]);

            // Luzes extras em salas maiores
            if (room.type === 'large') {
                lights.current.push([room.x - 10, 5.5, room.z - 10] as [number, number, number]);
                lights.current.push([room.x + 10, 5.5, room.z + 10] as [number, number, number]);
            } else if (room.type === 'hall') {
                const steps = Math.floor(room.width / 15);
                for (let i = 1; i < steps; i++) {
                    lights.current.push([
                        room.x - room.width / 2 + (i * room.width) / steps,
                        5.5,
                        room.z,
                    ] as [number, number, number]);
                }
            }

            // Decorações (caixas aleatórias)
            if (Math.random() > 0.6) {
                decorations.current.push({
                    pos: [
                        room.x + (Math.random() - 0.5) * 15,
                        0.5,
                        room.z + (Math.random() - 0.5) * 15,
                    ],
                    size: 0.8 + Math.random() * 0.4,
                });
            }
        });
    }

    // Gerar posições dinâmicas para fitas baseado no mapa
    const dynamicTapePositions = useRef<[number, number, number][]>([]);
    if (dynamicTapePositions.current.length === 0) {
        // Sempre garantir fita inicial perto do spawn
        const tapePositions: [number, number, number][] = [[10, 2, 0]];

        if (rooms.length >= 4) {
            const selectedRooms = rooms.sort(() => Math.random() - 0.5).slice(0, 4);

            selectedRooms.forEach((room) => {
                tapePositions.push([
                    room.x + (Math.random() - 0.5) * (room.width * 0.2),
                    2,
                    room.z + (Math.random() - 0.5) * (room.depth * 0.2),
                ] as [number, number, number]);
            });
        } else {
            // Fallback: criar fitas perto do centro
            tapePositions.push([-10, 2, 0], [0, 2, 15], [15, 2, 0], [-15, 2, 0]);
        }

        dynamicTapePositions.current = tapePositions;
    }

    return (
        <>
            {/* Chão infinito */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
                <planeGeometry args={[800, 800]} />
                <meshStandardMaterial color={floorColor} roughness={0.8} metalness={0.05} />
            </mesh>

            {/* Salas geradas proceduralmente */}
            {rooms.map((room, idx) => (
                <mesh key={`room-${idx}`} position={[room.x, 3, room.z]} castShadow receiveShadow>
                    <boxGeometry args={[room.width, 6, room.depth]} />
                    <meshStandardMaterial
                        color={wallColor}
                        roughness={0.9}
                        metalness={0}
                        side={THREE.BackSide}
                    />
                </mesh>
            ))}

            {/* Corredores inteligentes conectando salas próximas */}
            {rooms.map((room, idx) => {
                const neighbors = rooms
                    .slice(idx + 1)
                    .filter(
                        (other) =>
                            Math.sqrt(
                                Math.pow(room.x - other.x, 2) + Math.pow(room.z - other.z, 2),
                            ) < 100 &&
                            Math.sqrt(
                                Math.pow(room.x - other.x, 2) + Math.pow(room.z - other.z, 2),
                            ) > 30,
                    )
                    .slice(0, 3);

                return neighbors.map((otherRoom, nIdx) => {
                    const midX = (room.x + otherRoom.x) / 2;
                    const midZ = (room.z + otherRoom.z) / 2;
                    const corrWidth = Math.abs(room.x - otherRoom.x) + 15;
                    const corrDepth = Math.abs(room.z - otherRoom.z) + 15;

                    return (
                        <mesh
                            key={`corr-${idx}-${nIdx}`}
                            position={[midX, 3, midZ]}
                            castShadow
                            receiveShadow>
                            <boxGeometry args={[corrWidth, 6, corrDepth]} />
                            <meshStandardMaterial
                                color={wallColor}
                                roughness={0.9}
                                metalness={0}
                                side={THREE.BackSide}
                            />
                        </mesh>
                    );
                });
            })}

            {/* Decorações (caixas) */}
            {decorations.current.map((dec, i) => (
                <mesh key={`dec-${i}`} position={dec.pos} castShadow>
                    <boxGeometry args={[dec.size, dec.size * 1.2, dec.size * 0.8]} />
                    <meshStandardMaterial color="#d4a574" roughness={0.7} metalness={0.2} />
                </mesh>
            ))}

            {/* Fluorescentes */}
            {lights.current.map((pos, i) => (
                <FlickeringLight key={i} position={pos} />
            ))}

            {/* Tapes posicionadas dinamicamente nas salas */}
            {dynamicTapePositions.current.map((pos, id) => (
                <Tape
                    key={`tape-${id}`}
                    position={pos}
                    id={id}
                    playerPos={playerCamPos}
                    onCollect={onTapeCollect}
                />
            ))}

            {/* Criatura perseguidora */}
            <Entity playerPos={playerCamPos} />
        </>
    );
};

const SimpleScene = ({ controlsRef }: { controlsRef: React.MutableRefObject<any> }) => {
    const { camera } = useThree();
    const moveRef = useRef({
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
    });
    const playerCamPos = useRef(new THREE.Vector3(0, 1.6, 0));
    const { addCollectedTape } = useStore();

    useEffect(() => {
        const handleKey = (event: KeyboardEvent, down: boolean) => {
            switch (event.code) {
                case 'KeyW':
                case 'ArrowUp':
                    moveRef.current.forward = down;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    moveRef.current.backward = down;
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    moveRef.current.left = down;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    moveRef.current.right = down;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    moveRef.current.sprint = down;
                    break;
            }
        };

        const onKeyDown = (event: KeyboardEvent) => handleKey(event, true);
        const onKeyUp = (event: KeyboardEvent) => handleKey(event, false);

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, []);

    useFrame((_state, delta) => {
        if (!controlsRef.current?.isLocked) return;

        const speed = moveRef.current.sprint ? 15 : 7;
        const moveDir = new THREE.Vector3(
            Number(moveRef.current.right) - Number(moveRef.current.left),
            0,
            Number(moveRef.current.backward) - Number(moveRef.current.forward),
        );

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize();
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            const movement = forward
                .multiplyScalar(-moveDir.z * speed * delta)
                .add(right.multiplyScalar(moveDir.x * speed * delta));
            camera.position.add(movement);
            camera.position.y = Math.max(1.6, camera.position.y);
        }

        playerCamPos.current.copy(camera.position);
    });

    return (
        <>
            <PointerLockControls ref={controlsRef} />
            <ProceduralLevel playerCamPos={playerCamPos.current} onTapeCollect={addCollectedTape} />
            <Text
                position={[0, 5, 50]}
                fontSize={2}
                color="#ff0000"
                anchorX="center"
                anchorY="middle">
                ⚠ BACKROOMS ⚠
            </Text>
        </>
    );
};

export const World = () => {
    const { gameState, collectedTapes } = useStore();
    const [pointerLocked, setPointerLocked] = useState(false);
    const controlsRef = useRef<any>(null);

    useEffect(() => {
        const onPointerLockChange = () => setPointerLocked(!!document.pointerLockElement);
        document.addEventListener('pointerlockchange', onPointerLockChange);
        setPointerLocked(!!document.pointerLockElement);
        return () => document.removeEventListener('pointerlockchange', onPointerLockChange);
    }, []);

    const requestLock = () => controlsRef.current?.lock();

    return (
        <div
            style={{ width: '100vw', height: '100vh', position: 'relative', cursor: 'pointer' }}
            onClick={requestLock}>
            <Canvas
                shadows
                camera={{ position: [0, 1.6, 5], fov: 75, near: 0.1, far: 300 }}
                style={{ width: '100%', height: '100%' }}>
                <color attach="background" args={['#1a1a0e']} />
                <fog attach="fog" args={['#e8e8d0', 15, 150]} />

                <ambientLight intensity={0.7} color="#ffffcc" />
                <directionalLight position={[40, 20, 40]} intensity={0.3} color="#ffffcc" />

                {gameState === 'PLAYING' && <SimpleScene controlsRef={controlsRef} />}
            </Canvas>

            {/* UI de progresso */}
            <div
                style={{
                    position: 'fixed',
                    top: '20px',
                    left: '20px',
                    background: 'rgba(0, 0, 0, 0.75)',
                    color: '#fff',
                    padding: '1rem 1.5rem',
                    borderRadius: 8,
                    fontFamily: 'VT323',
                    fontSize: '1.2rem',
                    border: '2px solid #ff6b35',
                    zIndex: 20,
                }}>
                📼 FITAS: {collectedTapes.length}/5
                {collectedTapes.length === 5 && (
                    <div style={{ color: '#00ff00', marginTop: '0.5rem', fontSize: '1rem' }}>
                        ✓ TODAS AS FITAS COLETADAS!
                    </div>
                )}
            </div>

            {gameState === 'PLAYING' && !pointerLocked && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                        background: 'rgba(0, 0, 0, 0.4)',
                        fontFamily: 'VT323',
                    }}>
                    <div
                        style={{
                            background: 'rgba(0, 0, 0, 0.85)',
                            color: '#fff',
                            padding: '1.2rem 1.8rem',
                            borderRadius: 8,
                            fontSize: '1.3rem',
                            textAlign: 'center',
                            border: '1px solid #444',
                        }}>
                        ► Clique para começar - WASD para mover, SHIFT para correr
                    </div>
                </div>
            )}
        </div>
    );
};
