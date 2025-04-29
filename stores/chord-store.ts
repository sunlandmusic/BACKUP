import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Chord, 
  ChordModifier,
  ChordProgression, 
  FlamValue, 
  InstrumentType, 
  MusicMode, 
  NoteName, 
  Section, 
  Song, 
  TimeSignature,
  ChordType
} from '@/types/music';
import { nanoid } from '@/utils/nanoid';
import { createChord } from '@/utils/chord-utils';
import { setFlamValue, setInstrument } from '@/utils/audio-utils';

interface ChordState {
  // Current working state
  currentChord: Chord | null;
  currentProgression: ChordProgression | null;
  currentSong: Song | null;
  isPlaying: boolean;
  
  // App settings
  currentKey: NoteName;
  currentMode: MusicMode;
  currentInstrument: InstrumentType;
  currentFlamValue: FlamValue;
  
  // Saved items
  savedChords: (Chord | null)[];
  savedProgressions: ChordProgression[];
  savedSongs: Song[];
  savedSections: Section[];
  
  // User chord settings
  userChordType: ChordType | null;
  userChordIntervals: number[];
  userChordBassOffset: number;
  
  // Actions - Chord management
  setCurrentChord: (chord: Chord | null) => void;
  saveChord: (chord: Chord | null, index: number) => void;
  setSavedChords: (chords: (Chord | null)[]) => void;
  
  // Actions - Key and mode
  setCurrentKey: (key: NoteName) => void;
  setCurrentMode: (mode: MusicMode) => void;
  
  // Actions - Sound settings
  setCurrentInstrument: (instrument: InstrumentType) => void;
  setCurrentFlamValue: (flamValue: FlamValue) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  
  // Actions - User chord
  setUserChordType: (type: ChordType | null) => void;
  setUserChordIntervals: (intervals: number[]) => void;
  setUserChordBassOffset: (offset: number) => void;
  
  // Actions - Progression management
  setCurrentProgression: (progression: ChordProgression | null) => void;
  addChordToProgression: (chord: Chord) => void;
  updateChordInProgression: (index: number, chord: Chord) => void;
  removeChordFromProgression: (index: number) => void;
  createNewProgression: (key: NoteName) => ChordProgression;
  saveProgression: () => void;
  deleteProgression: (id: string) => void;
  loadProgression: (id: string) => void;
  
  // Actions - Song management
  setCurrentSong: (song: Song | null) => void;
  createNewSong: () => void;
  addProgressionToSong: (progressionId: string, sectionName: string) => void;
  updateSectionInSong: (index: number, section: Partial<Section>) => void;
  removeSectionFromSong: (index: number) => void;
  saveSong: () => void;
  deleteSong: (id: string) => void;
  loadSong: (id: string) => void;
}

// Maximum number of saved chords
const MAX_SAVED_CHORDS = 32;

