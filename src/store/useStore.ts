import { create } from 'zustand';

interface Player {
    id: string;
    nickname: string;
}

interface GameState {
    player: Player | null;
    setPlayer: (player: Player | null) => void;
    gameState: 'MENU' | 'PLAYING';
    setGameState: (state: 'MENU' | 'PLAYING') => void;
    collectedTapes: number[];
    addCollectedTape: (tapeId: number) => void;
    getTapesCount: () => number;
}

export const useStore = create<GameState>((set, get) => ({
    player: null,
    setPlayer: (player) => set({ player }),
    gameState: 'MENU',
    setGameState: (state) => set({ gameState: state }),
    collectedTapes: [],
    addCollectedTape: (tapeId) => {
        const { collectedTapes } = get();
        if (!collectedTapes.includes(tapeId)) {
            set({ collectedTapes: [...collectedTapes, tapeId] });
        }
    },
    getTapesCount: () => get().collectedTapes.length,
}));
