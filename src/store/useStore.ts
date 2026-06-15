import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

interface GameState {
    user: User | null;
    setUser: (user: User | null) => void;
    gameState: 'MENU' | 'PLAYING';
    setGameState: (state: 'MENU' | 'PLAYING') => void;
    coins: number;
    setCoins: (coins: number) => void;
    currentSkin: string;
    setCurrentSkin: (skin: string) => void;

    // New Mechanics
    health: number;
    setHealth: (health: number) => void;
    buildMode: boolean;
    setBuildMode: (mode: boolean) => void;
    isDancing: boolean;
    setIsDancing: (dancing: boolean) => void;
    walls: { id: string; position: number[] }[];
    addWall: (wall: { id: string; position: number[] }) => void;
}

export const useStore = create<GameState>((set) => ({
    user: null,
    setUser: (user) => set({ user }),
    gameState: 'MENU',
    setGameState: (state) => set({ gameState: state }),
    coins: 0,
    setCoins: (coins) => set({ coins }),
    currentSkin: 'default',
    setCurrentSkin: (skin) => set({ currentSkin: skin }),

    health: 100,
    setHealth: (health) => set({ health }),
    buildMode: false,
    setBuildMode: (mode) => set({ buildMode: mode }),
    isDancing: false,
    setIsDancing: (dancing) => set({ isDancing: dancing }),
    walls: [],
    addWall: (wall) => set((state) => ({ walls: [...state.walls, wall] })),
}));
