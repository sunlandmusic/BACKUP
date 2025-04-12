import { create } from 'zustand';
import { Progression } from '@/types/music';

interface ProgressionState {
  progressions: Progression[];
  addProgression: (progression: Progression) => void;
  deleteProgression: (id: string) => void;
  updateProgression: (id: string, progression: Progression) => void;
}

export const useProgressionStore = create<ProgressionState>((set) => ({
  progressions: [],
  addProgression: (progression) => set((state) => ({
    progressions: [...state.progressions, progression],
  })),
  deleteProgression: (id) => set((state) => ({
    progressions: state.progressions.filter((p) => p.id !== id),
  })),
  updateProgression: (id, progression) => set((state) => ({
    progressions: state.progressions.map((p) => 
      p.id === id ? progression : p
    ),
  })),
})); 