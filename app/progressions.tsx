import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, SafeAreaView, Pressable, Platform, Modal, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/colors";
import { Eye, Play, Square, ChevronLeft, ChevronRight } from "lucide-react-native";
import { NavigationMenu } from "@/components/NavigationMenu";
import { usePathname } from "expo-router";
import { useChordStore } from "@/stores/chord-store";
import { Chord, ChordType, NoteName, noteNames, Progression } from "@/types/music";
import { 
  playChord, 
  stopChord, 
  playClick, 
  stopAllSounds,
  initAudio,
  setBpm 
} from "@/utils/audio-utils";
import { createChord, getScaleNotes } from "@/utils/chord-utils";
import { HorizontalPiano } from "@/components/HorizontalPiano";
import { SavedChordButton } from "@/components/SavedChordButton";
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useProgressionStore } from "@/stores/progression-store";

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface SettingsState {
  bpm: number;
  timeSignature: '4/4' | '3/4' | '6/8';
  click: boolean;
  bars: number;
  chord: string;
}

interface StepSequencerState {
  steps: (Chord | null)[];
  currentStep: number;
}

interface SavedSection {
  steps: (Chord | null)[];
  settings: SettingsState;
}

interface SavedProgression {
  steps: (Chord | null)[];
  settings: SettingsState;
}

