import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, SafeAreaView, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Eye, Play, Square, ArrowLeftRight } from 'lucide-react-native';
import { usePathname } from 'expo-router';
import { colors } from '@/constants/colors';
import { NavigationMenu } from '@/components/NavigationMenu';
import { RootNotePiano } from '@/components/RootNotePiano';
import { SettingsPanel } from '@/components/SettingsPanel';
import { SavedChordGrid } from '@/components/SavedChordGrid';
import { Chord, NoteName, MusicMode, ChordType } from '@/types/music';
import { initAudio, playChord, stopChord, stopAllSounds, setBpm } from '@/utils/audio-utils';
import { getDiatonicChords } from '@/utils/chord-utils';
import { Animated } from 'react-native';
import { Audio } from 'expo-av';
import { useChordStore } from '@/stores/chord-store';

interface StepSequencerState {
  steps: (Chord | null)[];
  currentStep: number;
}

interface SettingsState {
  bpm: number;
  timeSignature: string;
  click: boolean;
  bars: number;
  chord: string;
}

// Settings panel state
type SettingType = 'bpm' | 'bars' | 'key' | 'mode' | 'octave' | 'inversion';

interface ChordOption {
  type: string;
  label: string;
  position: number;
}

// Add new types after the existing interfaces
type ChordGroup = 'TRIAD' | '4 NOTE' | 'HIGHER' | 'RANDOM' | 'CUSTOM';

interface CustomChordAssignment {
  [key: string]: Chord; // key is the root note, value is the assigned chord
}

