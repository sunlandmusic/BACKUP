import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, SafeAreaView, Pressable, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/colors";
import { Eye, Play, Square, ChevronLeft, ChevronRight } from "lucide-react-native";
import { NavigationMenu } from "@/components/NavigationMenu";
import { usePathname } from "expo-router";
import { useChordStore } from "@/stores/chord-store";
import { Chord, ChordType, NoteName, noteNames, Progression } from "@/types/music";
import { playChord, stopChord, initAudio, setBpm } from "@/utils/audio-utils";
import { createChord, getScaleNotes } from "@/utils/chord-utils";
import { HorizontalPiano } from "@/components/HorizontalPiano";
import { SavedChordButton } from "@/components/SavedChordButton";
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Tone from 'tone';
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

export default function ProgressionsScreen() {
  const { 
    currentKey, 
    currentMode, 
    currentInstrument, 
    currentFlamValue,
    isPlaying,
    setCurrentInstrument,
    setCurrentFlamValue,
    setIsPlaying
  } = useChordStore();

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
                  chord={savedChords[actualIndex]}
                  saveMode={saveMode}
                  isHighlighted={activeSavedChordIndex === actualIndex}
                />
              </View>
            );
          })}
        </View>
        <View style={styles.arrowButtonsContainer}>
          <Pressable 
            style={styles.arrowButton}
            onPress={handleChordGridLeftArrowPress}
            disabled={chordGridPage === 0}
          >
            <View style={[styles.arrowCircle, chordGridPage === 0 && styles.arrowCircleDisabled]}>
              <Play 
                size={16} 
                color={chordGridPage === 0 ? colors.textMuted : colors.textOffWhite}
                style={styles.prevArrow}
                fill={chordGridPage === 0 ? colors.textMuted : colors.textOffWhite}
              />
            </View>
          </Pressable>
          <Pressable 
            style={styles.arrowButton}
            onPress={handleChordGridRightArrowPress}
            disabled={chordGridPage === 1}
          >
            <View style={[styles.arrowCircle, chordGridPage === 1 && styles.arrowCircleDisabled]}>
              <Play 
                size={16} 
                color={chordGridPage === 1 ? colors.textMuted : colors.textOffWhite}
                fill={chordGridPage === 1 ? colors.textMuted : colors.textOffWhite}
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
    savedChords,
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
      try {
        // Initialize audio system
        await initAudio();
        
        // Initialize Tone.js
        if (Tone.context.state !== 'running') {
          await Tone.start();
        }
        
        // Create audio context for click sound
        if (Platform.OS === 'web') {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          
          // Create gain node
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 0.3;
          gainNode.connect(audioContext.destination);
          clickGainRef.current = gainNode;
        }
        
        console.log('[Audio] Audio system initialized successfully');
      } catch (error) {
        console.error('Error initializing audio:', error);
        alert('Error initializing audio system. Please try again.');
      }
    };
    
    setupAudio();

    return () => {
      if (clickOscillatorRef.current) {
        clickOscillatorRef.current.stop();
      }
      stopChord();
      Tone.Transport.stop();
    };
  }, []);

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
        playClick(0);
      }

      sequencerTimerRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = (prev + 1) % totalStepsInLoop;
          
          // Play click on every 2nd step (half time)
          if (settings.click && nextStep % 2 === 0) {
            playClick(nextStep);
          }

          // Play the chord stored at this step if it exists
          const chord = stepSequencer.steps[nextStep];
          if (chord) {
            stopChord();
            playChord(chord.notes);
            // Stop the chord after its stored duration
            setTimeout(() => {
              stopChord();
            }, chord.duration || 200);
          } else {
            stopChord();
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
      stopChord();
      // Don't clear the currently playing sequence here
    };
  }, [isPlaying, settings.bpm, settings.click, settings.bars, stepSequencer.steps]);

  const handleSettingSelect = (setting: keyof SettingsState) => {
    setSelectedSetting(setting);
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
    if (deleteMode) {
      // Delete the step
      const updatedSteps = [...stepSequencer.steps];
      updatedSteps[index] = null;
      setStepSequencer(prev => ({
        ...prev,
        steps: updatedSteps
      }));
      return;
    }

    // Existing step press logic
    if (activeSavedChordIndex !== null) {
      const chord = savedChords[activeSavedChordIndex];
      if (chord) {
        const updatedSteps = [...stepSequencer.steps];
        updatedSteps[index] = {
          root: chord.root,
          type: chord.type,
          notes: chord.notes,
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
  
  // Handle chord type button press
  const handleChordTypePress = (type: ChordType, label: string, bassOffset?: number) => {
    // Stop any currently playing sounds
    Tone.Transport.stop();
    
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
    if (deleteMode) {
      // Delete the saved chord by creating an empty chord
      const emptyChord = createChord('C', 'major');
      emptyChord.notes = []; // Empty notes array to indicate no chord
      saveChord(emptyChord, index);
      return;
    }

    // Existing saved chord press logic
    setActiveSavedChordIndex(index);
    const chord = savedChords[index];
    if (chord) {
      playChord(chord.notes);
    }
  };

  // Handle saved chord release - immediately stop sound and clear highlight
  const handleSavedChordRelease = () => {
    Tone.Transport.stop();
    
    // Clear the current chord when releasing the button
    setCurrentChord(null);
  };

  // Handle saving current chord
  const handleSaveCurrentChord = (index: number) => {
    // Use either the current chord or the last played chord, whichever is available
    const chordToSave = currentChord || lastPlayedChord;
    
    if (!chordToSave || index >= maxSavedChords) return;
    
    // Save the chord to the grid
    saveChord(chordToSave, index);

    // Create a new progression and save it
    createNewProgression(currentKey);
    addChordToProgression(chordToSave);
    saveProgression(); // Save the progression to make it available for sections
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
      case 'diminished': return colors.chord.diminished;
      case 'augmented': return colors.chord.augmented;
      case 'dominant7': return colors.chord.dominant7;
      case 'major7': return colors.chord.major7;
      case 'minor7': return colors.chord.minor7;
      case 'major9': return colors.chord.major9;
      case 'minor9': return colors.chord.minor9;
      case 'dominant9': return colors.chord['9']; // Using '9' from colors instead of 'dominant9'
      case 'sus2': return colors.chord.sus2;
      case 'sus4': return colors.chord.sus4;
      case 'add9': return colors.chord.add9;
      case 'm7b5': return colors.chord.m7b5;
      case 'm11': return colors.chord.m11;
      case 'dim': return colors.chord.dim;
      case 'dim7': return colors.chord.dim7;
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

  // Get chord display name
  const getChordDisplayName = () => {
    // Get the chord to display (either from sequencer or current chord)
    const chordToDisplay = isPlaying && stepSequencer.steps[currentStep] 
      ? stepSequencer.steps[currentStep] 
      : currentChord;
    
    if (!chordToDisplay) return '';
    
    let displayName = chordToDisplay.root;
    
    switch (chordToDisplay.type) {
      case 'major': break;
      case 'minor': displayName += 'm'; break;
      case 'diminished': displayName += 'dim'; break;
      case 'augmented': displayName += 'aug'; break;
      case 'dominant7': displayName += '7'; break;
      case 'major7': displayName += 'maj7'; break;
      case 'minor7': displayName += 'm7'; break;
      case 'major9': displayName += 'maj9'; break;
      case 'minor9': displayName += 'm9'; break;
      case 'dominant9': displayName += '9'; break;
      case 'sus2': displayName += 'sus2'; break;
      case 'sus4': displayName += 'sus4'; break;
      case 'add9': displayName += 'add9'; break;
      case 'm7b5': displayName += 'm7b5'; break;
      case 'm11': displayName += 'm11'; break;
      case 'dim': displayName += 'dim'; break;
      case 'dim7': displayName += 'dim7'; break;
      default: break;
    }
    
    // Add slash notation for bass note if different from root
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
          style={[styles.settingsButton, selectedSetting === 'chord' && styles.settingsButtonActive]}
          onPress={() => handleSettingSelect('chord')}
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
          deleteMode && styles.stepButtonDeleteMode
        ]}
        onPress={() => handleStepPress(index)}
      >
        <Text style={[
          styles.stepText,
          isActive ? styles.stepTextActive : styles.stepTextInactive
        ]}>
          {index + 1}
        </Text>
        {deleteMode && chord && (
          <View style={styles.deleteOverlay}>
            <Text style={styles.deleteOverlayText}>X</Text>
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
      if (isPlaying) {
        // Stop playback
        if (sequencerTimerRef.current) {
          clearInterval(sequencerTimerRef.current);
          sequencerTimerRef.current = null;
        }
        stopChord();
        setIsPlaying(false);
        setCurrentStep(0);
      } else {
        // Start playback
        await initAudio();
        
        if (Platform.OS === 'web') {
          const audioCtx = Tone.context;
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
        }
        
        setIsPlaying(true);
        setCurrentStep(0); // Reset to first step
        
        // Play the first chord immediately if it exists
        const firstChord = stepSequencer.steps[0];
        if (firstChord) {
          playChord(firstChord.notes);
        }
        
        // Start sequencer with more precise timing
        const stepDuration = (60 / settings.bpm) * 1000; // Convert BPM to milliseconds
        sequencerTimerRef.current = setInterval(() => {
          setCurrentStep(prev => {
            const nextStep = (prev + 1) % (settings.bars * 16); // 16 steps per bar
            
            // Play click if enabled
            if (settings.click) {
              playClick(nextStep);
            }
            
            // Play chord if it exists at this step
            const chord = stepSequencer.steps[nextStep];
            if (chord) {
              playChord(chord.notes);
            }
            
            return nextStep;
          });
        }, stepDuration);
      }
    } catch (error) {
      console.error('Error in play button:', error);
      alert('Error starting playback. Please try again.');
      setIsPlaying(false);
    }
  };

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (sequencerTimerRef.current) {
        clearInterval(sequencerTimerRef.current);
      }
      stopChord();
    };
  }, []);

  // Update the renderStepSequencer function to remove the play button from here
  const renderStepSequencer = () => {
    const stepsPerRow = 8;
    const totalRows = 4; // 32 steps total / 8 steps per row
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
        <View style={styles.seqArrowButtonsContainer}>
          <Pressable 
            style={styles.arrowButton}
            onPress={handleSeqLeftArrowPress}
            disabled={seqGridPage === 0}
          >
            <View style={[styles.arrowCircle, seqGridPage === 0 && styles.arrowCircleDisabled]}>
              <Play 
                size={16} 
                color={seqGridPage === 0 ? colors.textMuted : colors.textOffWhite}
                style={styles.prevArrow}
                fill={seqGridPage === 0 ? colors.textMuted : colors.textOffWhite}
              />
            </View>
          </Pressable>
          <Pressable
            style={styles.arrowButton}
            onPress={handleSeqRightArrowPress}
            disabled={seqGridPage === 1}
          >
            <View style={[styles.arrowCircle, seqGridPage === 1 && styles.arrowCircleDisabled]}>
              <Play 
                size={16} 
                color={seqGridPage === 1 ? colors.textMuted : colors.textOffWhite}
                fill={seqGridPage === 1 ? colors.textMuted : colors.textOffWhite}
              />
            </View>
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
      padding: 16,
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
      marginTop: 70,
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
      top: -55,
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
      top: -60,
      left: 50,
      right: 0,
      zIndex: 1,
  },
  savedChordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
      gap: 8,
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 8,
  },
  savedChordButton: {
    width: 68,
    height: 48,
    backgroundColor: colors.buttonGrey,
    borderRadius: 8,
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
      marginTop: -5,
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
    borderRadius: 18,
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
    gap: 16,
      position: 'absolute',
      bottom: -45,
      left: 10,
      right: 0,
      paddingHorizontal: 16,
  },
  deleteButton: {
      width: 24,
      height: 45,
    backgroundColor: colors.buttonGrey,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
      position: 'absolute',
      bottom: -51,
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
    borderRadius: 4,
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
      backgroundColor: colors.surfaceLight,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    settingsButtonActive: {
      backgroundColor: colors.primary,
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
      marginTop: 8,
      position: 'absolute',
      right: 140,
      top: '40%',
      transform: [{ translateY: -50 }],
    },
    seqArrowButtonsContainer: {
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 20,
      marginTop: 8,
      position: 'absolute',
      right: 80,
      top: '40%',
      transform: [{ translateY: -50 }],
      zIndex: 2,
    },
    arrowButton: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
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
      right: -40,
      top: 15,
      transform: [{ translateY: -50 }],
      width: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
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
    plusButton: {
      width: 40,
      height: 140,
      borderRadius: 8,
      backgroundColor: colors.buttonGrey,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    plusMinusText: {
      color: colors.textOffWhite,
      fontSize: 28,
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
    stepButtonDeleteMode: {
      borderColor: colors.error,
    },
    savedChordButtonDeleteMode: {
      borderColor: colors.error,
    },
    deleteOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteOverlayText: {
      color: colors.text,
      fontSize: 20,
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
        style={styles.arrowButton}
        onPress={handleSequenceLeftArrowPress}
        disabled={sequencePage === 0}
      >
        <View style={[styles.arrowCircle, sequencePage === 0 && styles.arrowCircleDisabled]}>
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
        style={styles.arrowButton}
        onPress={handleSequenceRightArrowPress}
        disabled={sequencePage === 1}
      >
        <View style={[styles.arrowCircle, sequencePage === 1 && styles.arrowCircleDisabled]}>
          <Play 
            size={16} 
            color={sequencePage === 1 ? colors.textMuted : colors.textOffWhite}
            fill={sequencePage === 1 ? colors.textMuted : colors.textOffWhite}
          />
        </View>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <NavigationMenu visible={menuVisible} onClose={toggleMenu} currentRoute={pathname} />
      <Pressable style={styles.eyeButton} onPress={toggleMenu}>
        <Eye color={colors.text} size={24} />
      </Pressable>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.leftContent}>
          {/* Saved Chords Grid */}
          {renderSavedChordsGrid()}
          
          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {renderSavedSections()}
          </View>
          <Pressable 
            style={[styles.deleteButton, deleteMode && styles.deleteActive]}
            onPress={handleDeletePress}
          >
            <Text style={styles.deleteButtonText}>D</Text>
          </Pressable>
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

      {/* Navigation Menu */}
      <NavigationMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
        currentRoute={pathname}
      />
    </SafeAreaView>
  );
}