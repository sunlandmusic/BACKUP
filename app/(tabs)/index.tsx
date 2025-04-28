import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, SafeAreaView, Pressable, Platform, Modal } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/colors";
import { useChordStore } from "@/stores/chord-store";
import { Chord, ChordType, NoteName, MusicMode, InstrumentType } from "@/types/music";
import { playChord, stopChord, initAudio, setFlamValue } from "@/utils/audio-utils";
import { createChord, getScaleNotes, getMidiNote, getDiatonicChords, isChordTypeDiatonic } from "@/utils/chord-utils";
import { Eye, Play } from "lucide-react-native";
import { HorizontalPiano } from "@/components/HorizontalPiano";
import { SavedChordButton } from "@/components/SavedChordButton";
import { NavigationMenu } from "@/components/NavigationMenu";
import { usePathname, router } from "expo-router";
import { EditButton } from '@/components/EditButton';
import { ChordTypeButton } from '@/components/ChordTypeButton';
import { SettingsPanel } from "@/components/SettingsPanel";
import { UtilButton } from "@/components/UtilButton";
import * as Tone from 'tone';

const KEYS: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as NoteName[];
const MODES: MusicMode[] = ['off', 'major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'] as MusicMode[];

export type SettingType = 'bpm' | 'bars' | 'key' | 'mode' | 'octave' | 'inversion' | 'voicing' | 'instrument' | 'flam';

type ChordTypeItem = {
  type: ChordType;
  label: string;
  color: string;
  bassOffset?: number;
};

// Add new types at the top with other type definitions
type FlamOption = 'FLAM OFF' | 'FAST' | 'MED' | 'SLOW';

// Map UI FlamOption to audio-utils FlamValue
const flamOptionToFlamValue = (option: FlamOption): 'off' | '1/24' | '1/32' | '1/16' => {
  switch (option) {
    case 'FAST': return '1/32';
    case 'MED': return '1/24';
    case 'SLOW': return '1/16';
    case 'FLAM OFF':
    default: return 'off';
  }
};

