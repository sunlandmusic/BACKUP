// Music-related types

// Note names (C, C#, D, etc.)
export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

// Array of all note names
export const noteNames: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Chord types
export type ChordType = 
  | 'major' 
  | 'minor' 
  | 'dim' 
  | 'augmented' 
  | '7' 
  | 'major7' 
  | 'minor7' 
  | 'major9' 
  | 'minor9' 
  | '9' 
  | 'sus2' 
  | 'sus4' 
  | 'add9' 
  | 'm7b5' 
  | 'm11' 
  | 'dim7' 
  | '6'
  | 'user';

// Chord object
export interface Chord {
  id: string;
  root: NoteName;
  type: ChordType;
  notes: number[]; // MIDI note numbers
  bassNote?: NoteName; // For slash chords (e.g., C/G)
  duration?: number;
  inversion?: number; // 0 = root position, 1 = first inversion, etc.
  voicing?: number; // Different voicing options
}

// Scale modes
export type MusicMode = 
  | 'off' 
  | 'major' 
  | 'minor' 
  | 'ionian' 
  | 'dorian' 
  | 'phrygian' 
  | 'lydian' 
  | 'mixolydian' 
  | 'aeolian' 
  | 'locrian';

// Instrument types
export type InstrumentType = 
  | 'balafon'
  | 'piano' 
  | 'rhodes' 
  | 'pluck' 
  | 'pad' 
  | 'steel_drum';

// Flam values (for chord arpeggiation)
export type FlamValue = 'off' | '1/32' | '1/16' | '1/8';

// Time signature
export type TimeSignature = [number, number]; // [beats per measure, beat unit]

// Chord modifier (for progressions)
export interface ChordModifier {
  duration: number; // Duration in beats
  velocity: number; // Velocity (0-127)
  articulation?: 'staccato' | 'legato' | 'accent'; // Articulation type
}

// Section (for songs)
export interface Section {
  id: string;
  name: string; // e.g., 'Verse', 'Chorus', etc.
  progressionId: string;
  repeat: number;
  steps: Chord[]; // Array of chords in the section
  settings: {
    bpm: number;
    bars: number;
  };
}

// Chord progression
export interface ChordProgression {
  id: string;
  name: string;
  chords: Chord[];
  timeSignature: TimeSignature;
  tempo: number;
  key: NoteName;
  mode: MusicMode;
  createdAt: number;
  updatedAt: number;
}

// Song object
export interface Song {
  id: string;
  name: string;
  sections: Section[];
  progressions: ChordProgression[];
  instrument: InstrumentType;
  flamValue: FlamValue;
  createdAt: number;
  updatedAt: number;
}

export interface Progression {
  id: string;
  name: string;
  steps: Chord[];
  bpm: number;
  createdAt: Date;
}