export default function CordinateScreen() {
  // Navigation menu state
  const [menuVisible, setMenuVisible] = useState(false);
  const [isChordinateActive, setIsChordinateActive] = useState(false);
  const pathname = usePathname();

  // Get saved chords from global store
  const { savedChords, currentChord: globalCurrentChord, setCurrentChord } = useChordStore();

  // Step sequencer state
  const [stepSequencer, setStepSequencer] = useState<StepSequencerState>({
    steps: new Array(64).fill(null),
    currentStep: 0
  });

  // Settings state
  const [settings, setSettings] = useState<SettingsState>({
    bpm: 90,
    timeSignature: '4/4',
    click: true,
    bars: 2,
    chord: ''
  });

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [seqGridPage, setSeqGridPage] = useState(0);

  // Timer refs
  const sequencerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickOscillatorRef = useRef<OscillatorNode | null>(null);
  const clickGainRef = useRef<GainNode | null>(null);

  // Remove duplicate currentChord state and use globalCurrentChord for display
  const [selectedRootNote, setSelectedRootNote] = useState('');

  // Settings panel state
  const [selectedSetting, setSelectedSetting] = useState<SettingType | undefined>();
  const [currentMode, setCurrentMode] = useState<MusicMode>('major');
  const [currentOctave, setCurrentOctave] = useState(0);
  const [currentInversion, setCurrentInversion] = useState(0);
  const [selectedKey, setSelectedKey] = useState<NoteName>('C');
  const [isClickEnabled, setIsClickEnabled] = useState(false);

  const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const MODES = ['off', 'major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'];
  const OCTAVES = [-3, -2, -1, 0, 1, 2, 3];

  const [selectedButton, setSelectedButton] = useState<number | null>(null);

  // Edit functionality state
  const [isEditPopupVisible, setIsEditPopupVisible] = useState(false);
  const [editHistory, setEditHistory] = useState<Array<StepSequencerState>>([]);
  const [editHistoryIndex, setEditHistoryIndex] = useState(-1);

  // Add new state for progression page
  const [progressionPage, setProgressionPage] = useState(0);

  const [showGrid, setShowGrid] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  // Remove local savedChords state since we're using global store
  const [activeSavedChordIndex, setActiveSavedChordIndex] = useState<number | null>(null);
  const [gridPage, setGridPage] = useState(0);

  // Add new state for sequence settings popup
  const [isSeqPopupVisible, setIsSeqPopupVisible] = useState(false);

  // Add new state for active SEQ button
  const [activeSeqButton, setActiveSeqButton] = useState<'bpm' | 'bars' | 'timeSig' | null>(null);

  // Add state for long press timer and acceleration
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [adjustmentSpeed, setAdjustmentSpeed] = useState(1);

  // Add new ref for the initial delay timer
  const initialDelayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add new state for chord options
  const [isChordOptionsVisible, setIsChordOptionsVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [availableChordOptions, setAvailableChordOptions] = useState<ChordOption[]>([]);

  // Add new state for chord groups after existing state declarations
  const [activeChordGroup, setActiveChordGroup] = useState<ChordGroup>('TRIAD');
  const [customChordAssignments, setCustomChordAssignments] = useState<CustomChordAssignment>({});
  const [lastPlayedChord, setLastPlayedChord] = useState<Chord | null>(null);
  const customLongPressRef = useRef<NodeJS.Timeout | null>(null);

  const handleCordinateButtonPress = (index: number) => {
    const groups: ChordGroup[] = ['TRIAD', '4 NOTE', 'HIGHER', 'RANDOM', 'CUSTOM'];
    if (index >= 0 && index < groups.length) {
      const newGroup = groups[index];
      setActiveChordGroup(newGroup);
      setSelectedButton(index);
      // Clear custom assignments when switching away from CUSTOM mode
      if (newGroup !== 'CUSTOM') {
        setCustomChordAssignments({});
      }
    }
  };

  // Initialize audio on component mount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });
        
        const ctx = await initAudio();
        const audioCtx = ctx as unknown as AudioContext;
        if (audioCtx?.createGain) {
          const clickGain = audioCtx.createGain();
          clickGain.gain.value = 0.1;
          clickGain.connect(audioCtx.destination);
          clickGainRef.current = clickGain;
        }
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    };
    
    void setupAudio();

    return () => {
      if (clickOscillatorRef.current) {
        clickOscillatorRef.current.stop();
      }
      stopChord();
      if (sequencerTimerRef.current) {
        clearInterval(sequencerTimerRef.current);
      }
    };
  }, []);

  // Function to play click sound
  const playClick = (step: number) => {
    if (!clickGainRef.current || !isClickEnabled) return;

    const audioContext = clickGainRef.current.context;
    
    if (clickOscillatorRef.current) {
      clickOscillatorRef.current.stop();
    }

    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    
    const isAccentedBeat = step % 4 === 0;
    oscillator.frequency.value = isAccentedBeat ? 1500 : 1000;
    
    oscillator.connect(clickGainRef.current);
    
    const now = audioContext.currentTime;
    oscillator.start(now);
    oscillator.stop(now + 0.05);
    
    clickOscillatorRef.current = oscillator;
  };

  // Sequencer playback effect
  useEffect(() => {
    if (isPlaying) {
      const stepDuration = (60 / (settings.bpm * 4)) * 1000;
      const stepsPerBar = 16;
      const totalStepsInLoop = stepsPerBar * settings.bars;

      if (isClickEnabled) {
        void playClick(0);
      }

      sequencerTimerRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = (prev + 1) % totalStepsInLoop;
          
          if (isClickEnabled && nextStep % 2 === 0) {
            void playClick(nextStep);
          }

          const chord = stepSequencer.steps[nextStep];
          if (chord) {
            void stopChord();
            void playChord(chord.notes);
            setTimeout(() => {
              void stopChord();
            }, chord.duration || 200);
          } else {
            void stopChord();
          }
          
          return nextStep;
        });
      }, stepDuration);
    }

    return () => {
      if (sequencerTimerRef.current) {
        clearInterval(sequencerTimerRef.current);
        sequencerTimerRef.current = null;
      }
      void stopChord();
    };
  }, [isPlaying, settings.bpm, isClickEnabled, settings.bars, stepSequencer.steps]);

  // Handle step press
  const handleStepPress = (index: number) => {
    const chord = stepSequencer.steps[index];
    if (chord) {
      setSelectedNote(chord.root);
      setAvailableChordOptions(getAvailableChords(chord.root, currentMode));
    }
  };

  // Handle sequencer page toggle
  const handleSeqPageToggle = () => {
    setSeqGridPage(prev => prev === 0 ? 1 : 0);
  };

  // Handle settings selection
  const handleSettingSelect = (setting: SettingType | '') => {
    if (setting === selectedSetting) {
      setSelectedSetting(undefined);
    } else if (setting !== '') {
      setSelectedSetting(setting);
      if (setting === 'key') {
        // Show key selection UI
        setShowGrid(true);
      } else if (setting === 'mode') {
        // Show mode selection UI
        setShowGrid(true);
      }
    } else {
      setSelectedSetting(undefined);
    }
  };

  // Handle SEQ button press
  const handleSeqButtonPress = (button: 'bpm' | 'bars' | 'timeSig') => {
    setActiveSeqButton(button);
  };

  // Handle long press for BPM adjustment
  const handlePressIn = (direction: 'up' | 'down') => {
    // Clear any existing timers
    if (longPressTimer) {
      clearInterval(longPressTimer);
    }
    if (initialDelayTimerRef.current) {
      clearTimeout(initialDelayTimerRef.current);
    }

    const startTime = Date.now();
    
    // Initial delay before starting continuous adjustment
    initialDelayTimerRef.current = setTimeout(() => {
      // Start continuous adjustment
      const timer = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        
        // After 2.5 seconds, increase to fast speed
        if (elapsedTime > 2500) {
          setAdjustmentSpeed(10);
        }
        
        handleSettingAdjust(direction);
      }, 100); // Adjust every 100ms
      
      setLongPressTimer(timer);
    }, 100); // Reduced initial delay to 100ms for better responsiveness
  };

  const handlePressOut = () => {
    // Reset speed without triggering another adjustment
    setAdjustmentSpeed(1);
    
    // Clear timers
    if (longPressTimer) {
      clearInterval(longPressTimer);
      setLongPressTimer(null);
    }
    if (initialDelayTimerRef.current) {
      clearTimeout(initialDelayTimerRef.current);
      initialDelayTimerRef.current = null;
    }
  };

  // Handle settings adjustment
  const handleSettingAdjust = (direction: 'up' | 'down') => {
    if (!selectedSetting) return;

    const increment = direction === 'up' ? 1 : -1;
    const adjustmentMultiplier = adjustmentSpeed;

    switch (selectedSetting) {
      case 'key':
        const currentKeyIndex = KEYS.indexOf(selectedKey);
        const newKeyIndex = (currentKeyIndex + increment + KEYS.length) % KEYS.length;
        setSelectedKey(KEYS[newKeyIndex] as NoteName);
        break;

      case 'mode':
        const currentModeIndex = MODES.indexOf(currentMode);
        const newModeIndex = (currentModeIndex + increment + MODES.length) % MODES.length;
        setCurrentMode(MODES[newModeIndex] as MusicMode);
        break;

      case 'octave':
        const newOctave = Math.max(-3, Math.min(3, currentOctave + increment));
        setCurrentOctave(newOctave);
        break;

      case 'inversion':
        const newInversion = Math.max(0, Math.min(3, currentInversion + increment));
        setCurrentInversion(newInversion);
        break;

      case 'bpm':
        const bpmChange = increment * adjustmentMultiplier;
        setSettings(prev => {
          const newSettings = { ...prev };
          newSettings.bpm = Math.max(30, Math.min(300, prev.bpm + bpmChange));
          setBpm(newSettings.bpm);
          return newSettings;
        });
        break;

      case 'bars':
        setSettings(prev => {
          const newSettings = { ...prev };
          newSettings.bars = Math.max(1, Math.min(8, prev.bars + increment));
          return newSettings;
        });
        break;
    }
  };

  // Handle play button press
  const handlePlayPress = async () => {
    try {
      if (!isPlaying) {
        setIsPlaying(true);
        setCurrentStep(0);
        
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
        }, 60000 / settings.bpm);
      } else {
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

  // Edit functionality handlers
  const handleEditPress = () => {
    setIsEditPopupVisible(false);
  };

  const handleEditOptionPress = (option: 'clear' | 'copy-paste' | 'undo' | 'redo') => {
    switch (option) {
      case 'clear':
        // Save current state to history before clearing
        setEditHistory(prev => [...prev.slice(0, editHistoryIndex + 1), stepSequencer]);
        setEditHistoryIndex(prev => prev + 1);
        setStepSequencer(prev => ({
          ...prev,
          steps: new Array(64).fill(null)
        }));
        break;
      case 'undo':
        if (editHistoryIndex >= 0) {
          setStepSequencer(editHistory[editHistoryIndex]);
          setEditHistoryIndex(prev => prev - 1);
        }
        break;
      case 'redo':
        if (editHistoryIndex < editHistory.length - 1) {
          setEditHistoryIndex(prev => prev + 1);
          setStepSequencer(editHistory[editHistoryIndex + 1]);
        }
        break;
      case 'copy-paste':
        // TODO: Implement copy/paste functionality
        break;
    }
    setIsEditPopupVisible(false);
  };

  // Render step button
  const renderStepButton = (index: number) => {
    const chord = stepSequencer.steps[index];
    const isActive = currentStep === index;

    return (
      <Pressable
        key={index}
        style={[
          styles.stepButton,
          chord && styles.stepButtonActive,
        ]}
        onPress={() => handleStepPress(index)}
      >
        <Text style={[
          styles.stepText,
          isActive ? styles.stepTextActive : styles.stepTextInactive
        ]}>
          {index + 1}
        </Text>
      </Pressable>
    );
  };

  // Add handler for progression page toggle
  const handleProgressionPageToggle = () => {
    setProgressionPage(prev => prev === 0 ? 1 : 0);
  };

  // Add renderProgressionButtons function
  const renderProgressionButtons = () => {
    const startNumber = progressionPage * 4 + 1;
    return (
      <View style={styles.progressionButtonsContainer}>
        <View style={styles.progressionButtons}>
          {[0, 1, 2, 3].map((index) => (
            <Pressable
              key={index}
              style={styles.progressionButton}
            >
              <Text style={styles.progressionButtonText}>{startNumber + index}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={styles.progressionToggleButton}
          onPress={handleProgressionPageToggle}
        >
          <View style={styles.toggleArrowsContainer}>
            <Play 
              size={14} 
              color={progressionPage === 0 ? colors.textMuted : colors.textOffWhite}
              style={{ transform: [{ rotate: '180deg' }] }}
              fill={progressionPage === 0 ? colors.textMuted : colors.textOffWhite}
            />
            <Play 
              size={14} 
              color={progressionPage === 1 ? colors.textMuted : colors.textOffWhite}
              fill={progressionPage === 1 ? colors.textMuted : colors.textOffWhite}
            />
          </View>
        </Pressable>
      </View>
    );
  };

  // Render step sequencer
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
            style={styles.navigationToggleButton}
            onPress={handleSeqPageToggle}
          >
            <View style={styles.toggleArrowsContainer}>
              <Play 
                size={14} 
                color={seqGridPage === 0 ? colors.textMuted : colors.textOffWhite}
                style={{ transform: [{ rotate: '180deg' }] }}
                fill={seqGridPage === 0 ? colors.textMuted : colors.textOffWhite}
              />
              <Play 
                size={14} 
                color={seqGridPage === 1 ? colors.textMuted : colors.textOffWhite}
                fill={seqGridPage === 1 ? colors.textMuted : colors.textOffWhite}
              />
            </View>
          </Pressable>
        </View>
        {renderProgressionButtons()}
      </View>
    );
  };

  // Render settings
  const renderSettings = () => {
    return (
      <View style={styles.settingsButtons}>
        <View style={{ transform: [{ translateX: -4 }] }}>
          <Pressable 
            style={[styles.settingsButton, isClickEnabled && styles.settingsButtonActive]}
            onPress={() => setIsClickEnabled(!isClickEnabled)}
          >
            <Text style={styles.settingsButtonName}>CLICK</Text>
            <Text style={styles.settingsButtonValue}>{isClickEnabled ? 'ON' : 'OFF'}</Text>
          </Pressable>
        </View>
        <Pressable 
          style={[styles.editButton, isEditPopupVisible && styles.editButtonActive]}
          onPress={() => setIsEditPopupVisible(!isEditPopupVisible)}
        >
          <Text style={styles.editButtonText}>EDIT</Text>
        </Pressable>
        <Pressable 
          style={[styles.toggleButton, showGrid && styles.toggleButtonActive]}
          onPress={handleToggleView}
        >
          <ArrowLeftRight size={20} color={colors.text} style={{ transform: [{ rotate: '0deg' }] }} />
        </Pressable>
      </View>
    );
  };

  // Toggle between piano and grid
  const handleToggleView = () => {
    // Start the flip animation
    Animated.spring(flipAnimation, {
      toValue: showGrid ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();

    // Update the view state after animation
    setTimeout(() => {
      setShowGrid(!showGrid);
    }, 150);
  };

  // Calculate transform styles for both views
  const pianoTransform = {
    transform: [
      {
        rotateY: flipAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        }),
      },
    ],
    backfaceVisibility: 'hidden' as const,
  };

  const gridTransform = {
    transform: [
      {
        rotateY: flipAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ['180deg', '360deg'],
        }),
      },
    ],
    backfaceVisibility: 'hidden' as const,
  };

  // Update handleSavedChordPress to use global state
  const handleSavedChordPress = (chord: Chord, index: number) => {
    setCurrentChord(chord);
    setActiveSavedChordIndex(index);
    void playChord(chord.notes);
  };

  const handleSavedChordRelease = () => {
    stopChord();
    setCurrentChord(null);
    setActiveSavedChordIndex(null);
  };

  const handleGridPageToggle = () => {
    setGridPage(prev => prev === 0 ? 1 : 0);
  };

  // Update getAvailableChords to use the chord-utils logic
  const getAvailableChords = (note: NoteName, mode: MusicMode): ChordOption[] => {
    // Get all diatonic chords for the current key and mode
    const diatonicChords = getDiatonicChords(selectedKey, mode);
    
    // Filter chords that have the selected note as root
    const chordsForNote = diatonicChords.filter((chord: Chord) => chord.root === note);
    
    // Convert to ChordOption format and assign positions
    return chordsForNote.map((chord: Chord, index: number) => ({
      type: chord.type.toUpperCase(),
      label: formatChordType(chord.type.toUpperCase()),
      position: index
    }));
  };

  // Update formatChordType to match the chord page
  const formatChordType = (type: string): string => {
    const formatMap: Record<string, string> = {
      'MAJOR': 'maj',
      'MINOR': 'min',
      'DIMINISHED': 'dim',
      'AUGMENTED': 'aug',
      'DOMINANT7': '7',
      'MAJOR7': 'maj7',
      'MINOR7': 'min7',
      'MAJOR9': 'maj9',
      'MINOR9': 'min9',
      'DOMINANT9': '9',
      'SUS2': 'sus2',
      'SUS4': 'sus4',
      'ADD9': 'add9',
      'M7B5': 'm7b5',
      'M11': 'm11',
      'DIM': 'dim',
      'DIM7': 'dim7',
      '6': '6',
      '69': '69',
      'MINOR6': 'min6',
      'MINOR13': 'min13',
      'MINORMAJOR7': 'minMaj7',
      '7SUS4': '7sus4',
      'AUGMENTED7': 'aug7',
      'AUGMENTEDMAJOR7': 'augMaj7',
      '11': '11'
    };
    return formatMap[type] || type.toLowerCase();
  };

  // Add getChordForNote function after existing function declarations
  const getChordForNote = (note: NoteName, mode: MusicMode): Chord | null => {
    if (!isChordinateActive) {
      return null;
    }

    // Get diatonic chords for the current key and mode
    const diatonicChords = getDiatonicChords(selectedKey, mode);
    
    // Filter chords to only include those with the selected note as root
    const chordsWithMatchingRoot = diatonicChords.filter(chord => chord.root === note);

    // Only use custom assignments if in CUSTOM mode
    if (activeChordGroup === 'CUSTOM' && customChordAssignments[note]) {
      return customChordAssignments[note];
    }

    if (chordsWithMatchingRoot.length === 0) {
      // If no matching chords found, create a basic major or minor chord
      return {
        id: Date.now().toString(),
        root: note,
        type: mode === 'minor' ? 'minor' : 'major',
        notes: [], // Audio utils will populate this
        duration: 500
      };
    }

    switch (activeChordGroup) {
      case 'TRIAD':
        // Strictly only major, minor, or diminished triads from the diatonic scale
        const triadTypes = ['major', 'minor', 'diminished'];
        return chordsWithMatchingRoot.find(chord => 
          triadTypes.includes(chord.type.toLowerCase()) &&
          !chord.type.includes('7') && 
          !chord.type.includes('9') && 
          !chord.type.includes('11') && 
          !chord.type.includes('13') &&
          !chord.type.includes('6') &&
          !chord.type.includes('sus')
        ) || {
          id: Date.now().toString(),
          root: note,
          type: mode === 'minor' ? 'minor' : 'major',
          notes: [],
          duration: 500
        };

      case '4 NOTE':
        // Only 7th chords
        const seventhTypes = ['7', 'maj7', 'min7', 'm7b5', 'dim7'];
        return chordsWithMatchingRoot.find(chord => 
          seventhTypes.some(type => chord.type.toLowerCase() === type.toLowerCase())
        ) || chordsWithMatchingRoot.find(chord => 
          chord.type.toLowerCase().includes('7')
        ) || chordsWithMatchingRoot[0];

      case 'HIGHER':
        // Only extended chords (9th, 11th, 13th)
        const extendedTypes = ['9', '11', '13'];
        return chordsWithMatchingRoot.find(chord => 
          extendedTypes.some(type => chord.type.toLowerCase().endsWith(type))
        ) || chordsWithMatchingRoot.find(chord => 
          chord.type.toLowerCase().includes('9') ||
          chord.type.toLowerCase().includes('11') ||
          chord.type.toLowerCase().includes('13')
        ) || chordsWithMatchingRoot[0];

      case 'RANDOM':
        return chordsWithMatchingRoot[Math.floor(Math.random() * chordsWithMatchingRoot.length)];

      default:
        return chordsWithMatchingRoot[0];
    }
  };

  // Modify handleChordOptionPress to store last played chord
  const handleChordOptionPress = (chordType: string) => {
    if (!selectedNote || !chordType) return;
    
    const diatonicChords = getDiatonicChords(selectedKey, currentMode);
    let formattedType = formatChordType(chordType);
    
    if (chordType === 'MAJ') formattedType = 'major';
    if (chordType === 'MIN') formattedType = 'minor';
    if (chordType === 'DIM') formattedType = 'diminished';
    if (chordType === 'AUG') formattedType = 'augmented';
    
    const matchingChord = diatonicChords.find(
      chord => chord.root === selectedNote && 
      (chord.type.toLowerCase() === formattedType.toLowerCase() || 
       chord.type.toLowerCase().replace('-', '') === formattedType.toLowerCase().replace('-', ''))
    );
    
    if (!matchingChord) {
      console.log('No matching chord found:', {
        selectedNote,
        chordType,
        formattedType,
        availableTypes: diatonicChords.map(c => ({ root: c.root, type: c.type }))
      });
      return;
    }
    
    const chord: Chord = {
      id: Date.now().toString(),
      root: selectedNote as NoteName,
      type: matchingChord.type as ChordType,
      notes: matchingChord.notes,
      duration: 500
    };
    
    setLastPlayedChord(chord);
    setCurrentChord(chord);
    void stopChord();
    void playChord(matchingChord.notes);
  };

  // Add custom chord assignment handlers
  const handleCustomLongPress = () => {
    if (activeChordGroup !== 'CUSTOM' || !lastPlayedChord || !selectedNote) return;

    setCustomChordAssignments(prev => ({
      ...prev,
      [selectedNote]: lastPlayedChord
    }));
  };

  // Modify handleNoteSelect to use chord groups
  const handleNoteSelect = (note: string) => {
    setSelectedRootNote(note);
    const midiNote = 60 + ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
      .indexOf(note);

    if (!isChordinateActive) {
      // When CHORDINATE is off, only play single notes and stop any playing chords
      void stopChord();
      void playChord([midiNote]);
      return;
    }

    // Only proceed with chord logic if CHORDINATE is active
    const chord = getChordForNote(note as NoteName, currentMode);
    if (chord) {
      void stopChord();
      void playChord(chord.notes);
    }
  };

  // Add custom button long press handlers
  const handleCustomButtonPressIn = () => {
    if (activeChordGroup === 'CUSTOM') {
      customLongPressRef.current = setTimeout(handleCustomLongPress, 500);
    }
  };

  const handleCustomButtonPressOut = () => {
    if (customLongPressRef.current) {
      clearTimeout(customLongPressRef.current);
      customLongPressRef.current = null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} currentRoute={pathname} />
      <Pressable style={styles.eyeButton} onPress={() => setMenuVisible(!menuVisible)}>
        <Eye color={colors.text} size={24} />
      </Pressable>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Left Side Content */}
        <View style={styles.leftPanel}>
          {renderSettings()}
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
            <Pressable 
              style={[styles.seqButton, isSeqPopupVisible && styles.seqButtonActive]}
              onPress={() => setIsSeqPopupVisible(!isSeqPopupVisible)}
            >
              <View style={styles.fadersIcon}>
                <View style={[styles.fader, { height: 14 }]} />
                <View style={[styles.fader, { height: 18 }]} />
                <View style={[styles.fader, { height: 12 }]} />
              </View>
            </Pressable>
          </View>

          {/* Move SEQ popup outside of settingsButtons */}
          {isSeqPopupVisible && (
            <Pressable 
              style={styles.editPopupOverlay}
              onPress={() => {
                setIsSeqPopupVisible(false);
                setActiveSeqButton(null);
              }}
            >
              <View style={[styles.editPopup, { transform: [{ translateX: 160 }], gap: 20 }]}>
                <Pressable
                  style={[
                    styles.editPopupButton,
                    { height: 58 },
                    activeSeqButton === 'bpm' && styles.editPopupButtonActive
                  ]}
                  onPress={() => handleSeqButtonPress('bpm')}
                >
                  <Text style={[styles.editPopupButtonText, { fontSize: 16.8 }]}>BPM: {settings.bpm}</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.editPopupButton,
                    { height: 58 },
                    activeSeqButton === 'bars' && styles.editPopupButtonActive
                  ]}
                  onPress={() => handleSeqButtonPress('bars')}
                >
                  <Text style={[styles.editPopupButtonText, { fontSize: 16.8 }]}>BARS: {settings.bars}</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.editPopupButton,
                    { height: 58 },
                    activeSeqButton === 'timeSig' && styles.editPopupButtonActive
                  ]}
                  onPress={() => handleSeqButtonPress('timeSig')}
                >
                  <Text style={[styles.editPopupButtonText, { fontSize: 16.8 }]}>TIME SIG: {settings.timeSignature}</Text>
                </Pressable>
              </View>
            </Pressable>
          )}

          <Pressable 
            style={({pressed}) => [
              styles.rotatedPianoKey,
              isChordinateActive && {
                backgroundColor: '#000000',
                borderColor: '#FFFFFF',
                borderWidth: 2
              }
            ]}
            onPress={() => {
              setIsChordinateActive(!isChordinateActive);
            }}
          >
            <Text style={[
              styles.chordinateText,
              isChordinateActive && {
                color: '#FFA500'
              }
            ]}>CHORDINATE</Text>
          </Pressable>
          <Pressable 
            style={[
              styles.chordOptionsButton,
              isChordOptionsVisible && styles.chordOptionButtonActive
            ]}
            onPress={() => setIsChordOptionsVisible(!isChordOptionsVisible)}
          >
            <Text style={styles.chordOptionsText}>CHORD OPTIONS</Text>
          </Pressable>

          {renderStepSequencer()}
        </View>

        {/* Right Side Panel */}
        <View style={styles.rightPanel}>
          {/* Settings and Piano Container */}
          <View style={styles.settingsAndPianoContainer}>
            {/* Settings Panel */}
            <SettingsPanel
              mode={currentMode}
              octave={currentOctave}
              chord={globalCurrentChord ? `${globalCurrentChord.root}${globalCurrentChord.type}` : ''}
              selectedKey={selectedKey}
              inversion={currentInversion}
              selectedSetting={selectedSetting}
              onSettingSelect={handleSettingSelect}
            />
            
            {/* Animated container for piano and grid */}
            <View style={styles.animatedContainer}>
              <Animated.View style={[styles.animatedView, pianoTransform, !showGrid && styles.visible]}>
                <View style={styles.horizontalPianoContainer}>
                  <RootNotePiano
                    onNoteSelect={(note) => {
                      setSelectedRootNote(note);
                      handleNoteSelect(note);
                    }}
                    selectedKey={selectedKey}
                    mode={currentMode}
                  />
                </View>
              </Animated.View>

              <Animated.View style={[styles.animatedView, gridTransform, showGrid && styles.visible]}>
                <View style={styles.gridContainer}>
                  <View style={styles.gridHeaderContainer}>
                    <SavedChordGrid
                      chords={savedChords.filter((chord): chord is Chord => chord !== null)}
                      currentPage={gridPage}
                      totalPages={Math.ceil(savedChords.length / 16)}
                      onPageChange={setGridPage}
                      onChordPress={handleSavedChordPress}
                      onChordRelease={handleSavedChordRelease}
                      activeChordIndex={activeSavedChordIndex}
                      saveMode={false}
                      columns={4}
                      rows={4}
                    />
                    <Pressable
                      style={styles.gridPageToggle}
                      onPress={handleGridPageToggle}
                    >
                      <View style={styles.toggleArrowsContainer}>
                        <Play 
                          size={14} 
                          color={gridPage === 0 ? colors.textMuted : colors.textOffWhite}
                          style={{ transform: [{ rotate: '180deg' }] }}
                          fill={gridPage === 0 ? colors.textMuted : colors.textOffWhite}
                        />
                        <Play 
                          size={14} 
                          color={gridPage === 1 ? colors.textMuted : colors.textOffWhite}
                          style={{ transform: [{ rotate: '0deg' }] }}
                          fill={gridPage === 1 ? colors.textMuted : colors.textOffWhite}
                        />
                      </View>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            </View>

            {/* Cordinate Buttons */}
            <View style={styles.cordinateButtonsContainer}>
              {(['TRIAD', '4 NOTE', 'HIGHER', 'RANDOM', 'CUSTOM'] as const).map((label, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.cordinateButton,
                    selectedButton === index && styles.cordinateButtonActive,
                    label === activeChordGroup && styles.cordinateButtonSelected
                  ]}
                  onPress={() => handleCordinateButtonPress(index)}
                  onPressIn={() => label === 'CUSTOM' && handleCustomButtonPressIn()}
                  onPressOut={() => label === 'CUSTOM' && handleCustomButtonPressOut()}
                >
                  <Text style={styles.cordinateButtonText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Plus/Minus buttons */}
          <View style={styles.plusMinusContainer}>
            <Pressable 
              style={styles.plusButton}
              onPress={() => handleSettingAdjust('up')}
              onPressIn={() => handlePressIn('up')}
              onPressOut={handlePressOut}
            >
              <Text style={styles.plusMinusText}>+</Text>
            </Pressable>
            <Pressable 
              style={styles.minusButton}
              onPress={() => handleSettingAdjust('down')}
              onPressIn={() => handlePressIn('down')}
              onPressOut={handlePressOut}
            >
              <Text style={styles.plusMinusText}>-</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Edit Popup */}
      {isEditPopupVisible && (
        <Pressable 
          style={styles.editPopupOverlay}
          onPress={() => setIsEditPopupVisible(false)}
        >
          <Pressable 
            style={styles.editPopup}
            onPress={e => e.stopPropagation()}
          >
            {[
              { label: 'CLEAR', value: 'clear' },
              { label: 'COPY/PASTE', value: 'copy-paste' },
              { label: 'UNDO', value: 'undo' },
              { label: 'REDO', value: 'redo' }
            ].map((option) => (
              <Pressable
                key={option.value}
                style={styles.editPopupButton}
                onPress={() => handleEditOptionPress(option.value as 'clear' | 'copy-paste' | 'undo' | 'redo')}
              >
                <Text style={styles.editPopupButtonText}>{option.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      )}

      {/* Chord Options Popup */}
      {isChordOptionsVisible && (
        <Pressable 
          style={styles.editPopupOverlay}
          onPress={() => setIsChordOptionsVisible(false)}
        >
          <View style={[styles.chordOptionsContainer, { marginTop: 50 }]}>
            <View style={styles.chordOptionsGrid}>
              {[0, 1, 2].map((row) => (
                <View key={row} style={styles.chordOptionsRow}>
                  {[0, 1, 2, 3].map((col) => {
                    const position = row * 4 + col;
                    const chord = availableChordOptions[position];
                    const isEmpty = !chord || !chord.type;
                    
                    const buttonStyle = [
                      styles.chordOptionButton,
                      !isEmpty && styles.chordOptionButtonActive,
                      chord?.type.includes('MAJ') && !chord?.type.includes('7') && styles.majorChordButton,
                      chord?.type.includes('MIN') && styles.minorChordButton,
                      chord?.type.includes('DIM') && styles.dimChordButton,
                      (chord?.type === '7' || chord?.type === 'DOM7') && styles.dominantChordButton,
                      chord?.type.includes('MAJ7') && styles.maj7ChordButton
                    ];
                    
                    return (
                      <Pressable
                        key={col}
                        style={buttonStyle}
                        onPress={() => !isEmpty && handleChordOptionPress(chord.type)}
                        disabled={isEmpty}
                      >
                        <Text style={[
                          styles.chordOptionButtonText,
                          isEmpty && { opacity: 0.3 }
                        ]}>
                          {isEmpty ? '—' : chord.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: -41,
    marginTop: 0,
    justifyContent: 'space-between'
  },
  rightPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10
  },
  settingsAndPianoContainer: {
    width: 370,
    marginLeft: -51,
    marginTop: 0
  },
  leftPanel: {
    width: 328,
    marginTop: 65
  },
  pianoContainer: {
    height: 220,
    marginTop: -40
  },
  plusMinusContainer: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    marginLeft: 10,
    marginTop: 38,
    transform: [{ translateX: 45 }],
    gap: 30
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
    zIndex: 10
  },
  stepSequencerContainer: {
    flex: 1,
    marginTop: 0,
    width: '100%',
    position: 'relative',
    zIndex: 1
  },
  stepSequencerGrid: {
    flexDirection: 'column',
    gap: 1.5,
    width: 328,
    marginLeft: 'auto',
    marginRight: 50,
    transform: [{ translateX: 4 }],
    marginTop: -49
  },
  stepSequencerRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 4.5
  },
  stepButton: {
    width: 38,
    height: 37,
    borderRadius: 8,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepButtonActive: {
    borderWidth: 2,
    borderColor: colors.primary
  },
  stepText: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  stepTextActive: {
    color: '#FFFFFF'
  },
  stepTextInactive: {
    color: 'rgba(255, 255, 255, 0.5)'
  },
  seqGridControls: {
    position: 'absolute',
    right: 284,
    top: '50%',
    transform: [{ translateY: 48 }],
    zIndex: 2
  },
  navigationToggleButton: {
    width: 48,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.buttonGrey,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  toggleArrowsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  plusButton: {
    width: 40,
    height: 140,
    borderRadius: 8,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  minusButton: {
    width: 40,
    height: 140,
    borderRadius: 8,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10
  },
  plusMinusText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold'
  },
  rotatedPianoKey: {
    width: 143,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '0deg' }],
    position: 'absolute',
    top: -53,
    left: 85,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2
  },
  chordOptionsButton: {
    width: 68,
    height: 40,
    backgroundColor: colors.buttonGrey,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'absolute',
    top: -53,
    left: 247,
    justifyContent: 'center',
    alignItems: 'center'
  },
  chordOptionsText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center'
  },
  chordinateText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  settingsButtons: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'flex-start',
    width: '100%',
    marginBottom: 0,
    alignItems: 'flex-start',
    paddingLeft: 133,
    marginTop: 2,
    transform: [{ translateY: -8 }]
  },
  settingsButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    alignItems: 'center'
  },
  settingsButtonActive: {
    backgroundColor: colors.surfaceLight
  },
  settingsButtonName: {
    color: colors.text,
    fontSize: 13,
    marginBottom: 4
  },
  settingsButtonValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: 'bold'
  },
  playButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 0,
    transform: [{ translateX: -142 }, { translateY: -58 }],
    position: 'relative',
    zIndex: 2,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-start',
    paddingLeft: 152
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13
  },
  seqButton: {
    width: 41,
    height: 41,
    borderRadius: 20.5,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginLeft: 5
  },
  seqButtonActive: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.text
  },
  fadersIcon: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'flex-end',
    height: 18
  },
  fader: {
    width: 2,
    backgroundColor: colors.text,
    borderRadius: 1
  },
  seqPopup: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6
  },
  seqPopupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  seqPopupLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500'
  },
  seqPopupControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  seqPopupButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  seqPopupButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold'
  },
  seqPopupValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center'
  },
  cordinateButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 30,
    marginLeft: 60,
    paddingHorizontal: 20
  },
  cordinateButton: {
    width: 68,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  cordinateButtonActive: {
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  cordinateButtonSelected: {
    borderWidth: 2,
    borderColor: colors.primary
  },
  cordinateButtonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center'
  },
  editPopupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  editPopup: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    width: 200,
    gap: 8
  },
  editPopupButton: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  editPopupButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500'
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
    marginTop: 7,
    marginLeft: -5
  },
  editButtonActive: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.text
  },
  editButtonText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '500'
  },
  progressionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
    gap: 8,
    transform: [
      { translateX: 36 },
      { translateY: 20 }
    ]
  },
  progressionButtons: {
    flexDirection: 'row',
    gap: 8
  },
  progressionToggleButton: {
    width: 48,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.buttonGrey,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  toggleButton: {
    position: 'absolute',
    right: 10,
    top: 8,
    width: 41,
    height: 41,
    borderRadius: 20.5,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ translateX: 20 }]
  },
  toggleButtonActive: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.text,
  },
  pianoGridContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
    marginTop: -40,
  },
  rightPianoContainer: {
    width: '100%',
    height: '100%',
    transform: [
      { translateY: 40 },
      { translateX: 12 }
    ]
  },
  gridContainer: {
    transform: [
      { translateY: 8 },
      { translateX: -117 }
    ],
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: 'transparent'
  },
  gridHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 8,
    paddingRight: 10,
    backgroundColor: 'transparent'
  },
  gridPageToggle: {
    width: 43,
    height: 29,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 64,
    transform: [{ rotate: '270deg' }],
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    backgroundColor: 'transparent'
  },
  progressionButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  progressionButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500'
  },
  modeContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  modeLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  modeValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  modeAlternate: {
    color: colors.textSecondary,
    fontSize: 10,
    opacity: 0.7,
    marginTop: -2,
  },
  animatedContainer: {
    position: 'relative',
    width: '100%',
    height: 185,
  },
  animatedView: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  },
  visible: {
    zIndex: 1,
  },
  horizontalPianoContainer: {
    width: '100%',
    height: '100%',
    transform: [{ translateX: 15 }]
  },
  playButtonActive: {
    backgroundColor: colors.buttonActive
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
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  editPopupButtonActive: {
    borderColor: colors.text,
    borderWidth: 2,
    backgroundColor: colors.surfaceLight
  },
  chordOptionsContainer: {
    width: 360,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  chordOptionsGrid: {
    flexDirection: 'column',
    gap: 20,
    width: '100%'
  },
  chordOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    width: '100%'
  },
  chordOptionButton: {
    width: 82,
    height: 58,
    borderRadius: 12,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  chordOptionButtonActive: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.text,
    borderWidth: 2
  },
  chordOptionButtonText: {
    color: colors.text,
    fontSize: 16.8,
    fontWeight: '500',
    textAlign: 'center'
  },
  majorChordButton: {
    backgroundColor: colors.buttonGrey
  },
  minorChordButton: {
    backgroundColor: colors.buttonGrey
  },
  dimChordButton: {
    backgroundColor: colors.buttonGrey
  },
  dominantChordButton: {
    backgroundColor: colors.buttonGrey
  },
  maj7ChordButton: {
    backgroundColor: colors.buttonGrey
  },
  sus2ChordButton: {
    backgroundColor: colors.buttonGrey
  },
  sus4ChordButton: {
    backgroundColor: colors.buttonGrey
  },
  sixthChordButton: {
    backgroundColor: colors.buttonGrey
  },
  sixNinthChordButton: {
    backgroundColor: colors.buttonGrey
  },
  addNineChordButton: {
    backgroundColor: colors.buttonGrey
  },
  maj11ChordButton: {
    backgroundColor: colors.buttonGrey
  },
  maj13ChordButton: {
    backgroundColor: colors.buttonGrey
  },
  min7ChordButton: {
    backgroundColor: colors.buttonGrey
  },
  min9ChordButton: {
    backgroundColor: colors.buttonGrey
  }
});