export default function ProgressionsScreen() {
  const { 
    currentKey, 
    currentMode, 
    currentInstrument, 
    currentFlamValue,
    isPlaying,
    setCurrentInstrument,
    setCurrentFlamValue,
    setIsPlaying,
    savedChords,
    saveChord: storeSaveChord,
  } = useChordStore();

  // Add state declarations here
  const [editMode, setEditMode] = useState(false);
  const [selectedChordIndex, setSelectedChordIndex] = useState<number | null>(null);
  const [copiedChord, setCopiedChord] = useState<Chord | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const renderSavedChordsGrid = () => {
    return (
      <View style={styles.savedChordsContainer}>
        <View style={styles.playButtonContainer}>
          <Pressable 
            style={[styles.playButton, isPlaying && styles.playButtonActive]}
            onPress={handlePlayPress}
          >
            {isPlaying ? (
              <Square size={24} color={colors.text} />
            ) : (
              <Play size={24} color={colors.text} />
            )}
          </Pressable>
        </View>
        <View style={styles.savedChordsGrid}>
          {Array.from({ length: 16 }).map((_, index) => {
            const actualIndex = index + (chordGridPage * 16);
            return (
              <View key={actualIndex} style={styles.buttonContainer}>
                <SavedChordButton
                  key={`saved-chord-${actualIndex}`}
                  label={`${actualIndex + 1}`}
                  color={savedChords[actualIndex] ? getSavedChordColor(actualIndex) : colors.buttonGrey}
                  onPress={() => {
                    if (editMode) {
                      setSelectedChordIndex(actualIndex);
                      setEditModalVisible(true);
                    } else {
                      handleSavedChordPress(actualIndex);
                    }
                  }}
                  onPressOut={handleSavedChordRelease}
                  index={actualIndex + 1}
                  chord={savedChords[actualIndex] || null}
                  saveMode={saveMode}
                  isHighlighted={activeSavedChordIndex === actualIndex}
                />
              </View>
            );
          })}
        </View>
        <View style={styles.chordGridControls}>
          <Pressable 
            style={styles.chordGridNavButton}
            onPress={handleChordGridLeftArrowPress}
            disabled={chordGridPage === 0}
          >
            <View style={[styles.arrowCircle, chordGridPage === 0 && styles.arrowCircleDisabled]}>
              <Play 
                size={16} 
                color={chordGridPage === 0 ? colors.textMuted : colors.textOffWhite}
                style={{ transform: [{ rotate: '180deg' }] }}
                fill={chordGridPage === 0 ? colors.textMuted : colors.textOffWhite}
              />
            </View>
          </Pressable>
          <Pressable 
            style={styles.chordGridNavButton}
            onPress={handleChordGridRightArrowPress}
            disabled={chordGridPage >= 1}
          >
            <View style={[styles.arrowCircle, chordGridPage >= 1 && styles.arrowCircleDisabled]}>
              <Play 
                size={16} 
                color={chordGridPage >= 1 ? colors.textMuted : colors.textOffWhite}
                fill={chordGridPage >= 1 ? colors.textMuted : colors.textOffWhite}
              />
            </View>
          </Pressable>
        </View>
      </View>
    );
  };

  // Navigation menu state
  const [menuVisible, setMenuVisible] = useState(false);
  const pathname = usePathname();
  const {
    currentChord,
    setCurrentChord,
    savedChords: chordStoreSavedChords,
    saveChord,
    setCurrentKey,
    setCurrentMode,
    createNewProgression,
    addChordToProgression,
    saveProgression,
  } = useChordStore();

  // Settings state
  const [settings, setSettings] = useState<SettingsState>({
    bpm: 90,
    timeSignature: '4/4',
    click: true,
    bars: 2,
    chord: ''
  });
  const [selectedSetting, setSelectedSetting] = useState<keyof SettingsState | null>(null);

  // Step sequencer state
  const [stepSequencer, setStepSequencer] = useState<StepSequencerState>({
    steps: new Array(64).fill(null),
    currentStep: 0
  });

  // Saved sections state
  const [savedSections, setSavedSections] = useState<SavedSection[]>(Array(16).fill(undefined));
  const [selectedSection, setSelectedSection] = useState<number | null>(null);

  // Delete mode state
  const [deleteMode, setDeleteMode] = useState(false);

  // Event Handlers
  const toggleMenu = () => setMenuVisible(!menuVisible);

  // Add timer ref for sequencer
  const sequencerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Add click sound context
  const clickOscillatorRef = useRef<OscillatorNode | null>(null);
  const clickGainRef = useRef<GainNode | null>(null);

  // Initialize audio on component mount
  useEffect(() => {
    const setupAudio = async () => {
      await initAudio();
      setBpm(settings.bpm);
    };
    
    setupAudio();

    // Cleanup function
    return () => {
      // Stop any playing sounds
      stopChord();
      // Clear any intervals
      if (sequencerTimerRef.current) {
        clearInterval(sequencerTimerRef.current);
      }
    };
  }, [settings.bpm]);

  // Function to play click sound
  const playClick = (step: number) => {
    if (!clickGainRef.current) return;

    const audioContext = clickGainRef.current.context;
    
    // Stop previous oscillator if it exists
    if (clickOscillatorRef.current) {
      clickOscillatorRef.current.stop();
    }

    // Create and configure oscillator
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    
    // Use higher pitch (1500Hz) for steps 0, 8, 16, 24, etc. (every 8th beat)
    // and normal pitch (1000Hz) for other steps
    const isAccentedBeat = step % 8 === 0;
    oscillator.frequency.value = isAccentedBeat ? 1500 : 1000;
    
    // Connect oscillator to gain node
    oscillator.connect(clickGainRef.current);
    
    // Schedule the click sound
    const now = audioContext.currentTime;
    oscillator.start(now);
    oscillator.stop(now + 0.05); // Short duration click
    
    clickOscillatorRef.current = oscillator;
  };

  // Add state for currently playing sequence
  const [currentlyPlayingSequence, setCurrentlyPlayingSequence] = useState<number | null>(null);

  // Add state for pending sequence change
  const [pendingSequenceChange, setPendingSequenceChange] = useState<{
    steps: (Chord | null)[];
    settings: SettingsState;
  } | null>(null);

  // Update handleSectionPress to properly track the playing sequence
  const handleSectionPress = (index: number) => {
    if (deleteMode) {
      // Delete the section
      setSavedSections(prev => {
        const newSections = [...prev];
        newSections[index] = undefined as any;
        return newSections;
      });
      return;
    }

    const section = savedSections[index];
    
    if (!section) {
      // If the section is empty, save the current sequence
      setSavedSections(prev => {
        const newSections = [...prev];
        newSections[index] = {
          steps: [...stepSequencer.steps],
          settings: { ...settings }
        };
        return newSections;
      });
    } else {
      // If the section has a sequence, load it immediately
      setSettings(section.settings);
      setStepSequencer(prev => ({
        ...prev,
        steps: [...section.steps]
      }));
      // Always update the currently playing sequence when a sequence is loaded
      setCurrentlyPlayingSequence(index);
    }
  };

  // Update the sequencer playback effect to ensure first click plays
  useEffect(() => {
    if (isPlaying) {
      const stepDuration = (60 / (settings.bpm * 4)) * 1000;
      const stepsPerBar = 16;
      const totalStepsInLoop = stepsPerBar * settings.bars;

      // Play the first click immediately when starting
      if (settings.click) {
        void playClick(0);
      }

      sequencerTimerRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = (prev + 1) % totalStepsInLoop;
          
          // Play click on every 2nd step (half time)
          if (settings.click && nextStep % 2 === 0) {
            void playClick(nextStep);
          }

          // Play the chord stored at this step if it exists
          const chord = stepSequencer.steps[nextStep];
          if (chord) {
            void stopChord();
            void playChord(chord.notes);
            // Stop the chord after its stored duration
            setTimeout(() => {
              void stopChord();
            }, chord.duration || 200);
          } else {
            void stopChord();
          }
          
          return nextStep;
        });
      }, stepDuration);
    } else {
      // Only clear the currently playing sequence when stopping
      setCurrentlyPlayingSequence(null);
    }

    return () => {
      if (sequencerTimerRef.current) {
        clearInterval(sequencerTimerRef.current);
        sequencerTimerRef.current = null;
      }
      void stopChord();
    };
  }, [isPlaying, settings.bpm, settings.click, settings.bars, stepSequencer.steps]);

  const handleSettingSelect = (setting: keyof SettingsState) => {
    setSelectedSetting(prev => prev === setting ? null : setting);
  };

  const handleSettingAdjust = (direction: 'up' | 'down') => {
    if (!selectedSetting) return;

    setSettings(prev => {
      const newSettings = { ...prev };
      
      switch (selectedSetting) {
        case 'bpm':
          const newBpm = direction === 'up' ? prev.bpm + 1 : prev.bpm - 1;
          newSettings.bpm = Math.max(40, Math.min(240, newBpm));
          // Sync BPM with audio utilities
          setBpm(newSettings.bpm);
          break;
        case 'timeSignature':
          const signatures: SettingsState['timeSignature'][] = ['4/4', '3/4', '6/8'];
          const currentIndex = signatures.indexOf(prev.timeSignature);
          const newIndex = direction === 'up' 
            ? (currentIndex + 1) % signatures.length
            : (currentIndex - 1 + signatures.length) % signatures.length;
          newSettings.timeSignature = signatures[newIndex];
          break;
        case 'click':
          newSettings.click = !prev.click;
          break;
        case 'bars':
          const newBars = direction === 'up' ? prev.bars + 1 : prev.bars - 1;
          newSettings.bars = Math.max(1, Math.min(16, newBars));
          break;
        case 'chord':
          newSettings.chord = '';
          break;
      }
      
      return newSettings;
    });
  };

  // Add state for last played chord and duration
  const [lastPlayedChord, setLastPlayedChord] = useState<Chord | null>(null);
  const [lastChordDuration, setLastChordDuration] = useState<number>(0);
  const chordStartTimeRef = useRef<number>(0);

  // Update chord type handling
  const chordTypes: ChordType[] = [
    'major', 'minor', 'dim', 'augmented', '7', 'major7', 
    'minor7', 'major9', 'minor9', '9', 'sus2', 'sus4', 
    'add9', 'm7b5', 'm11', 'dim7', '6', 'major11', 'major13',
    '69', 'minor6', 'minor13', 'minorMajor7', '7sus4',
    'augmented7', 'augmentedMajor7', '11', 'bass', '7b5',
    '7#5', '9sus', '13sus', '7sus'
  ];

  const getChordDisplayName = (type: ChordType) => {
    const displayNames: Record<ChordType, string> = {
      major: 'Major',
      minor: 'Minor',
      dim: 'Dim',
      augmented: 'Aug',
      '7': '7',
      'major7': 'Maj7',
      'minor7': 'Min7',
      'major9': 'Maj9',
      'minor9': 'Min9',
      '9': '9',
      'sus2': 'Sus2',
      'sus4': 'Sus4',
      'add9': 'Add9',
      'm7b5': 'm7b5',
      'm11': 'm11',
      'dim7': 'Dim7',
      '6': '6',
      'user': 'User',
      'major11': 'Maj11',
      'major13': 'Maj13',
      '69': '6/9',
      'minor6': 'Min6',
      'minor13': 'Min13',
      'minorMajor7': 'MinMaj7',
      '7sus4': '7sus4',
      'augmented7': 'Aug7',
      'augmentedMajor7': 'AugMaj7',
      '11': '11',
      'bass': 'Bass',
      '7b5': '7b5',
      '7#5': '7#5',
      '9sus': '9sus',
      '13sus': '13sus',
      '7sus': '7sus'
    };
    return displayNames[type] || type;
  };

  // Update handleNotePress to handle undefined chord
  const handleNotePress = (noteName: NoteName, midiNote: number) => {
    if (selectedChordType) {
      // Create chord based on selected type and root note
      let bassNote: NoteName | undefined;
      
      if (selectedBassOffset !== null) {
        const rootIndex = noteNames.indexOf(noteName);
        const bassIndex = (rootIndex + selectedBassOffset + 12) % 12;
        bassNote = noteNames[bassIndex];
      }
      
      // Create the chord with the primary type
      const chord = createChord(noteName, selectedChordType, 4 + octave, bassNote);
      
      if (chord) {
        // Apply inversion if selected
        if (inversion !== 0 && chord.notes.length >= 3) {
          const notes = [...chord.notes];
          if (inversion < 0) {
            // Move notes up an octave for negative inversions
            for (let i = 0; i < Math.abs(inversion); i++) {
              notes[i] += 12; // Move up an octave
            }
          } else {
            // Move notes down an octave for positive inversions
            for (let i = notes.length - 1; i >= notes.length - inversion; i--) {
              notes[i] -= 12; // Move down an octave
            }
          }
          chord.notes = notes;
        }
        
        const chordWithId: Chord = {
          ...chord,
          id: `chord-${Date.now()}`,
          duration: 200,
          isOccupied: true
        };
        
        setCurrentChord(chordWithId);
        setLastPlayedChord(chordWithId);
        void playChord(chord.notes);
        
        // Record start time for duration tracking
        chordStartTimeRef.current = Date.now();
        
        // Set temporary highlighted chord for visualization
        setTempHighlightedChord(chordWithId);
      }
    } else {
      // Just play the single note
      const singleNoteChord: Chord = {
        id: `note-${Date.now()}`,
        root: noteName,
        type: 'bass',
        notes: [midiNote],
        duration: 200,
        isOccupied: true
      };
      void playChord([midiNote]);
      setLastPlayedChord(singleNoteChord); // Set lastPlayedChord for single notes too
      setCurrentChord(singleNoteChord);
      setTempHighlightedChord(singleNoteChord);
    }
  };

  // Modify handleNoteRelease to calculate duration
  const handleNoteRelease = () => {
    stopChord();
    setTempHighlightedChord(null);
    
    // Calculate and store the duration if we have a start time
    if (chordStartTimeRef.current > 0) {
      const duration = Date.now() - chordStartTimeRef.current;
      setLastChordDuration(duration);
      chordStartTimeRef.current = 0;
    }
    
    // Also clear the current chord when releasing the note
    // This makes the behavior consistent with saved chord buttons
    setCurrentChord(null);
  };

  // Update the step button press handler
  const handleStepPress = (index: number) => {
    console.log('Step pressed:', index);
    console.log('Delete mode:', deleteMode);
    console.log('Last played chord:', lastPlayedChord);

    if (deleteMode) {
      console.log('Deleting step');
      // Clear the step
      const updatedSteps = [...stepSequencer.steps];
      updatedSteps[index] = null;
      setStepSequencer(prev => ({
        ...prev,
        steps: updatedSteps
      }));
      return;
    }

    // If there's a last played chord, save it to this step
    if (lastPlayedChord) {
      console.log('Saving last played chord to step:', lastPlayedChord);
      const updatedSteps = [...stepSequencer.steps];
      updatedSteps[index] = {
        ...lastPlayedChord,
        id: `step-${index}-${Date.now()}`,
        duration: 200,
        isOccupied: true,
        notes: lastPlayedChord.notes || [],
        root: lastPlayedChord.root,
        type: lastPlayedChord.type
      };
      console.log('Updated step:', updatedSteps[index]);
      setStepSequencer(prev => ({
        ...prev,
        steps: updatedSteps
      }));
    } else if (stepSequencer.steps[index]) {
      console.log('Playing existing step chord');
      void playChord(stepSequencer.steps[index]!.notes);
    } else {
      console.log('No last played chord and no existing chord in step');
    }
  };

  const handleDeletePress = () => {
    setDeleteMode(!deleteMode);
  };
  
  const [selectedChordType, setSelectedChordType] = useState<ChordType | null>(null);
  const [selectedBassOffset, setSelectedBassOffset] = useState<number | null>(null);
  const [inversion, setInversion] = useState(0);
  const [voicing, setVoicing] = useState(0);
  const [octave, setOctave] = useState(0);
  const [scaleNotes, setScaleNotes] = useState<NoteName[]>([]);
  const [tempHighlightedChord, setTempHighlightedChord] = useState<Chord | null>(null);
  
  // For contextual +/- buttons
  const [selectedControl, setSelectedControl] = useState<'key' | 'mode' | 'inversion' | 'voicing' | 'octave' | null>('key');
  
  // For saved chord pagination
  const [savedChordPage, setSavedChordPage] = useState(0);
  const savedChordsPerPage = 8;
  const maxSavedChords = 32; // Limit to 32 saved chords (4 pages of 8)
  
  // For save mode
  const [saveMode, setSaveMode] = useState(false);
  
  // For tracking active saved chord
  const [activeSavedChordIndex, setActiveSavedChordIndex] = useState<number | null>(null);
  
  // Ref to track if any chord button is pressed
  const isChordButtonPressedRef = useRef(false);
  
  // Create array of 16 buttons for 4x4 grid
  const gridButtons = Array.from({ length: 16 }, (_, i) => i);
  
  // Get current route for navigation menu
  usePathname();
  
  // Initialize audio on component mount
  useEffect(() => {
    const setupAudio = async () => {
      await initAudio();
    };
    
    setupAudio();
  }, []);
  
  // Update scale notes when key or mode changes
  useEffect(() => {
    setScaleNotes(getScaleNotes(currentKey, currentMode));
  }, [currentKey, currentMode]);
  
  // Cleanup effect to stop any playing sounds when component unmounts
  useEffect(() => {
    const cleanup = async () => {
      await stopChord();
    };
    return () => {
      void cleanup();
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
  
  // Handle chord type button press
  const handleChordTypePress = (type: ChordType, label: string, bassOffset?: number) => {
    // Stop any currently playing sounds
    void stopAllSounds();
    
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
  
  // Handle control selection
  const handleControlSelect = (control: 'key' | 'mode' | 'inversion' | 'voicing' | 'octave') => {
    setSelectedControl(control);
    // If selecting inversion and we have a current chord, update it immediately
    if (control === 'inversion' && currentChord) {
      const notes = [...currentChord.notes];
      if (inversion < 0) {
        // Move notes up an octave for negative inversions
        for (let i = 0; i < Math.abs(inversion); i++) {
          notes[i] += 12; // Move up an octave
        }
      } else {
        // Move notes down an octave for positive inversions
        for (let i = notes.length - 1; i >= notes.length - inversion; i--) {
          notes[i] -= 12; // Move down an octave
        }
      }
      const updatedChord = { ...currentChord, notes };
      setCurrentChord(updatedChord);
      void playChord(updatedChord.notes);
    }
  };
  
  // Handle contextual +/- button press
  const handleAdjustValue = (direction: 'up' | 'down') => {
    if (!selectedControl) return;
    
    switch (selectedControl) {
      case 'key':
        const currentKeyIndex = noteNames.indexOf(currentKey);
        const newKeyIndex = direction === 'up' 
          ? (currentKeyIndex + 1) % noteNames.length
          : (currentKeyIndex - 1 + noteNames.length) % noteNames.length;
        setCurrentKey(noteNames[newKeyIndex]);
        break;
        
      case 'mode':
        const modes = ['off', 'major', 'minor', 'ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];
        const currentModeIndex = modes.indexOf(currentMode);
        let newModeIndex;
        
        if (direction === 'up') {
          newModeIndex = (currentModeIndex + 1) % modes.length;
        } else {
          newModeIndex = (currentModeIndex - 1 + modes.length) % modes.length;
        }
        
        setCurrentMode(modes[newModeIndex] as any);
        break;
        
      case 'octave':
        if (direction === 'up') {
          setOctave(prev => prev < 3 ? prev + 1 : prev);
        } else {
          setOctave(prev => prev > -3 ? prev - 1 : prev);
        }
        break;
        
      case 'inversion':
        if (direction === 'up') {
          setInversion(prev => {
            if (prev === -2) return -1;
            if (prev === -1) return 1;
            if (prev === 1) return 2;
            if (prev === 0) return 1;
            return prev;
          });
        } else {
          setInversion(prev => {
            if (prev === 2) return 1;
            if (prev === 1) return -1;
            if (prev === -1) return -2;
            if (prev === 0) return -1;
            return prev;
          });
        }
        // If we have a current chord, update it with the new inversion
        const chordToUpdate = currentChord || lastPlayedChord;
        if (chordToUpdate) {
          const notes = [...chordToUpdate.notes];
          if (inversion < 0) {
            // Move notes up an octave for negative inversions
            for (let i = 0; i < Math.abs(inversion); i++) {
              notes[i] += 12; // Move up an octave
            }
          } else {
            // Move notes down an octave for positive inversions
            for (let i = notes.length - 1; i >= notes.length - inversion; i--) {
              notes[i] -= 12; // Move down an octave
            }
          }
          const updatedChord = { ...chordToUpdate, notes };
          setCurrentChord(updatedChord);
          setLastPlayedChord(updatedChord);
          void playChord(updatedChord.notes);
        }
        break;
        
      case 'voicing':
        if (direction === 'up') {
          setVoicing(prev => prev < 3 ? prev + 1 : prev);
        } else {
          setVoicing(prev => prev > -3 ? prev - 1 : prev);
        }
        break;
    }
  };

  // Update the saved chord press handler
  const handleSavedChordPress = (index: number) => {
    if (deleteMode) {
      // Delete the saved chord by creating an empty chord
      const emptyChord: Chord = {
        id: `empty-${Date.now()}`,
        root: 'C',
        type: 'major',
        notes: [],
        duration: 200
      };
      storeSaveChord(emptyChord, index);
      return;
    }

    // Existing saved chord press logic
    setActiveSavedChordIndex(index);
    const chord = savedChords[index];
    if (chord) {
      void playChord(chord.notes);
      setLastPlayedChord(chord); // Set the last played chord when pressing a saved chord
      console.log('Set last played chord from saved chord:', chord);
    }
  };

  // Handle saved chord release - immediately stop sound and clear highlight
  const handleSavedChordRelease = () => {
    void stopAllSounds();
  };

  // Handle saving current chord
  const handleSaveCurrentChord = (index: number) => {
    // Use either the current chord or the last played chord, whichever is available
    const chordToSave = currentChord || lastPlayedChord;
    
    if (!chordToSave || index >= maxSavedChords) return;
    storeSaveChord(chordToSave, index);
  };

  // Toggle save mode
  const toggleSaveMode = () => {
    setSaveMode(!saveMode);
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
      case 'augmented': return colors.chord.augmented;
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
      default: return colors.chord.user;
    }
  };

  // Update handleSavedChordPageChange
  const handleSavedChordPageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && savedChordPage > 0) {
      setSavedChordPage(prev => prev - 1);
    } else if (direction === 'next' && savedChordPage < 1) {
      setSavedChordPage(prev => prev + 1);
    }
  };

  // Add missing state variables
  const [chordGridPage, setChordGridPage] = useState(0);
  const [sequencePage, setSequencePage] = useState(0);
  const [savedProgressions, setSavedProgressions] = useState<(SavedProgression | null)[]>([]);
  const [activeSavedProgressionIndex, setActiveSavedProgressionIndex] = useState<number | null>(null);
  const [currentlyPlayingProgression, setCurrentlyPlayingProgression] = useState<number | null>(null);

  // Add missing handlers
  const handlePlayPress = () => {
    setIsPlaying(!isPlaying);
  };

  const handleChordGridLeftArrowPress = () => {
    if (chordGridPage > 0) {
      setChordGridPage(prev => prev - 1);
    }
  };

  const handleChordGridRightArrowPress = () => {
    if (chordGridPage < 1) {
      setChordGridPage(prev => prev + 1);
    }
  };

  const handleSequenceLeftArrowPress = () => {
    if (sequencePage > 0) {
      setSequencePage(prev => prev - 1);
    }
  };

  const handleSequenceRightArrowPress = () => {
    if (sequencePage < 1) {
      setSequencePage(prev => prev + 1);
    }
  };

  // Add missing render functions
  const renderSettings = () => {
    return (
      <View>
        {/* Settings content */}
      </View>
    );
  };

  const renderStepSequencer = () => {
    console.log('Rendering step sequencer'); // Debug log
    const stepsPerRow = 8;
    const totalRows = 4;

    const renderStepButton = (index: number) => {
      console.log('Rendering step button:', index);
      const step = stepSequencer.steps[index];
      const isCurrentStep = stepSequencer.currentStep === index;
      const isOccupied = step?.isOccupied;

      const handlePress = () => {
        console.log('Step button pressed:', index);
        console.log('Current lastPlayedChord:', lastPlayedChord);
        handleStepPress(index);
      };

      return (
        <TouchableOpacity
          key={`step-${index}`}
          style={[
            styles.stepButton,
            isCurrentStep && styles.stepButtonActive,
            isOccupied && styles.stepButtonOccupied
          ]}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <Text style={styles.stepButtonText}>
            {step ? step.root + getChordDisplayName(step.type) : ''}
          </Text>
        </TouchableOpacity>
      );
    };

    const rows = Array.from({ length: totalRows }).map((_, rowIndex) => {
      const startIndex = rowIndex * stepsPerRow;
      return (
        <View key={`row-${rowIndex}`} style={styles.stepRow}>
          {Array.from({ length: stepsPerRow }).map((_, colIndex) => {
            const stepIndex = startIndex + colIndex;
            return renderStepButton(stepIndex);
          })}
        </View>
      );
    });

    return (
      <View style={styles.stepSequencerContainer}>
        {rows}
      </View>
    );
  };

  // Add missing state variables
  const [selectedProgressionIndex, setSelectedProgressionIndex] = useState<number | null>(null);

  // Add missing handlers for chord operations
  const handleCopyChord = (index: number) => {
    const chord = savedChords[index];
    if (chord) {
      setCopiedChord(chord);
    }
  };

  const handlePasteChord = (index: number) => {
    if (copiedChord) {
      storeSaveChord(copiedChord, index);
    }
  };

  // Fix empty chord handling
  const handleClearChord = (index: number) => {
    const emptyChord: Chord = {
      id: `empty-${Date.now()}`,
      root: 'C',
      type: 'major',
      notes: [],
      duration: 200
    };
    storeSaveChord(emptyChord, index);
  };

  // Fix SavedChordButton chord prop type
  const renderSavedProgressionButtons = () => {
    return Array.from({ length: 8 }).map((_, index) => {
      const progressionIndex = savedChordPage * 8 + index;
      const progression = savedProgressions[progressionIndex];
      const isActive = activeSavedProgressionIndex === progressionIndex;
      const isCurrentlyPlaying = currentlyPlayingProgression === progressionIndex;
      
      return (
        <SavedChordButton
          key={`saved-progression-${progressionIndex}`}
          label={`${progressionIndex + 1}`}
          color={progression ? colors.primary : colors.buttonGrey}
          onPress={() => handleSavedProgressionPress(progressionIndex)}
          onPressOut={handleSavedProgressionRelease}
          onLongPress={() => handleSaveCurrentProgression(progressionIndex)}
          index={progressionIndex + 1}
          chord={null}
          saveMode={deleteMode}
          isHighlighted={isActive || isCurrentlyPlaying}
          isCurrentlyPlaying={isCurrentlyPlaying}
        />
      );
    });
  };

  // Add missing handlers for progression buttons
  const handleSavedProgressionPress = (index: number) => {
    if (deleteMode) {
      setSelectedProgressionIndex(index);
      setEditModalVisible(true);
      return;
    }

    const progression = savedProgressions[index];
    if (progression) {
      setStepSequencer(prev => ({
        ...prev,
        steps: [...progression.steps]
      }));
      setSettings(progression.settings);
      setActiveSavedProgressionIndex(index);
      setCurrentlyPlayingProgression(index);
    }
  };

  const handleSavedProgressionRelease = () => {
    setActiveSavedProgressionIndex(null);
  };

  const handleSaveCurrentProgression = (index: number) => {
    if (deleteMode) {
      // Delete the progression
      const newProgressions = [...savedProgressions];
      newProgressions[index] = null;
      setSavedProgressions(newProgressions);
      return;
    }

    // Save current progression
    const currentProgression: SavedProgression = {
      steps: [...stepSequencer.steps],
      settings: { ...settings }
    };
    
    const newProgressions = [...savedProgressions];
    newProgressions[index] = currentProgression;
    setSavedProgressions(newProgressions);
  };

  // Add EditModal component
  const EditModal = () => (
    <Modal
      visible={editModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        setEditModalVisible(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Chord</Text>
          <View style={styles.modalButtons}>
            <Pressable 
              style={styles.modalButton}
              onPress={() => {
                if (selectedChordIndex !== null) {
                  handleClearChord(selectedChordIndex);
                  setEditModalVisible(false);
                }
              }}
            >
              <Text style={styles.modalButtonText}>Clear</Text>
            </Pressable>
            <Pressable 
              style={styles.modalButton}
              onPress={() => {
                if (selectedChordIndex !== null) {
                  if (copiedChord) {
                    handlePasteChord(selectedChordIndex);
                  } else {
                    handleCopyChord(selectedChordIndex);
                  }
                  setEditModalVisible(false);
                }
              }}
            >
              <Text style={styles.modalButtonText}>{copiedChord ? 'Paste' : 'Copy'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Update handleEditModalAction to handle empty chord case
  const handleEditModalAction = (action: 'delete' | 'copy' | 'paste') => {
    if (!selectedChordIndex) return;

    if (action === 'delete') {
      storeSaveChord(null, selectedChordIndex);
    } else if (action === 'copy' && savedChords[selectedChordIndex]) {
      setCopiedChord(savedChords[selectedChordIndex]!);
    } else if (action === 'paste' && copiedChord) {
      storeSaveChord(copiedChord, selectedChordIndex);
    }

    setEditModalVisible(false);
    setSelectedChordIndex(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <NavigationMenu visible={menuVisible} onClose={toggleMenu} currentRoute={pathname} />
      
      {/* Test Button */}
      <TouchableOpacity
        style={[styles.testButton]}
        onPress={() => {
          console.log('Test button pressed');
          console.log('Current lastPlayedChord:', lastPlayedChord);
          handleStepPress(0);
        }}
      >
        <Text style={styles.stepButtonText}>TEST BUTTON</Text>
      </TouchableOpacity>

      <Pressable style={styles.eyeButton} onPress={toggleMenu}>
        <Eye color={colors.text} size={24} />
      </Pressable>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.leftContent}>
          {/* Saved Chords Grid */}
          {renderSavedChordsGrid()}
        </View>
        
        <View style={styles.rightContent}>
          {/* Settings Buttons */}
          <View style={styles.settingsContainer}>
            {renderSettings()}
          </View>
          
          {/* Step Sequencer Grid */}
          <View style={styles.sequencerContainer}>
            {renderStepSequencer()}
          </View>
        </View>
      </View>

      {/* Plus/Minus buttons at right */}
      <View style={styles.plusMinusContainer}>
        <Pressable 
          style={styles.plusButton}
          onPress={() => handleSettingAdjust('up')}
        >
          <Text style={styles.plusMinusText}>+</Text>
        </Pressable>
        
        <Pressable 
          style={styles.minusButton}
          onPress={() => handleSettingAdjust('down')}
        >
          <Text style={styles.plusMinusText}>-</Text>
        </Pressable>
      </View>

      {/* Bottom row with save, navigation, and edit buttons */}
      <View style={styles.bottomControls}>
        {/* Delete button */}
        <Pressable 
          style={[styles.saveButton, deleteMode && styles.saveButtonActive]}
          onPress={handleDeletePress}
        >
          <Text style={styles.saveButtonText}>D</Text>
        </Pressable>

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
        
        {/* Saved progression buttons */}
        <View style={styles.savedChordButtonsContainer}>
          {renderSavedProgressionButtons()}
        </View>

        {/* Right arrow button */}
        <Pressable 
          style={styles.savedChordNavButtonRight}
          onPress={() => handleSavedChordPageChange('next')}
          disabled={savedChordPage >= 1}
        >
          <View style={[styles.arrowCircle, savedChordPage >= 1 && styles.arrowCircleDisabled]}>
            <Play 
              size={16} 
              color={savedChordPage >= 1 ? colors.textMuted : colors.textOffWhite}
              fill={savedChordPage >= 1 ? colors.textMuted : colors.textOffWhite}
            />
          </View>
        </Pressable>
      </View>

      {/* Navigation Menu */}
      <NavigationMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
        currentRoute={pathname}
      />
      <EditModal />
    </SafeAreaView>
  );
}

// Add styles definition
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  leftContent: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  rightContent: {
    flex: 1,
  },
  savedChordsContainer: {
    padding: 16,
  },
  playButtonContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonActive: {
    backgroundColor: colors.primary,
  },
  savedChordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  buttonContainer: {
    width: '23%',
    aspectRatio: 1,
    marginBottom: 8,
  },
  chordGridControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  chordGridNavButton: {
    padding: 8,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowCircleDisabled: {
    opacity: 0.5,
  },
  settingsContainer: {
    padding: 16,
  },
  sequencerContainer: {
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    margin: 8,
  },
  plusMinusContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -48 }],
  },
  plusButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  minusButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusMinusText: {
    color: colors.text,
    fontSize: 24,
  },
  bottomControls: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  saveButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  saveButtonActive: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 18,
  },
  savedChordNavButton: {
    padding: 8,
  },
  savedChordNavButtonRight: {
    padding: 8,
  },
  savedChordButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  eyeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    padding: 24,
    borderRadius: 16,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    backgroundColor: colors.buttonGrey,
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.text,
    fontSize: 16,
  },
  sectionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  selectedSection: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  savedSection: {
    backgroundColor: colors.primary,
  },
  playingSection: {
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  sectionButtonText: {
    color: colors.text,
    fontSize: 16,
  },
  savedSectionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  navigationArrowLeft: {
    marginRight: 16,
  },
  navigationArrowRight: {
    marginLeft: 16,
  },
  prevArrow: {
    transform: [{ rotate: '180deg' }],
  },
  stepSequencerContainer: {
    padding: 16,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  stepButtonActive: {
    backgroundColor: colors.primary,
  },
  stepButtonOccupied: {
    borderWidth: 2,
    borderColor: '#800080', // Purple border for occupied steps
  },
  stepButtonText: {
    color: colors.textOffWhite,
    fontSize: 12,
  },
  testButton: {
    width: 100,
    height: 48,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
    borderRadius: 8,
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 1000,
  },
});