export default function ChordComposeScreen() {
  const { 
    currentChord, 
    setCurrentChord, 
    savedChords, 
    saveChord,
    currentKey,
    setCurrentKey,
    currentMode,
    setCurrentMode,
    setSavedChords,
    currentInstrument = 'balafon',
    setCurrentInstrument
  } = useChordStore();
  
  const [selectedChordType, setSelectedChordType] = useState<ChordType | null>(null);
  const [selectedBassOffset, setSelectedBassOffset] = useState<number | null>(null);
  const [inversion, setInversion] = useState(0);
  const [voicing, setVoicing] = useState(0);
  const [octave, setOctave] = useState(0);
  const [scaleNotes, setScaleNotes] = useState<NoteName[]>([]);
  const [tempHighlightedChord, setTempHighlightedChord] = useState<Chord | null>(null);
  const [lastPlayedChord, setLastPlayedChord] = useState<Chord | null>(null);
  
  // For contextual +/- buttons
  const [selectedControl, setSelectedControl] = useState<SettingType | undefined>(undefined);
  
  // For navigation menu
  const [menuVisible, setMenuVisible] = useState(false);
  
  // For saved chord pagination
  const [savedChordPage, setSavedChordPage] = useState(0);
  const savedChordsPerPage = 8;
  const maxSavedChords = 32; // Limit to 32 saved chords (4 pages of 8)
  
  // For tracking active saved chord
  const [activeSavedChordIndex, setActiveSavedChordIndex] = useState<number | null>(null);
  
  // Ref to track if any chord button is pressed
  const isChordButtonPressedRef = useRef(false);
  
  // Get current route for navigation menu
  const pathname = usePathname();
  
  // Add new state variables
  const [pressedChordIndex, setPressedChordIndex] = useState<number | null>(null);
  const [lastMinusPress, setLastMinusPress] = useState<number>(0);
  
  // Add state for minus button long press
  const [isMinusLongPressed, setIsMinusLongPressed] = useState(false);
  const minusLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const minusAcceleratedTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add state for tracking pressed chord
  const [lastPressedChord, setLastPressedChord] = useState<Chord | null>(null);
  
  // Add new state for sound selection
  const [selectedSound, setSelectedSound] = useState<InstrumentType>('balafon');
  const [isSoundWindowSelected, setIsSoundWindowSelected] = useState(false);

  // Add available sounds array
  const availableSounds: InstrumentType[] = ['balafon', 'piano', 'rhodes', 'steel_drum', 'pluck', 'pad'];
  
  // Add new state variables with other state declarations
  const [selectedFlam, setSelectedFlam] = useState<FlamOption>('FLAM OFF');
  const [isFlamSelected, setIsFlamSelected] = useState(false);
  
  const [synth, setSynth] = useState<Tone.PolySynth | null>(null);
  const [chord, setChord] = useState<number[] | null>(null);
  
  // Add state for plus button long press
  const [isPlusLongPressed, setIsPlusLongPressed] = useState(false);
  const plusLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const plusAcceleratedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add state for grid navigation
  const [currentGrid, setCurrentGrid] = useState(0);
  const totalGrids = 2;
  // Add state for pressed note
  const [pressedNote, setPressedNote] = useState<NoteName | null>(null);
  // Add state for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  // Add state for copy mode
  const [isCopyMode, setIsCopyMode] = useState(false);
  // Add state for copied chord
  const [copiedChord, setCopiedChord] = useState<Chord | null>(null);
  // Add state for next chord to clear
  const [nextChordToClear, setNextChordToClear] = useState<number | null>(null);
  // Add state for edit popup
  const [isEditPopupVisible, setIsEditPopupVisible] = useState(false);

  // Initialize audio on component mount - update to handle errors
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await initAudio();
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    };
    
    setupAudio();
    
    // Cleanup function to stop any playing sounds
    return () => {
      stopChord().catch(console.error);
    };
  }, []);
  
  // Update scale notes when key or mode changes
  useEffect(() => {
    setScaleNotes(currentMode === 'off' ? [] : getScaleNotes(currentKey, currentMode));
  }, [currentKey, currentMode]);
  
  // Cleanup effect to stop any playing sounds when component unmounts
  useEffect(() => {
    return () => {
      stopChord();
    };
  }, []);
  
  // Add global mouse up handler for web to ensure sound stops when mouse is released
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleGlobalMouseUp = () => {
        if (isChordButtonPressedRef.current) {
          // Stop the chord and reset active index
          stopChord();
          setActiveSavedChordIndex(null);
          setTempHighlightedChord(null);
          setCurrentChord(null);
          isChordButtonPressedRef.current = false;
        }
      };
      
      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [setCurrentChord]);
  
  // Handle note press on piano
  const handleNotePress = (noteName: NoteName, midiNote: number) => {
    setPressedNote(noteName);
    if (selectedChordType) {
      let bassNote: NoteName | undefined;
      
      if (selectedBassOffset !== null) {
        const rootIndex = KEYS.indexOf(noteName);
        const bassIndex = (rootIndex + selectedBassOffset + 12) % 12;
        bassNote = KEYS[bassIndex];
      }
      
      // Create the chord with the primary type
      const newChord = createChord(noteName, selectedChordType, 4 + octave, bassNote);
      if (!newChord) return;
      
      // Apply inversion if selected
      if (inversion !== 0 && newChord.notes.length >= 3) {
        const notes = [...newChord.notes];
        if (inversion < 0) {
          // Move notes down an octave for negative inversions
          for (let i = notes.length - 1; i >= notes.length - Math.abs(inversion); i--) {
            notes[i] -= 12; // Move down an octave
          }
        } else {
          // Move notes up an octave for positive inversions
          for (let i = 0; i < inversion; i++) {
            notes[i] += 12; // Move up an octave
          }
        }
        newChord.notes = notes;
      }
      
      setCurrentChord(newChord);
      setLastPlayedChord(newChord);
      playChord(newChord.notes);
      
      // Set temporary highlighted chord for visualization
      setTempHighlightedChord(newChord);
    } else {
      // Just play the single note
      playChord([midiNote]);
      // Clear current chord when just playing a single note
      setCurrentChord(null);
      setTempHighlightedChord(null);
    }
  };
  
  // Handle note release on piano - stop all sounds
  const handleNoteRelease = () => {
    setPressedNote(null);
    stopChord();
    setTempHighlightedChord(null);
    // Also clear the current chord when releasing the note
    // This makes the behavior consistent with saved chord buttons
    setCurrentChord(null);
  };
  
  // Handle chord type button press
  const handleChordTypePress = (type: ChordType, label: string, bassOffset?: number) => {
    // Stop any currently playing sounds
    stopChord();
    
    if (label.includes('BASS')) {
      // Handle bass offset buttons - make them toggleable
      if (selectedBassOffset === bassOffset) {
        // If already selected, deselect it
        setSelectedBassOffset(null);
      } else {
        // Otherwise select it
        setSelectedBassOffset(bassOffset || 0);
        if (!selectedChordType) {
          setSelectedChordType('major'); // Default to major when selecting bass
        }
      }
    } else {
      // Handle all chord types as primary chord types
      if (selectedChordType === type) {
        // If already selected, deselect it
        setSelectedChordType(null);
        // Clear the current chord when deselecting a chord type
        setCurrentChord(null);
      } else {
        // Otherwise select it
        setSelectedChordType(type);
      }
    }
  };
  
  // Handle sound selection
  const handleSoundSelect = () => {
    if (isSoundWindowSelected) {
      setIsSoundWindowSelected(false);
    } else {
      setIsSoundWindowSelected(true);
      setSelectedControl(undefined);
      setIsFlamSelected(false); // Deselect flam when sound is selected
    }
  };

  // Handle control selection - update existing function
  const handleControlSelect = (control: SettingType) => {
    if (control === selectedControl) {
      setSelectedControl(undefined);
    } else {
      setSelectedControl(control);
      setIsSoundWindowSelected(false); // Deselect instrument window
      setIsFlamSelected(false); // Deselect flam window
    }
  };

  // Update handleAdjustValue for sound selection
  const handleAdjustValue = async (direction: 'up' | 'down') => {
    // Instrument window selection
    if (isSoundWindowSelected) {
      const currentIndex = availableSounds.indexOf(selectedSound);
      let newIndex = currentIndex;
      if (direction === 'up') {
        newIndex = (currentIndex + 1) % availableSounds.length;
      } else {
        newIndex = (currentIndex - 1 + availableSounds.length) % availableSounds.length;
      }
      const newInstrument = availableSounds[newIndex];
      await stopChord();
      try {
        await initAudio();
        setSelectedSound(newInstrument);
        setCurrentInstrument(newInstrument);
      } catch (error) {
        console.error('Error switching instrument:', error);
        await initAudio().catch(console.error);
      }
      return;
    }
    // Flam window selection
    if (isFlamSelected) {
      const flamOptions: FlamOption[] = ['FLAM OFF', 'FAST', 'MED', 'SLOW'];
      const currentIndex = flamOptions.indexOf(selectedFlam);
      let newIndex = currentIndex;
      if (direction === 'up') {
        newIndex = (currentIndex + 1) % flamOptions.length;
      } else {
        newIndex = (currentIndex - 1 + flamOptions.length) % flamOptions.length;
      }
      setSelectedFlam(flamOptions[newIndex]);
      return;
    }

    if (!selectedControl) return;

    try {
      switch (selectedControl) {
        case 'key': {
          const currentIndex = KEYS.indexOf(currentKey);
          const newIndex = direction === 'up'
            ? (currentIndex + 1) % KEYS.length
            : (currentIndex - 1 + KEYS.length) % KEYS.length;
          setCurrentKey(KEYS[newIndex]);
          break;
        }
        case 'mode': {
          const currentIndex = MODES.indexOf(currentMode);
          const newIndex = direction === 'up'
            ? (currentIndex + 1) % MODES.length
            : (currentIndex - 1 + MODES.length) % MODES.length;
          setCurrentMode(MODES[newIndex]);
          break;
        }
        case 'octave': {
          setOctave(prev => {
            const newValue = direction === 'up' ? prev + 1 : prev - 1;
            return Math.max(-2, Math.min(5, newValue));
          });
          break;
        }
        case 'inversion': {
          setInversion(prev => {
            const newValue = direction === 'up' ? prev + 1 : prev - 1;
            return Math.max(-3, Math.min(3, newValue));
          });
          break;
        }
        // Add other cases as needed
      }
    } catch (error) {
      console.error('Error in handleAdjustValue:', error);
    }
  };

  // Handle saved chord press
  const handleSavedChordPress = (index: number) => {
    const chord = savedChords[index];
    if (chord) {
      setLastPressedChord(chord);
      setCurrentChord(chord);
      playChord(chord.notes);
      setActiveSavedChordIndex(index);
      isChordButtonPressedRef.current = true;

      // If in edit mode, clear this chord
      if (isEditMode) {
        const newSavedChords = [...savedChords];
        newSavedChords[index] = null;
        setSavedChords(newSavedChords);
        setIsEditMode(false);
      }
    } else if (isCopyMode && copiedChord) {
      // If in copy mode and there's a copied chord, paste it
      saveChord(copiedChord, index);
      setIsCopyMode(false);
    }
  };

  // Handle saved chord long press
  const handleSavedChordLongPress = (index: number) => {
    const chord = savedChords[index];
    // Only save if the button is empty and we have a last played chord
    if (!chord && lastPlayedChord) {
      const newSavedChords = [...savedChords];
      newSavedChords[index] = lastPlayedChord;
      setSavedChords(newSavedChords);
    }
  };

  // Handle saved chord release
  const handleSavedChordRelease = () => {
    stopChord();
    setCurrentChord(null);
    setActiveSavedChordIndex(null);
    isChordButtonPressedRef.current = false;
  };

  // Get color for saved chord button
  const getSavedChordColor = (index: number) => {
    if (savedChords.length <= index) return colors.buttonGrey;
    
    const chord = savedChords[index];
    if (!chord) return colors.buttonGrey;
    
    switch (chord.type) {
      case 'major': return colors.chord.major;
      case 'minor': return colors.chord.minor;
      case 'dim': return colors.chord.dim;
      case 'augmented': return colors.chord.sus2; // Changed to match grid color
      case '7': return colors.chord['7'];
      case 'major7': return colors.chord.major7;
      case 'minor7': return colors.chord.minor7;
      case 'major9': return colors.chord.major9;
      case 'minor9': return colors.chord.minor9;
      case '9': return colors.chord['9'];
      case 'sus2': return colors.chord.sus2;
      case 'sus4': return colors.chord.sus4;
      case 'add9': return colors.chord.add9;
      case 'm7b5': return colors.chord.m7b5;
      case 'm11': return colors.chord.m11;
      case 'dim7': return colors.chord.dim7;
      case 'user': return colors.chord.user;
      case 'major11': return colors.chord.major;
      case 'major13': return colors.chord.major;
      case '6': return colors.chord.major;
      case '69': return colors.chord.major;
      case 'minor6': return colors.chord.minor;
      case 'minor13': return colors.chord.minor;
      case 'minorMajor7': return colors.chord.minor;
      case '7sus4': return colors.chord.minor;
      case 'augmented7': return colors.chord.sus4;
      case 'augmentedMajor7': return colors.chord.dim;
      case '11': return colors.chord.dim7;
      case 'bass': return '#000000';
      default: return colors.chord.user;
    }
  };

  // Handle saved chord page navigation
  const handleSavedChordPageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSavedChordPage(prev => Math.max(0, prev - 1));
    } else {
      const maxPages = Math.ceil(maxSavedChords / savedChordsPerPage);
      setSavedChordPage(prev => prev < maxPages - 1 ? prev + 1 : prev);
    }
  };

  // Toggle navigation menu
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  // Get chord display name for settings panel
  const getCurrentChordDisplay = () => {
    if (!currentChord) return '';
    let displayName = currentChord.root;
    switch (currentChord.type) {
      // First grid chord types
      case 'major': break;
      case 'minor': displayName += 'm'; break;
      case 'dim': displayName += 'dim'; break;
      case 'augmented': displayName += 'aug'; break;
      case '7': displayName += '7'; break;
      case 'major7': displayName += 'maj7'; break;
      case 'minor7': displayName += 'm7'; break;
      case 'major9': displayName += 'maj9'; break;
      case 'minor9': displayName += 'm9'; break;
      case '9': displayName += '9'; break;
      case 'sus2': displayName += 'sus2'; break;
      case 'sus4': displayName += 'sus4'; break;
      case 'add9': displayName += 'add9'; break;
      case 'm7b5': displayName += 'm7b5'; break;
      case 'm11': displayName += 'm11'; break;
      case 'dim7': displayName += 'dim7'; break;
      case 'user': displayName += 'U'; break;
      
      // Second grid chord types
      case 'major11': displayName += 'maj11'; break;
      case 'major13': displayName += 'maj13'; break;
      case '6': displayName += '6'; break;
      case '69': displayName += '69'; break;
      case 'minor6': displayName += 'm6'; break;
      case 'minor13': displayName += 'm13'; break;
      case 'minorMajor7': displayName += 'mM7'; break;
      case '7sus4': displayName += '7sus4'; break;
      case 'augmented7': displayName += 'aug7'; break;
      case 'augmentedMajor7': displayName += 'augM7'; break;
      case '11': displayName += '11'; break;
      case 'bass': displayName += 'bass'; break;
      
      default: break;
    }
    if (currentChord.bassNote && currentChord.bassNote !== currentChord.root) {
      displayName += `/${currentChord.bassNote}`;
    }
    return displayName;
  };

  // Define chord types for each row
  const chordTypeRows: ChordTypeItem[][][] = [
    // First grid (existing)
    [
      // Row 1
      [
        { type: 'major' as ChordType, label: 'MAJ', color: colors.chord.major },
        { type: 'major7' as ChordType, label: 'MAJ7', color: colors.chord.major7 },
        { type: 'major9' as ChordType, label: 'MAJ9', color: colors.chord.major9 },
        { type: '7' as ChordType, label: '7', color: colors.chord.major9 },
      ],
      // Row 2
      [
        { type: 'minor' as ChordType, label: 'MIN', color: colors.chord.minor },
        { type: 'minor7' as ChordType, label: 'MIN7', color: colors.chord.minor7 },
        { type: 'minor9' as ChordType, label: 'MIN9', color: colors.chord.minor9 },
        { type: '9' as ChordType, label: '9', color: colors.chord.minor9 },
      ],
      // Row 3
      [
        { type: 'sus2' as ChordType, label: 'SUS2', color: colors.chord.sus2 },
        { type: 'sus4' as ChordType, label: 'SUS4', color: colors.chord.sus4 },
        { type: 'dim' as ChordType, label: 'DIM', color: colors.chord.dim },
        { type: 'dim7' as ChordType, label: 'DIM7', color: colors.chord.dim7 },
      ],
      // Row 4
      [
        { type: 'm11' as ChordType, label: 'm11', color: colors.chord.user },
        { type: 'm7b5' as ChordType, label: 'm7b5', color: colors.chord.user },
        { type: 'add9' as ChordType, label: 'ADD9', color: colors.chord.user },
        { type: 'user' as ChordType, label: 'U', color: colors.chord.user },
      ],
    ],
    // Second grid (new)
    [
      // Row 1 (Green)
      [
        { type: 'major11' as ChordType, label: 'MAJ11', color: colors.chord.major },
        { type: 'major13' as ChordType, label: 'MAJ13', color: colors.chord.major },
        { type: '6' as ChordType, label: '6', color: colors.chord.major },
        { type: '69' as ChordType, label: '69', color: colors.chord.major },
      ],
      // Row 2 (Purple)
      [
        { type: 'minor6' as ChordType, label: 'm6', color: colors.chord.minor },
        { type: 'minor13' as ChordType, label: 'm13', color: colors.chord.minor },
        { type: 'minorMajor7' as ChordType, label: 'mM7', color: colors.chord.minor },
        { type: '7sus4' as ChordType, label: '7SUS4', color: colors.chord.minor },
      ],
      // Row 3 (Augmented)
      [
        { type: 'augmented' as ChordType, label: 'AUG', color: colors.chord.sus2 },
        { type: 'augmented7' as ChordType, label: 'AUG7', color: colors.chord.sus4 },
        { type: 'augmentedMajor7' as ChordType, label: 'AUGM7', color: colors.chord.dim },
        { type: '11' as ChordType, label: '11', color: colors.chord.dim7 },
      ],
      // Row 4 (Black with white text)
      [
        { type: 'bass' as ChordType, label: '-2 BASS', color: '#000000', bassOffset: -2 },
        { type: 'bass' as ChordType, label: '-3 BASS', color: '#000000', bassOffset: -3 },
        { type: 'bass' as ChordType, label: '+2 BASS', color: '#000000', bassOffset: 2 },
        { type: 'bass' as ChordType, label: '+3 BASS', color: '#000000', bassOffset: 3 },
      ],
    ],
  ];

  // Plus button handlers
  const handlePlusButtonPressIn = () => {
    handleAdjustValue('up'); // Single tap
    plusLongPressTimerRef.current = setTimeout(() => {
      setIsPlusLongPressed(true);
      plusAcceleratedTimerRef.current = setInterval(() => {
        handleAdjustValue('up');
      }, 50);
    }, 500);
  };
  const handlePlusButtonPressOut = () => {
    if (plusLongPressTimerRef.current) {
      clearTimeout(plusLongPressTimerRef.current);
      plusLongPressTimerRef.current = null;
    }
    if (plusAcceleratedTimerRef.current) {
      clearInterval(plusAcceleratedTimerRef.current);
      plusAcceleratedTimerRef.current = null;
    }
    setIsPlusLongPressed(false);
  };

  // Update minus button press handlers
  const handleMinusButtonPressIn = () => {
    handleAdjustValue('down'); // Single tap
    minusLongPressTimerRef.current = setTimeout(() => {
      setIsMinusLongPressed(true);
      minusAcceleratedTimerRef.current = setInterval(() => {
        handleAdjustValue('down');
      }, 50);
    }, 500);
  };
  const handleMinusButtonPressOut = () => {
    if (minusLongPressTimerRef.current) {
      clearTimeout(minusLongPressTimerRef.current);
      minusLongPressTimerRef.current = null;
    }
    if (minusAcceleratedTimerRef.current) {
      clearInterval(minusAcceleratedTimerRef.current);
      minusAcceleratedTimerRef.current = null;
    }
    setIsMinusLongPressed(false);
  };

  // Add function to handle grid navigation
  const handleGridChange = () => {
    setCurrentGrid(prev => (prev + 1) % totalGrids);
  };

  const handleClear = () => {
    // Set edit mode to true so the next pressed saved chord will be cleared
    setIsEditMode(true);
    setNextChordToClear(null);
  };

  const handleCopyPaste = () => {
    if (lastPressedChord) {
      setCopiedChord(lastPressedChord);
      setIsCopyMode(true);
    }
  };

  const handleEditPress = () => {
    setIsEditPopupVisible(prev => !prev);
  };

  const handleEditOption = (option: 'clear' | 'copy' | 'undo' | 'redo') => {
    switch (option) {
      case 'clear':
        setIsEditMode(true);
        break;
      case 'copy':
        if (lastPressedChord) {
          setCopiedChord(lastPressedChord);
          setIsCopyMode(true);
        }
        break;
      case 'undo':
        // Add undo functionality
        break;
      case 'redo':
        // Add redo functionality
        break;
    }
    setIsEditPopupVisible(false);
  };

  // Add this helper function near the other utility functions
  const formatInstrumentName = (name: InstrumentType): string => {
    if (name === 'steel_drum') return 'STEEL DRUM';
    return name.toUpperCase();
  };

  // Add new handler functions before the return statement
  const handleFlamSelect = () => {
    if (isFlamSelected) {
      setIsFlamSelected(false);
    } else {
      setIsFlamSelected(true);
      setSelectedControl(undefined); // Deselect other controls
      setIsSoundWindowSelected(false); // Deselect sound window
    }
  };

  const handleFlamAdjust = (direction: 'up' | 'down') => {
    const flamOptions: FlamOption[] = ['FLAM OFF', 'FAST', 'MED', 'SLOW'];
    const currentIndex = flamOptions.indexOf(selectedFlam);
    
    if (direction === 'up') {
      setSelectedFlam(flamOptions[(currentIndex + 1) % flamOptions.length]);
    } else {
      setSelectedFlam(flamOptions[(currentIndex - 1 + flamOptions.length) % flamOptions.length]);
    }
  };

  const playChordFromNotes = async (chordNotes: number[]) => {
    if (!synth) return;
    try {
      setChord(chordNotes);
      const frequencies = chordNotes.map(note => Tone.Frequency(note, "midi").toFrequency());
      synth.triggerAttack(frequencies);
    } catch (error) {
      console.error('Error playing chord:', error);
    }
  };

  const handleChordPress = (chord: Chord) => {
    if (!isChordButtonPressedRef.current) {
      setCurrentChord(chord);
      setLastPlayedChord(chord);
      const midiNotes = chord.notes;
      playChordFromNotes(midiNotes);
    }
  };

  const handleSettingSelect = (setting: SettingType | undefined) => {
    setSelectedControl(setting);
  };

  useEffect(() => {
    setFlamValue(flamOptionToFlamValue(selectedFlam));
  }, [selectedFlam]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Eye button at top left corner */}
      <Pressable style={styles.eyeButton} onPress={toggleMenu}>
        <Eye size={28} color={colors.text} />
      </Pressable>

      {/* Vertical "CHORD COMPOSE" text */}
      <View style={styles.verticalTitleContainer}>
        <Text style={styles.verticalTitleText}>C</Text>
        <Text style={styles.verticalTitleText}>H</Text>
        <Text style={styles.verticalTitleText}>O</Text>
        <Text style={styles.verticalTitleText}>R</Text>
        <Text style={styles.verticalTitleText}>D</Text>
        <Text style={styles.verticalTitleText}> </Text>
        <Text style={styles.verticalTitleText}>C</Text>
        <Text style={styles.verticalTitleText}>O</Text>
        <Text style={styles.verticalTitleText}>M</Text>
        <Text style={styles.verticalTitleText}>P</Text>
        <Text style={styles.verticalTitleText}>O</Text>
        <Text style={styles.verticalTitleText}>S</Text>
        <Text style={styles.verticalTitleText}>E</Text>
      </View>
      
      <View style={styles.gridNavContainer}>
        <Pressable 
          style={styles.gridNavButton}
          onPress={handleGridChange}
        >
          <View style={styles.arrowCircle}>
            <Text style={styles.doubleArrowText}>⇄</Text>
          </View>
        </Pressable>
      </View>
      
      {/* Navigation Menu */}
      <NavigationMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
        currentRoute={pathname}
      />
      
      <View style={styles.mainContent}>
        {/* Main layout with chord types on left, piano on right */}
        <View style={styles.topSection}>
          {/* Left side - Chord Types Section */}
          <View style={styles.chordTypesSection}>
            <View style={styles.chordTypeGrid}>
              {chordTypeRows[currentGrid].map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.chordTypeRow}>
                  {row.map((item, colIndex) => (
                    <ChordTypeButton
                      key={`${item.type}-${rowIndex}-${colIndex}`}
                      type={item.type}
                      label={item.label}
                      onPress={() => handleChordTypePress(item.type, item.label, 'bassOffset' in item ? item.bassOffset : undefined)}
                      isSelected={
                        Boolean(
                          ('bassOffset' in item && selectedBassOffset === item.bassOffset) ||
                          (!('bassOffset' in item) && selectedChordType === item.type)
                        )
                      }
                      isMatchingKeyMode={Boolean(
                        !('bassOffset' in item) && pressedNote &&
                        getDiatonicChords(currentKey, currentMode).some((chord: Chord) => 
                          chord.root === pressedNote && chord.type === item.type
                        )
                      )}
                      customColor={item.color}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
          
          {/* Right side - Piano Keyboard */}
          <View style={styles.pianoSection}>
            {/* Settings panel at top of piano section */}
            <SettingsPanel
              mode={currentMode}
              octave={octave}
              chord={getCurrentChordDisplay()}
              selectedKey={currentKey}
              inversion={inversion}
              selectedSetting={selectedControl as any}
              onSettingSelect={(setting) => handleControlSelect(setting as SettingType)}
            />
            
            {/* Piano keyboard */}
            <View style={styles.horizontalPianoContainer}>
              <HorizontalPiano 
                octave={4}
                onNotePress={handleNotePress}
                onNoteRelease={handleNoteRelease}
                highlightedNotes={tempHighlightedChord?.notes || currentChord?.notes}
                rootNote={tempHighlightedChord?.root || currentChord?.root}
                scaleNotes={scaleNotes}
              />
            </View>
          </View>
        </View>
        
        {/* Bottom section with saved chords */}
        <View style={styles.bottomSection}>
          {/* Navigation arrows and saved chord buttons */}
          <View style={styles.savedChordsContainer}>
            <View style={styles.savedChordsRow}>
              {/* Left arrow button */}
              <Pressable 
                style={styles.savedChordNavButton}
                onPress={() => handleSavedChordPageChange('prev')}
                disabled={savedChordPage === 0}
              >
                <View style={[styles.arrowCircle, savedChordPage === 0 && styles.arrowCircleDisabled]}>
                  <Play 
                    size={16} 
                    color={savedChordPage === 0 ? colors.textMuted : colors.textOffWhite} 
                    style={{ transform: [{ rotate: '180deg' }] }}
                    fill={savedChordPage === 0 ? colors.textMuted : colors.textOffWhite}
                  />
                </View>
              </Pressable>
              
              {/* Saved chord buttons */}
              <View style={styles.savedChordButtonsContainer}>
                {Array.from({ length: 8 }).map((_, index) => {
                  const chordIndex = savedChordPage * savedChordsPerPage + index;
                  const chord = savedChords[chordIndex];
                  const isActive = activeSavedChordIndex === chordIndex;
                  
                  return (
                    <SavedChordButton
                      key={`saved-chord-${chordIndex}`}
                      label={`${chordIndex + 1}`}
                      color={getSavedChordColor(chordIndex)}
                      onPress={() => handleSavedChordPress(chordIndex)}
                      onLongPress={() => handleSavedChordLongPress(chordIndex)}
                      onPressOut={handleSavedChordRelease}
                      index={chordIndex + 1}
                      chord={chord}
                    />
                  );
                })}
              </View>

              {/* Right arrow button */}
              <Pressable 
                style={styles.savedChordNavButtonRight}
                onPress={() => handleSavedChordPageChange('next')}
                disabled={savedChordPage >= Math.ceil(maxSavedChords / savedChordsPerPage) - 1}
              >
                <View style={[
                  styles.arrowCircle, 
                  savedChordPage >= Math.ceil(maxSavedChords / savedChordsPerPage) - 1 && styles.arrowCircleDisabled
                ]}>
                  <Play 
                    size={16} 
                    color={savedChordPage >= Math.ceil(maxSavedChords / savedChordsPerPage) - 1 ? colors.textMuted : colors.textOffWhite} 
                    fill={savedChordPage >= Math.ceil(maxSavedChords / savedChordsPerPage) - 1 ? colors.textMuted : colors.textOffWhite}
                  />
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      
      {/* Plus/Minus buttons at right - restored to original position */}
      <View style={styles.plusMinusContainer}>
        <Pressable
          style={styles.plusButton}
          onPressIn={handlePlusButtonPressIn}
          onPressOut={handlePlusButtonPressOut}
        >
          <Text style={styles.plusMinusText}>+</Text>
        </Pressable>
        <Pressable
          style={styles.minusButton}
          onPressIn={handleMinusButtonPressIn}
          onPressOut={handleMinusButtonPressOut}
        >
          <Text style={styles.plusMinusText}>-</Text>
        </Pressable>
      </View>

      <View style={styles.editButtonContainer}>
        <Pressable
          style={styles.editButton}
          onPress={handleEditPress}
        >
          <Text style={styles.editButtonText}>EDIT</Text>
        </Pressable>
      </View>

      {/* Edit popup */}
      {isEditPopupVisible && (
        <Pressable 
          style={styles.editPopupOverlay}
          onPress={() => setIsEditPopupVisible(false)}
        >
          <Pressable 
            style={styles.editPopup}
            onPress={e => e.stopPropagation()}
          >
            <Pressable
              style={styles.editPopupButton}
              onPress={() => handleEditOption('clear')}
            >
              <Text style={styles.editPopupButtonText}>CLEAR</Text>
            </Pressable>
            <Pressable
              style={styles.editPopupButton}
              onPress={() => handleEditOption('copy')}
            >
              <Text style={styles.editPopupButtonText}>COPY</Text>
            </Pressable>
            <Pressable
              style={styles.editPopupButton}
              onPress={() => handleEditOption('undo')}
            >
              <Text style={styles.editPopupButtonText}>UNDO</Text>
            </Pressable>
            <Pressable
              style={styles.editPopupButton}
              onPress={() => handleEditOption('redo')}
            >
              <Text style={styles.editPopupButtonText}>REDO</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      )}

      {/* Sound selection window */}
      <Pressable 
        style={[
          styles.soundWindow,
          isSoundWindowSelected && styles.soundWindowSelected
        ]}
        onPress={handleSoundSelect}
      >
        <Text style={styles.soundText}>{formatInstrumentName(selectedSound)}</Text>
      </Pressable>

      {/* Add Flam button before the sound window */}
      <Pressable 
        style={[
          styles.flamWindow,
          isFlamSelected && styles.flamWindowSelected
        ]}
        onPress={handleFlamSelect}
      >
        {selectedFlam === 'FLAM OFF' ? (
          <Text style={styles.flamText}>FLAM</Text>
        ) : (
          <Text style={styles.flamText}>{selectedFlam}</Text>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    flexDirection: 'row', // Main layout is horizontal for landscape
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    marginLeft: 30, // Reduced from 60px to 30px to slide everything left by 30px
    marginTop: 0, // Removed top margin to move everything up
  },
  // Eye button at top left corner
  eyeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Ensure it's above other elements
  },
  // Top section containing chord types and piano
  topSection: {
    flexDirection: 'row',
    height: 280, // Height for the top section
    marginTop: 0, // Removed top margin
  },
  // Chord Types Section - at left
  chordTypesSection: {
    width: 340,
    height: '100%',
    padding: 0, // Removed padding
    marginLeft: -16,
    position: 'relative',
  },
  chordTypeGrid: {
    width: '100%',
    height: '100%',
  },
  chordTypeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8, // Add 8px gap between rows
  },
  chordTypeButton: {
    width: 63,
    height: 53,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 4, // Add 8px total gap between buttons (4px on each side)
  },
  chordTypeButtonSelected: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  chordTypeButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  chordTypeButtonTextSelected: {
    color: colors.primary,
  },
  // Add specific styles for 9 and 7 buttons
  chordTypeButton9: {
    backgroundColor: colors.chord.user, // Purple color to match its row
  },
  chordTypeButton7: {
    backgroundColor: colors.chord.major, // Green color to match its row
  },
  selectedChordTypeButton: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  chordTypeText: {
    fontSize: 15,
    fontWeight: '300',
    color: colors.text,
  },
  blackChordTypeText: {
    color: '#000000', // Black text for most chord types
  },
  whiteChordTypeText: {
    color: colors.text, // White text for MIN, MIN7, MIN9, m11, USER, and BASS buttons
  },
  // Piano section - at right of chord types
  pianoSection: {
    flex: 1.2,
    marginLeft: -49, // Changed from -47 to -49 to move left by 2 more pixels
    marginRight: 5,
  },
  // Piano keyboard container
  horizontalPianoContainer: {
    width: '100%',
    minWidth: 500, // Increased from 450 to 500 to extend to chord grid
    height: 205,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  // Bottom section with saved chords
  bottomSection: {
    height: 125,
    marginTop: -25,
  },
  // Saved chords section
  savedChordsContainer: {
    width: '100%',
    marginTop: 4,
    position: 'relative',
    marginLeft: -72, // Changed from -60 to -72 to move left by 12 more pixels
  },
  savedChordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 55,
    height: '100%', // Added to ensure full height
  },
  savedChordNavButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
  },
  savedChordButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 335,
    marginLeft: 5, // Changed from -5 to 5 to move everything right by 10px
    gap: 8,
  },
  arrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.buttonGrey,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowCircleDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  savedChordNavButtonRight: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 278, // Changed from 279 to 278 to move left by 1px
  },
  // Plus/Minus buttons at right
  plusMinusContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  plusButton: {
    width: 40,
    height: 140,
    borderRadius: 8,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  minusButton: {
    width: 40,
    height: 140,
    borderRadius: 8,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  plusMinusText: {
    color: colors.textOffWhite, // Updated to off-white
    fontSize: 28, // Increased from 22 to 28 for better visibility
    fontWeight: 'bold',
  },
  topLeftControls: {
    position: 'absolute',
    top: 10,
    left: 10,
    alignItems: 'center',
  },
  gridNavContainer: {
    position: 'absolute',
    left: 79,
    top: 240,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  gridNavButton: {
    width: 43.2,
    height: 43.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedChordsSection: {
    flex: 1,
    marginTop: 13,
    paddingHorizontal: 8,
  },
  bassButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bassNumber: {
    fontWeight: '400',
    fontSize: 15,
    color: colors.text,
  },
  bassText: {
    fontWeight: '400',
    fontSize: 15,
    color: colors.text,
  },
  multiLineButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalTitleContainer: {
    position: 'absolute',
    left: -66,
    top: 167,
    flexDirection: 'row',
    transform: [{ rotate: '-90deg' }],
  },
  verticalTitleText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '200',
    letterSpacing: 0.5,
    marginHorizontal: 1,
  },
  editButtonContainer: {
    position: 'absolute',
    left: 11,
    bottom: 37,
    marginRight: -90,
  },
  editButton: {
    width: 41,
    height: 41,
    borderRadius: 20.5,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  editButtonText: {
    color: colors.textOffWhite,
    fontSize: 10,
    fontWeight: '600',
  },
  editPopupOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPopup: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 150,
  },
  editPopupButton: {
    backgroundColor: colors.buttonGrey,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  editPopupButtonText: {
    color: colors.textOffWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  doubleArrowText: {
    color: colors.textOffWhite,
    fontSize: 21.6,
    fontWeight: '600',
  },
  soundWindow: {
    position: 'absolute',
    left: 140,  // Changed from 142 to 140 to move left by 2
    top: 248,
    width: 132,
    height: 34,
    backgroundColor: colors.buttonGrey,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  soundWindowSelected: {
    borderColor: 'rgba(255, 255, 255, 0.3)',  // Lighter grey for selected state
    borderWidth: 2,
  },
  soundText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    paddingTop: 3,  // Increased from 2 to 3 to move text down further
  },
  flamWindow: {
    position: 'absolute',
    left: 279,
    top: 248,
    width: 66,
    height: 34,
    backgroundColor: colors.buttonGrey,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  flamWindowSelected: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
  },
  flamText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    paddingTop: 6,
  },
  flamTextSmall: {
    color: colors.text,
    fontSize: 11,  // Reduced from 12 to 11 (approximately 10% smaller)
    fontWeight: '500',
    lineHeight: 13,  // Adjusted line height to match new font size
  },
  controlWindow: {
    position: 'absolute',
    width: 66,
    height: 34,
    backgroundColor: colors.buttonGrey,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  controlWindowSelected: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
  },
  controlText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 13,
  },
});