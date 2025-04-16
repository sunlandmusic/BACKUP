import { Chord, ChordModifier, ChordType, MusicMode, NoteName, noteNames } from '@/types/music';
import { nanoid } from '@/utils/nanoid';

// MIDI note number for middle C (C4)
const MIDDLE_C = 60;

// Get MIDI note number from note name and octave
export const getMidiNote = (note: NoteName, octave: number): number => {
  const noteIndex = noteNames.indexOf(note);
  return MIDDLE_C + (octave - 4) * 12 + noteIndex;
};

// Get note name from MIDI note number
export const getNoteNameFromMidi = (midiNote: number): NoteName => {
  const noteIndex = (midiNote % 12);
  return noteNames[noteIndex];
};

// Get chord notes based on root note and chord type
export const getChordNotes = (
  root: NoteName, 
  type: ChordType, 
  octave: number = 4, 
  bassNote?: NoteName,
  modifier?: ChordModifier
): number[] => {
  const rootIndex = noteNames.indexOf(root);
  const rootNote = MIDDLE_C + (octave - 4) * 12 + rootIndex;
  
  // Intervals for different chord types (in semitones)
  const intervals: Record<ChordType, number[]> = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    diminished: [0, 3, 6],
    augmented: [0, 4, 8],
    dominant7: [0, 4, 7, 10],
    dominant9: [0, 4, 7, 10, 14],
    major7: [0, 4, 7, 11],
    minor7: [0, 3, 7, 10],
    major9: [0, 4, 7, 11, 14],
    minor9: [0, 3, 7, 10, 14],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    add9: [0, 4, 7, 14],
    'm7b5': [0, 3, 6, 10],
    'm11': [0, 3, 7, 10, 14, 17],
    dim: [0, 3, 6],
    dim7: [0, 3, 6, 9],
    user: [0, 4, 7] // Default to major, should be overridden
  };
  
  // Make sure the type exists in our intervals
  if (!intervals[type]) {
    console.warn(`Unknown chord type: ${type}, defaulting to major`);
    type = 'major';
  }
  
  // Start with the base chord intervals
  let notes = [...intervals[type]];
  
  // Convert intervals to MIDI notes
  notes = notes.map(interval => rootNote + interval);
  
  // Handle slash chords (different bass note)
  if (bassNote) {
    const bassIndex = noteNames.indexOf(bassNote);
    const bassNoteValue = MIDDLE_C + (octave - 4) * 12 + bassIndex;
    
    // Remove any existing instances of the bass note
    notes = notes.filter(note => note % 12 !== bassNoteValue % 12);
    
    // Add the bass note at the beginning
    notes.unshift(bassNoteValue);
  }
  
  return notes;
};

// Create a chord object
export const createChord = (
  root: NoteName, 
  type: ChordType, 
  octave: number = 4, 
  bassNote?: NoteName,
  modifier?: ChordModifier
): Chord => {
  return {
    id: nanoid(),
    root,
    type,
    notes: getChordNotes(root, type, octave, bassNote),
    bassNote
  };
};