export const useChordStore = create<ChordState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentChord: null,
      currentProgression: null,
      currentSong: null,
      isPlaying: false,
      
      currentKey: 'C',
      currentMode: 'major',
      currentInstrument: 'piano',
      currentFlamValue: 'off',
      
      savedChords: [],
      savedProgressions: [],
      savedSongs: [],
      savedSections: [],
      
      userChordType: null as ChordType | null,
      userChordIntervals: [],
      userChordBassOffset: 0,
      
      // Actions - Chord management
      setCurrentChord: (chord) => set({ currentChord: chord }),
      
      saveChord: (chord, index) => {
        if (index >= MAX_SAVED_CHORDS) return; // Enforce max saved chords limit
        
        const { savedChords } = get();
        const newSavedChords = [...savedChords];
        
        // Ensure the array is large enough
        while (newSavedChords.length <= index) {
          newSavedChords.push(null);
        }
        
        // Simply set the chord (or null for deletion)
        newSavedChords[index] = chord;
        
        // Trim array to max size
        const trimmedChords = newSavedChords.slice(0, MAX_SAVED_CHORDS);
        
        set({ savedChords: trimmedChords });
      },
      
      setSavedChords: (chords) => {
        // Ensure we don't exceed max saved chords
        const trimmedChords = chords.slice(0, MAX_SAVED_CHORDS);
        set({ savedChords: trimmedChords });
      },
      
      // Actions - Key and mode
      setCurrentKey: (key) => set({ currentKey: key }),
      
      setCurrentMode: (mode) => set({ currentMode: mode }),
      
      // Actions - Sound settings
      setCurrentInstrument: async (instrument) => {
        try {
          await setInstrument(instrument);
        set({ currentInstrument: instrument });
        } catch (e) {
          console.error('Error setting instrument:', e);
          // Fall back to piano if there's an error
          set({ currentInstrument: 'piano' });
        }
      },
      
      setCurrentFlamValue: async (flamValue) => {
        try {
          await setFlamValue(flamValue);
        set({ currentFlamValue: flamValue });
        } catch (e) {
          console.error('Error setting flam value:', e);
          // Fall back to off if there's an error
          set({ currentFlamValue: 'off' });
        }
      },
      
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      
      // Actions - User chord
      setUserChordType: (type) => {
        set({ userChordType: type });
      },
      setUserChordIntervals: (intervals) => set({ userChordIntervals: intervals }),
      
      setUserChordBassOffset: (offset) => set({ userChordBassOffset: offset }),
      
      // Actions - Progression management
      setCurrentProgression: (progression) => set({ currentProgression: progression }),
      
      addChordToProgression: (chord) => {
        const { currentProgression } = get();
        if (!currentProgression) return;
        
        set({
          currentProgression: {
            ...currentProgression,
            chords: [...currentProgression.chords, chord],
            updatedAt: Date.now()
          }
        });
      },
      
      updateChordInProgression: (index, chord) => {
        const { currentProgression } = get();
        if (!currentProgression) return;
        
        const updatedChords = [...currentProgression.chords];
        updatedChords[index] = chord;
        
        set({
          currentProgression: {
            ...currentProgression,
            chords: updatedChords,
            updatedAt: Date.now()
          }
        });
      },
      
      removeChordFromProgression: (index) => {
        const { currentProgression } = get();
        if (!currentProgression) return;
        
        const updatedChords = [...currentProgression.chords];
        updatedChords.splice(index, 1);
        
        set({
          currentProgression: {
            ...currentProgression,
            chords: updatedChords,
            updatedAt: Date.now()
          }
        });
      },
      
      createNewProgression: (key) => {
        const now = Date.now();
        const { currentMode } = get();
        const newProgression: ChordProgression = {
          id: nanoid(),
          name: `Progression ${get().savedProgressions.length + 1}`,
          chords: [],
          timeSignature: [4, 4] as TimeSignature,
          tempo: 120,
          key,
          mode: currentMode,
          createdAt: now,
          updatedAt: now
        };
        
        set({ currentProgression: newProgression });
        return newProgression;
      },
      
      saveProgression: () => {
        const { currentProgression, savedProgressions } = get();
        if (!currentProgression) return;
        
        // Check if progression already exists
        const existingIndex = savedProgressions.findIndex(p => p.id === currentProgression.id);
        
        if (existingIndex >= 0) {
          // Update existing progression
          const updatedProgressions = [...savedProgressions];
          updatedProgressions[existingIndex] = {
            ...currentProgression,
            updatedAt: Date.now()
          };
          
          set({ savedProgressions: updatedProgressions });
        } else {
          // Add new progression
          set({
            savedProgressions: [
              ...savedProgressions,
              { ...currentProgression, updatedAt: Date.now() }
            ]
          });
        }
      },
      
      deleteProgression: (id) => {
        const { savedProgressions, currentProgression } = get();
        
        // Remove from saved progressions
        set({
          savedProgressions: savedProgressions.filter(p => p.id !== id)
        });
        
        // Clear current progression if it's the one being deleted
        if (currentProgression && currentProgression.id === id) {
          set({ currentProgression: null });
        }
      },
      
      loadProgression: (id) => {
        const { savedProgressions } = get();
        const progression = savedProgressions.find(p => p.id === id);
        if (progression) {
          set({ currentProgression: { ...progression } });
        }
      },
      
      // Actions - Song management
      setCurrentSong: (song) => set({ currentSong: song }),
      
      createNewSong: () => {
        const now = Date.now();
        const { currentInstrument, currentFlamValue } = get();
        
        const newSong: Song = {
          id: nanoid(),
          name: `Song ${get().savedSongs.length + 1}`,
          sections: [],
          progressions: [],
          instrument: currentInstrument,
          flamValue: currentFlamValue,
          createdAt: now,
          updatedAt: now
        };
        
        set({ currentSong: newSong });
      },
      
      addProgressionToSong: (progressionId, sectionName) => {
        const { currentSong, savedProgressions } = get();
        if (!currentSong) return;
        
        // Find the progression
        const progression = savedProgressions.find(p => p.id === progressionId);
        if (!progression) return;
        
        // Create a new section
        const newSection: Section = {
          id: nanoid(),
          name: sectionName,
          progressionId,
          repeat: 1,
          steps: [],
          settings: {
            bpm: 120,
            bars: 4
          }
        };
        
        // Add section and progression to song
        set({
          currentSong: {
            ...currentSong,
            sections: [...currentSong.sections, newSection],
            progressions: [
              ...currentSong.progressions.filter(p => p.id !== progressionId),
              progression
            ],
            updatedAt: Date.now()
          }
        });
      },
      
      updateSectionInSong: (index, section) => {
        const { currentSong } = get();
        if (!currentSong) return;
        
        const updatedSections = [...currentSong.sections];
        updatedSections[index] = { ...updatedSections[index], ...section };
        
        set({
          currentSong: {
            ...currentSong,
            sections: updatedSections,
            updatedAt: Date.now()
          }
        });
      },
      
      removeSectionFromSong: (index) => {
        const { currentSong } = get();
        if (!currentSong) return;
        
        const updatedSections = [...currentSong.sections];
        updatedSections.splice(index, 1);
        
        set({
          currentSong: {
            ...currentSong,
            sections: updatedSections,
            updatedAt: Date.now()
          }
        });
      },
      
      saveSong: () => {
        const { currentSong, savedSongs } = get();
        if (!currentSong) return;
        
        // Check if song already exists
        const existingIndex = savedSongs.findIndex(s => s.id === currentSong.id);
        
        if (existingIndex >= 0) {
          // Update existing song
          const updatedSongs = [...savedSongs];
          updatedSongs[existingIndex] = {
            ...currentSong,
            updatedAt: Date.now()
          };
          
          set({ savedSongs: updatedSongs });
        } else {
          // Add new song
          set({
            savedSongs: [
              ...savedSongs,
              { ...currentSong, updatedAt: Date.now() }
            ]
          });
        }
      },
      
      deleteSong: (id) => {
        const { savedSongs, currentSong } = get();
        
        // Remove from saved songs
        set({
          savedSongs: savedSongs.filter(s => s.id !== id)
        });
        
        // Clear current song if it's the one being deleted
        if (currentSong && currentSong.id === id) {
          set({ currentSong: null });
        }
      },
      
      loadSong: (id) => {
        const { savedSongs } = get();
        const song = savedSongs.find(s => s.id === id);
        if (song) {
          set({ currentSong: { ...song } });
        }
      }
    }),
    {
      name: 'chord-store',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);