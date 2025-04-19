import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, SafeAreaView, Pressable, Platform, Modal } from "react-native";
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
  const [selectedChordIndex, setSelectedChordIndex] = useState<number | null>(null);
  const [copiedChord, setCopiedChord] = useState<Chord | null>(null);

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
                  onPress={() => handleSavedChordPress(actualIndex)}
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
            style={styles.navigationControlButton}
            onPress={handleChordGridLeftArrowPress}
            disabled={chordGridPage === 0}
          >
            <View style={[styles.navigationControlButton, chordGridPage === 0 && styles.navigationControlButtonDisabled]}>
              <Play 
                size={16} 
                color={chordGridPage === 0 ? colors.textMuted : colors.textOffWhite}
                style={{ transform: [{ rotate: '180deg' }] }}
                fill={chordGridPage === 0 ? colors.textMuted : colors.textOffWhite}
              />
            </View>
          </Pressable>
          <Pressable 
            style={styles.navigationControlButton}
            onPress={handleChordGridRightArrowPress}
            disabled={chordGridPage >= 1}
          >
            <View style={[styles.navigationControlButton, chordGridPage >= 1 && styles.navigationControlButtonDisabled]}>
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

  // Modify handleNotePress to track chord duration
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
      
      setCurrentChord(chord);
      setLastPlayedChord(chord); // Store as last played chord
      playChord(chord.notes);
      
      // Record start time for duration tracking
      chordStartTimeRef.current = Date.now();
      
      // Set temporary highlighted chord for visualization
      setTempHighlightedChord(chord);
    } else {
      // Just play the single note
      playChord([midiNote]);
      // Clear current chord when just playing a single note
      setCurrentChord(null);
      setTempHighlightedChord(null);
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
    if (selectedChordIndex !== null) {
      setSelectedChordIndex(index);
      return;
    }

    // Existing step press logic
    if (activeSavedChordIndex !== null) {
      const chord = savedChords[activeSavedChordIndex];
      if (chord) {
        const updatedSteps = [...stepSequencer.steps];
        updatedSteps[index] = {
          ...chord,
          duration: 200 // Default duration
        };
        setStepSequencer(prev => ({
          ...prev,
          steps: updatedSteps
        }));
      }
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
      playChord(updatedChord.notes);
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
          playChord(updatedChord.notes);
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
    if (selectedChordIndex !== null) {
      setSelectedChordIndex(index);
      return;
    }

    setActiveSavedChordIndex(index);
    const chord = savedChords[index];
    if (chord) {
      playChord(chord.notes);
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

  // Update the chord type handling
  const getSavedChordColor = (index: number) => {
    const chord = savedChords[index];
    if (!chord) return colors.buttonGrey;

    const chordTypeColors: Record<string, string> = {
      'major': colors.chord.major,
      'major7': colors.chord.major7,
      'major9': colors.chord.major9,
      '7': colors.chord['7'],
      'minor': colors.chord.minor,
      'minor7': colors.chord.minor7,
      'minor9': colors.chord.minor9,
      '9': colors.chord['9'],
      'sus2': colors.chord.sus2,
      'sus4': colors.chord.sus4,
      'dim': colors.chord.dim,
      'dim7': colors.chord.dim7,
      'm11': colors.chord.m11,
      'm7b5': colors.chord.m7b5,
      'add9': colors.chord.add9,
      'user': colors.chord.user,
      'augmented': colors.chord.augmented,
      '11': colors.chord['11']
    };

    return chordTypeColors[chord.type] || colors.buttonGrey;
  };

  // Update the chord display name function
  const getChordDisplayName = () => {
    const chordToDisplay = isPlaying && stepSequencer.steps[currentStep] 
      ? stepSequencer.steps[currentStep] 
      : currentChord;
    
    if (!chordToDisplay) return '';
    
    let displayName = chordToDisplay.root;
    
    switch (chordToDisplay.type) {
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
      case '6': displayName += '6'; break;
      case 'user': displayName += 'user'; break;
      default: break;
    }
    
    if (chordToDisplay.bassNote && chordToDisplay.bassNote !== chordToDisplay.root) {
      displayName += `/${chordToDisplay.bassNote}`;
    }
    
    return displayName;
  };

  const renderSettings = () => {
    return (
      <View style={styles.settingsButtons}>
        <Pressable 
          style={[styles.settingsButton, selectedSetting === 'bpm' && styles.settingsButtonActive]}
          onPress={() => handleSettingSelect('bpm')}
        >
          <Text style={styles.settingsButtonName}>BPM</Text>
          <Text style={styles.settingsButtonValue}>{settings.bpm}</Text>
        </Pressable>
        <Pressable 
          style={[styles.settingsButton, selectedSetting === 'timeSignature' && styles.settingsButtonActive]}
          onPress={() => handleSettingSelect('timeSignature')}
        >
          <Text style={styles.settingsButtonName}>TS</Text>
          <Text style={styles.settingsButtonValue}>{settings.timeSignature}</Text>
        </Pressable>
        <Pressable 
          style={[styles.settingsButton, selectedSetting === 'click' && styles.settingsButtonActive]}
          onPress={() => handleSettingSelect('click')}
        >
          <Text style={styles.settingsButtonName}>CLICK</Text>
          <Text style={styles.settingsButtonValue}>{settings.click ? 'On' : 'Off'}</Text>
        </Pressable>
        <Pressable 
          style={[styles.settingsButton, selectedSetting === 'bars' && styles.settingsButtonActive]}
          onPress={() => handleSettingSelect('bars')}
        >
          <Text style={styles.settingsButtonName}>BARS</Text>
          <Text style={styles.settingsButtonValue}>{settings.bars}</Text>
        </Pressable>
        <Pressable 
          style={styles.settingsButton}
        >
          <Text style={styles.settingsButtonName}>CHORD</Text>
          <Text style={styles.settingsButtonValue}>{getChordDisplayName()}</Text>
        </Pressable>
      </View>
    );
  };

  // Add state for all pagination
  const [chordGridPage, setChordGridPage] = useState(0);
  const [seqGridPage, setSeqGridPage] = useState(0);
  const [sequencePage, setSequencePage] = useState(0);

  // Handle chord grid page change
  const handleChordGridLeftArrowPress = () => {
    setChordGridPage(0); // Show chords 1-16
  };

  const handleChordGridRightArrowPress = () => {
    setChordGridPage(1); // Show chords 17-32
  };

  // Handle sequencer page change
  const handleSeqLeftArrowPress = () => {
    setSeqGridPage(0); // Show steps 1-32
  };

  const handleSeqRightArrowPress = () => {
    setSeqGridPage(1); // Show steps 33-64
  };

  // Handle sequence page change
  const handleSequenceLeftArrowPress = () => {
    setSequencePage(0); // Show sequences 1-8
  };

  const handleSequenceRightArrowPress = () => {
    setSequencePage(1); // Show sequences 9-16
  };

  // Modify the step button rendering to show current step
  const renderStepButton = (index: number) => {
    const chord = stepSequencer.steps[index];
    const isActive = currentStep === index;
    const isHighlighted = activeSavedChordIndex !== null && savedChords[activeSavedChordIndex] !== null;

    return (
      <Pressable
        key={index}
        style={[
          styles.stepButton,
          chord && styles.stepButtonActive,
          isHighlighted && styles.stepButtonHighlighted,
          selectedChordIndex !== null && styles.stepButtonEditMode
        ]}
        onPress={() => handleStepPress(index)}
      >
        <Text style={[
          styles.stepText,
          isActive ? styles.stepTextActive : styles.stepTextInactive
        ]}>
          {index + 1}
        </Text>
        {selectedChordIndex !== null && chord && (
          <View style={styles.editOverlay}>
            <Text style={styles.editOverlayText}>E</Text>
          </View>
        )}
      </Pressable>
    );
  };

  // Remove the problematic continuous adjustment code
  const [isHoldingButton, setIsHoldingButton] = useState(false);
  const buttonIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePlayPress = async () => {
    try {
      if (!isPlaying) {
        // Start playback
        setIsPlaying(true);
        setCurrentStep(0);
        
        // Start sequencer timer
        sequencerTimerRef.current = setInterval(() => {
          setCurrentStep(prev => {
            const nextStep = (prev + 1) % 16;
            if (nextStep === 0) {
              setIsPlaying(false);
              if (sequencerTimerRef.current) {
                clearInterval(sequencerTimerRef.current);
              }
            }
            return nextStep;
          });
        }, 60000 / settings.bpm); // Convert BPM to milliseconds
      } else {
        // Stop playback
        setIsPlaying(false);
        setCurrentStep(0);
        if (sequencerTimerRef.current) {
          clearInterval(sequencerTimerRef.current);
        }
        void stopAllSounds();
      }
    } catch (error) {
      console.error('Error handling play press:', error);
      setIsPlaying(false);
      setCurrentStep(0);
      if (sequencerTimerRef.current) {
        clearInterval(sequencerTimerRef.current);
      }
    }
  };

  // Update the renderStepSequencer function to remove the play button from here
  const renderStepSequencer = () => {
    const stepsPerRow = 8;
    const totalRows = 4;
    const rows = Array.from({ length: totalRows }).map((_, rowIndex) => {
      const startIndex = rowIndex * stepsPerRow + (seqGridPage * 32);
      return (
        <View key={rowIndex} style={styles.stepSequencerRow}>
          {Array.from({ length: stepsPerRow }).map((_, colIndex) => {
            const stepIndex = startIndex + colIndex;
            return renderStepButton(stepIndex);
          })}
        </View>
      );
    });

    return (
      <View style={styles.stepSequencerContainer}>
        <View style={styles.stepSequencerGrid}>
          {rows}
        </View>
        <View style={styles.seqGridControls}>
          <Pressable
            style={[styles.navigationControlButton, seqGridPage === 0 && styles.navigationControlButtonDisabled]}
            onPress={handleSeqLeftArrowPress}
            disabled={seqGridPage === 0}
          >
            <Play 
              size={16} 
              color={seqGridPage === 0 ? colors.textMuted : colors.textOffWhite}
              style={{ transform: [{ rotate: '180deg' }] }}
              fill={seqGridPage === 0 ? colors.textMuted : colors.textOffWhite}
            />
          </Pressable>
          <Pressable
            style={[styles.navigationControlButton, seqGridPage === 1 && styles.navigationControlButtonDisabled]}
            onPress={handleSeqRightArrowPress}
            disabled={seqGridPage === 1}
          >
            <Play 
              size={16} 
              color={seqGridPage === 1 ? colors.textMuted : colors.textOffWhite}
              fill={seqGridPage === 1 ? colors.textMuted : colors.textOffWhite}
            />
          </Pressable>
        </View>
      </View>
    );
  };

  // Add play button styles
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 10,
    },
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
      zIndex: 10,
    },
    mainContent: {
      flex: 1,
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginTop: 50,  // Reduced from 70
      marginLeft: 50,
    },
    leftContent: {
      width: 300,
      marginLeft: -34,
      marginTop: 5,
      position: 'absolute',
      left: -20,
    },
    rightContent: {
      flex: 1,
      marginLeft: 236,
      position: 'relative',
    },
    settingsContainer: {
      marginBottom: 16,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      position: 'absolute',
      top: -45,  // Reduced from -55
      left: 0,
      right: 0,
    },
    savedChordsContainer: {
      width: 300,
      marginLeft: -4,
      marginTop: 0,
    },
    playButtonContainer: {
      width: '100%',
      alignItems: 'center',
      position: 'absolute',
      top: -50,  // Reduced from -60
      left: 50,
      right: 0,
      zIndex: 1,
    },
    savedChordsGrid: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginLeft: -10,
    },
    buttonContainer: {
      alignItems: 'center',
      gap: 8,
    },
    savedChordButton: {
      width: 68,
      height: 48,
      backgroundColor: colors.buttonGrey,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    buttonNumber: {
      position: 'absolute',
      top: 4,
      left: 4,
      color: colors.text,
      fontSize: 12,
    },
    savedChordText: {
      color: colors.text,
      fontSize: 16,
    },
    sequencerContainer: {
      flex: 1,
      marginTop: 15,
      width: '100%',
    },
    stepSequencerContainer: {
      flex: 1,
      marginTop: 15,  // Changed from 5 to 15
      width: '100%',
      position: 'relative',
      zIndex: 1,
    },
    stepSequencerGrid: {
      flexDirection: 'column',
      gap: 3,
      width: 328,
      marginLeft: 'auto',
      marginRight: 'auto',
      transform: [{ translateX: 3 }],
      marginTop: -10,  // Added to reduce top spacing
    },
    stepSequencerRow: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      marginBottom: 18,
    },
    stepButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.buttonGrey,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepButtonActive: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    stepText: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    stepTextActive: {
      color: '#FFFFFF', // White for current step
    },
    stepTextInactive: {
      color: 'rgba(255, 255, 255, 0.5)', // Dimmed white for inactive steps
    },
    adjustButtonsContainer: {
      position: 'absolute',
      right: 16,
      top: '50%',
      transform: [{ translateY: -50 }],
      width: 36, // Match the width from Chord Compose page
      gap: 8,
    },
    adjustButton: {
      width: 36, // Match the width from Chord Compose page
      height: 36, // Match the height from Chord Compose page
      backgroundColor: colors.buttonGrey,
      borderRadius: 18, // Make it circular like in Chord Compose
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    adjustButtonText: {
      color: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
    },
    bottomControls: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 8,
      position: 'absolute',
      bottom: 23, // Changed from 33 to 23 (raised by 10 pixels)
      left: 10,
      right: 0,
    },
    deleteButton: {
      width: 24,
      height: 45,
      backgroundColor: colors.buttonGrey,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      bottom: -36, // Changed from -51 to -36 (moved up by 15 pixels to match)
      left: 2,
    },
    deleteActive: {
      backgroundColor: colors.error,
    },
    deleteButtonText: {
      color: '#8B0000',  // DarkRed
      fontSize: 14,
      fontWeight: 'bold',
      transform: [{ rotate: '90deg' }]
    },
    savedSectionsContainer: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      marginTop: 0,
    },
    sectionButton: {
      width: 58,
      height: 24,
      backgroundColor: colors.buttonGrey,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedSection: {
      backgroundColor: colors.primary,
    },
    sectionButtonText: {
      color: colors.text,
      fontSize: 12,
    },
    settingsButtons: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      width: '100%',
    },
    settingsButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.background,
      borderRadius: 8,
      alignItems: 'center',
    },
    settingsButtonActive: {
      backgroundColor: colors.surfaceLight,
    },
    settingsButtonName: {
      color: colors.text,
      fontSize: 12,
      marginBottom: 4,
    },
    settingsButtonValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: 'bold',
    },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    arrowButtonsContainer: {
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 20,
      marginTop: 18,
      position: 'absolute',
      right: -20,
      top: '50%',
      transform: [{ translateY: -50 }],
    },
    baseGridControls: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 25,
      position: 'absolute',
      right: -16,
      top: '50%',
      transform: [{ translateY: -53 }],
      zIndex: 2,
    },
    chordGridControls: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 25,
      position: 'absolute',
      right: -30,
      top: '60%',
      transform: [{ translateY: -53 }],
    },
    seqGridControls: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 25,
      position: 'absolute',
      right: -16,
      top: '50%',
      transform: [{ translateY: -53 }],
      zIndex: 2,
    },
    arrowCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.buttonGrey,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    arrowCircleDisabled: {
      backgroundColor: colors.surfaceLight,
    },
    prevArrow: {
      transform: [{ rotate: '180deg' }],
      marginLeft: -2,
    },
    nextArrow: {
      marginRight: -17,
      transform: [{ rotate: '180deg' }]
    },
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
      color: colors.textOffWhite,
      fontSize: 24,
      fontWeight: 'bold',
    },
    currentStep: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    disabledButton: {
      backgroundColor: colors.textMuted,
    },
    savedSection: {
      backgroundColor: colors.primary,
      opacity: 0.8,
    },
    transportButtonPressed: {
      backgroundColor: colors.buttonPressed,
    },
    transportButtonActive: {
      backgroundColor: colors.buttonActive,
    },
    transportButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: 'bold',
    },
    playingSection: {
      borderWidth: 2,
      borderColor: '#FFD700', // Yellow color
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
      backgroundColor: colors.buttonActive,
    },
    stepButtonEditMode: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    editOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: colors.primary,
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editOverlayText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: 'bold',
    },
    stepButtonHighlighted: {
      borderColor: colors.primary,
    },
    stepButtonCurrent: {
      borderWidth: 2,
      borderColor: '#FFFFFF',
      backgroundColor: colors.buttonGrey, // Ensure background stays consistent
    },
    savedChordButtonEmpty: {
      backgroundColor: '#e0e0e0',
      borderColor: '#b0b0b0',
    },
    savedChordButtonTextEmpty: {
      color: '#808080',
    },
    settingsGrid: {
      marginBottom: 16,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    settingButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surfaceLight,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    selectedSetting: {
      backgroundColor: colors.primary,
    },
    settingLabel: {
      color: colors.text,
      fontSize: 12,
      marginBottom: 4,
    },
    settingValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: 'bold',
    },
    saveButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.buttonGrey,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 4,  // Add padding to move dots down
      marginLeft: 0,  // Remove left margin to align with other buttons
      marginRight: 0,  // Remove right margin to align with other buttons
    },
    saveButtonActive: {
      backgroundColor: colors.error,
    },
    saveButtonText: {
      color: '#8B0000',  // DarkRed
      fontSize: 28,  // Increased from 20 to 28
      fontWeight: '900',  // Changed from 'bold' to '900' for extra boldness
    },
    savedChordNavButton: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    savedChordNavButtonRight: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    savedChordButtonsContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.background,
      padding: 20,
      borderRadius: 10,
      width: '80%',
      maxWidth: 400,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    modalButton: {
      padding: 10,
      borderRadius: 5,
      backgroundColor: colors.buttonGrey,
      minWidth: 100,
      alignItems: 'center',
    },
    modalButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold',
    },
    editButtonContainer: undefined,
    editButton: undefined,
    editButtonText: undefined,
    navigationControlButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.buttonGrey,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    navigationControlButtonDisabled: {
      backgroundColor: colors.surfaceLight,
    },
    navigationArrowLeft: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    navigationArrowRight: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingTop: 10,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
  });

  // Add new state for play button
  const { deleteProgression } = useProgressionStore();
  const [selectedProgression, setSelectedProgression] = useState<Progression | null>(null);

  // Update the section button rendering to show yellow border when playing
  const renderSectionButton = (index: number) => {
    const section = savedSections[index];
    const isPlaying = currentlyPlayingSequence === index;
    
    return (
      <Pressable
        key={`section-${index}`}
        style={[
          styles.sectionButton,
          selectedSection === index && styles.selectedSection,
          section && styles.savedSection,
          isPlaying && styles.playingSection
        ]}
        onPress={() => handleSectionPress(index)}
      >
        <Text style={styles.sectionButtonText}>
          {index + 1}
        </Text>
      </Pressable>
    );
  };

  // Update the saved sections container to use the new render function
  const renderSavedSections = () => (
    <View style={[styles.savedSectionsContainer, { marginLeft: 30 }]}>
      <Pressable 
        style={styles.navigationArrowLeft}
        onPress={handleSequenceLeftArrowPress}
        disabled={sequencePage === 0}
      >
        <View style={[styles.navigationControlButton, sequencePage === 0 && styles.navigationControlButtonDisabled]}>
          <Play 
            size={16} 
            color={sequencePage === 0 ? colors.textMuted : colors.textOffWhite}
            style={styles.prevArrow}
            fill={sequencePage === 0 ? colors.textMuted : colors.textOffWhite}
          />
        </View>
      </Pressable>
      {Array.from({ length: 8 }).map((_, index) => {
        const actualIndex = index + (sequencePage * 8);
        return renderSectionButton(actualIndex);
      })}
      <Pressable 
        style={styles.navigationArrowRight}
        onPress={handleSequenceRightArrowPress}
        disabled={sequencePage === 1}
      >
        <View style={[styles.navigationControlButton, sequencePage === 1 && styles.navigationControlButtonDisabled]}>
          <Play 
            size={16} 
            color={sequencePage === 1 ? colors.textMuted : colors.textOffWhite}
            fill={sequencePage === 1 ? colors.textMuted : colors.textOffWhite}
          />
        </View>
      </Pressable>
    </View>
  );

  // Handle play/pause
  const handlePlayPause = () => {
    if (isPlaying) {
      void stopAllSounds();
    } else {
      void playClick(0);
    }
    setIsPlaying(!isPlaying);
  };

  // Add these state variables for progression buttons
  const [savedProgressions, setSavedProgressions] = useState<(SavedProgression | null)[]>([]);
  const [activeSavedProgressionIndex, setActiveSavedProgressionIndex] = useState<number | null>(null);

  // Handler for saving current progression
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

  // Handler for loading saved progression
  const handleSavedProgressionPress = (index: number) => {
    if (selectedChordIndex !== null) {
      setSelectedChordIndex(index);
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

  // Handler for progression release
  const handleSavedProgressionRelease = () => {
    setActiveSavedProgressionIndex(null);
  };

  // Add state for currently playing progression
  const [currentlyPlayingProgression, setCurrentlyPlayingProgression] = useState<number | null>(null);

  // Add state for edit modal
  const [selectedProgressionIndex, setSelectedProgressionIndex] = useState<number | null>(null);

  // Add the function for handling saved chord page navigation
  const handleSavedChordPageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && savedChordPage > 0) {
      setSavedChordPage(prev => prev - 1);
    } else if (direction === 'next' && savedChordPage < 1) {
      setSavedChordPage(prev => prev + 1);
    }
  };

  // Add edit mode toggle handler
  const handleEditPress = () => {
    setEditModalVisible(true);
  };

  // Add edit mode state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [copiedProgression, setCopiedProgression] = useState<SavedProgression | null>(null);

  // Add handlers for EditModal actions
  const handleClear = () => {
    if (selectedProgressionIndex !== null) {
      const newProgressions = [...savedProgressions];
      newProgressions[selectedProgressionIndex] = null;
      setSavedProgressions(newProgressions);
      setEditModalVisible(false);
    }
  };

  const handleCopyPaste = () => {
    if (selectedProgressionIndex !== null) {
      const progression = savedProgressions[selectedProgressionIndex];
      if (copiedProgression && !progression) {
        // Paste the copied progression if we have one and the slot is empty
        const newProgressions = [...savedProgressions];
        newProgressions[selectedProgressionIndex] = { ...copiedProgression };
        setSavedProgressions(newProgressions);
      } else if (progression) {
        // Copy the progression if the slot has one
        setCopiedProgression({ ...progression });
      }
      setEditModalVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Top Bar with Eye button */}
      <View style={styles.topBar}>
        <Pressable style={styles.eyeButton} onPress={toggleMenu}>
          <Eye color={colors.text} size={24} />
        </Pressable>
      </View>

      <NavigationMenu visible={menuVisible} onClose={toggleMenu} currentRoute={pathname} />
      
      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Left Content - Saved Chords */}
        <View style={styles.leftContent}>
          {renderSavedChordsGrid()}
        </View>

        {/* Right Content - Step Sequencer and Settings */}
        <View style={styles.rightContent}>
          {/* Settings */}
          <View style={styles.settingsContainer}>
            {renderSettings()}
          </View>

          {/* Step Sequencer */}
          {renderStepSequencer()}

          {/* Saved Sections */}
          {renderSavedSections()}
        </View>
      </View>
    </SafeAreaView>
  );
}