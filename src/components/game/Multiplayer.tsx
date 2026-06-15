import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import * as THREE from 'three';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';

export const localPlayerState = {
  position: [0, 5, 0] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
};

const OtherSurvivor = ({ position, rotation }: { position: number[], rotation: number[] }) => {
  const { scene, animations } = useGLTF('/models/Soldier.glb');
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const group = useRef<THREE.Group>(null);
  
  // We tint the model yellow to look like a hazmat suit
  useMemo(() => {
    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isMesh) {
        const mesh = child as THREE.SkinnedMesh;
        if (mesh.material) {
          mesh.material = (mesh.material as THREE.Material).clone();
          (mesh.material as THREE.MeshStandardMaterial).color.set('#d1b869');
          (mesh.material as THREE.MeshStandardMaterial).roughness = 0.5;
        }
      }
    });
  }, [clone]);

  const { actions } = useAnimations(animations, group);

  // Simple idle animation logic for others (could sync velocity over network for run anims)
  useEffect(() => {
    actions['Idle']?.play();
  }, [actions]);

  return (
    <group position={new THREE.Vector3(...position)} rotation={new THREE.Euler(...rotation)}>
      <group ref={group} position={[0, -1.4, 0]} scale={[1.5, 1.5, 1.5]}>
        <primitive object={clone} />
      </group>
    </group>
  );
};

export const Multiplayer = () => {
  const { user } = useStore();
  const [otherPlayers, setOtherPlayers] = useState<Record<string, { position: number[], rotation: number[] }>>({});
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('backrooms-level-0', {
      config: { broadcast: { ack: false } }
    });

    channelRef.current = channel;

    channel.on('broadcast', { event: 'movement' }, ({ payload }) => {
      if (payload.userId === user.id) return;
      setOtherPlayers(prev => ({
        ...prev,
        [payload.userId]: { position: payload.position, rotation: payload.rotation }
      }));
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (channelRef.current && channelRef.current.state === 'joined' && user) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'movement',
          payload: {
            userId: user.id,
            position: localPlayerState.position,
            rotation: localPlayerState.rotation
          }
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <>
      {Object.entries(otherPlayers).map(([id, state]) => (
        <OtherSurvivor key={id} position={state.position} rotation={state.rotation} />
      ))}
    </>
  );
};
