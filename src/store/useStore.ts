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
}

export const useStore = create<GameState>((set) => ({
  player: null,
  setPlayer: (player) => set({ player }),
  gameState: 'MENU',
  setGameState: (state) => set({ gameState: state }),
}));
