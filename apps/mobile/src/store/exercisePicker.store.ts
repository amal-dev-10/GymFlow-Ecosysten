import { create } from 'zustand';
import type { ExerciseDto } from '../lib/api';

// Lightweight bridge so the member workout builder can open the exercise
// library in "pick" mode and receive the chosen exercise back.
interface ExercisePickerState {
  onPick: ((ex: ExerciseDto) => void) | null;
  setOnPick: (fn: ((ex: ExerciseDto) => void) | null) => void;
}

export const useExercisePickerStore = create<ExercisePickerState>((set) => ({
  onPick: null,
  setOnPick: (fn) => set({ onPick: fn }),
}));