// Get notes in a scale/mode
export const getScaleNotes = (key: NoteName, mode: MusicMode): NoteName[] => {
  if (mode === 'off') return noteNames;
  
  const keyIndex = noteNames.indexOf(key);
  
  // Intervals for different modes (in semitones from the root)
  const modeIntervals: Record<MusicMode, number[]> = {
    off: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    ionian: [0, 2, 4, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    aeolian: [0, 2, 3, 5, 7, 8, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10]
  };
  
  // Get the scale notes
  return modeIntervals[mode].map(interval => {
    const noteIndex = (keyIndex + interval) % 12;
    return noteNames[noteIndex];
  });
};

// Get diatonic chords for a key and mode
export const getDiatonicChords = (key: NoteName, mode: MusicMode): Chord[] => {
  if (mode === 'off') return [];
  
  const scaleNotes = getScaleNotes(key, mode);
  const chords: Chord[] = [];
  
  // For each scale degree
  for (let i = 0; i < scaleNotes.length; i++) {
    const root = scaleNotes[i];
    
    // Try all possible chord types
    const allChordTypes: ChordType[] = [
      'major', 'minor', 'diminished', 'augmented',
      'dominant7', 'major7', 'minor7', 'major9', 'minor9',
      'dominant9', 'sus2', 'sus4', 'add9', 'm7b5', 'm11',
      'dim', 'dim7'
    ];
    
    // Test each chord type
    allChordTypes.forEach(type => {
      const chord = createChord(root, type);
      // Only add the chord if all its notes are in the scale
      if (isChordDiatonic(chord, key, mode)) {
        chords.push(chord);
      }
    });
  }
  
  return chords;
};

// Check if a chord is diatonic to a key and mode
export const isChordDiatonic = (chord: Chord, key: NoteName, mode: MusicMode): boolean => {
  if (mode === 'off') return true;
  
  // Get the scale notes
  const scaleNotes = getScaleNotes(key, mode);
  
  // Get all notes in the chord, normalized to a single octave
  const chordNotes = chord.notes.map(note => getNoteNameFromMidi(note));
  
  // Check if all chord notes are in the scale, ignoring octave
  return chordNotes.every(note => {
    const normalizedNote = note;
    return scaleNotes.includes(normalizedNote);
  });
};

// Check if a chord type is diatonic to the current key and mode for any root
export const isChordTypeDiatonic = (root: NoteName, type: ChordType): boolean => {
  // This is a simplified version that doesn't actually check diatonicity
  // It's used to highlight chord types in the UI
  return true;
};

// Get common chord progressions for a key
export const getCommonProgressions = (key: NoteName, mode: MusicMode = 'major'): { name: string, chords: Chord[] }[] => {
  const diatonicChords = getDiatonicChords(key, mode);
  
  // Common progressions by scale degree (1-based)
  const progressionPatterns = [
    { name: "I-IV-V", degrees: [1, 4, 5] },
    { name: "I-V-vi-IV", degrees: [1, 5, 6, 4] },
    { name: "ii-V-I", degrees: [2, 5, 1] },
    { name: "I-vi-IV-V", degrees: [1, 6, 4, 5] },
    { name: "vi-IV-I-V", degrees: [6, 4, 1, 5] }
  ];
  
  return progressionPatterns.map(pattern => {
    const progressionChords = pattern.degrees.map(degree => {
      // Convert 1-based to 0-based index
      const index = (degree - 1) % diatonicChords.length;
      return diatonicChords[index];
    });
    
    return {
      name: pattern.name,
      chords: progressionChords
    };
  });
};

// Get chord suggestions based on previous chord and key
export const getChordSuggestions = (previousChord: Chord | null, key: NoteName, mode: MusicMode): Chord[] => {
  const diatonicChords = getDiatonicChords(key, mode);
  
  // If no previous chord, suggest diatonic chords
  if (!previousChord) {
    return diatonicChords;
  }
  
  // Find common chord progressions
  const suggestions: Chord[] = [];
  const prevRootIndex = noteNames.indexOf(previousChord.root);
  
  // Add fifth up (circle of fifths progression)
  const fifthUpIndex = (prevRootIndex + 7) % 12;
  const fifthUpRoot = noteNames[fifthUpIndex];
  
  // Add fourth up (circle of fourths progression)
  const fourthUpIndex = (prevRootIndex + 5) % 12;
  const fourthUpRoot = noteNames[fourthUpIndex];
  
  // Filter for diatonic chords with these roots
  diatonicChords.forEach(chord => {
    if (chord.root === fifthUpRoot || chord.root === fourthUpRoot) {
      suggestions.push(chord);
    }
  });
  
  // Add relative minor/major if applicable
  if (previousChord.type === 'major') {
    const relativeMinorIndex = (prevRootIndex + 9) % 12;
    const relativeMinorRoot = noteNames[relativeMinorIndex];
    
    diatonicChords.forEach(chord => {
      if (chord.root === relativeMinorRoot && chord.type === 'minor') {
        suggestions.push(chord);
      }
    });
  } else if (previousChord.type === 'minor') {
    const relativeMajorIndex = (prevRootIndex + 3) % 12;
    const relativeMajorRoot = noteNames[relativeMajorIndex];
    
    diatonicChords.forEach(chord => {
      if (chord.root === relativeMajorRoot && chord.type === 'major') {
        suggestions.push(chord);
      }
    });
  }
  
  // Add more suggestions if we don't have enough
  if (suggestions.length < 3) {
    diatonicChords.forEach(chord => {
      if (!suggestions.some(c => c.root === chord.root && c.type === chord.type)) {
        suggestions.push(chord);
      }
      
      if (suggestions.length >= 5) return;
    });
  }
  
  return suggestions;
};