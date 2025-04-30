import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, SafeAreaView, Modal, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Eye, Play, Square, ArrowLeftRight } from 'lucide-react-native';
import { usePathname } from 'expo-router';
import { colors } from '@/constants/colors';
import { NavigationMenu } from '@/components/NavigationMenu';
import { RootNotePiano } from '@/components/RootNotePiano';
import { SettingsPanel } from '@/components/SettingsPanel';
import { SavedChordGrid } from '@/components/SavedChordGrid';
import { Chord, NoteName, MusicMode, ChordType, InstrumentType } from '@/types/music';
import { initAudio, playChord, stopChord, stopAllSounds, setBpm, setInstrument, playClick as playClickSound } from '@/utils/audio-utils';
import { getDiatonicChords, getChordsForGroup, createChord } from '@/utils/chord-utils';
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
type ChordGroup = 'TRIAD' | '4 NOTE' | 'HIGHER' | 'RANDOM';

interface CustomChordAssignment {
  [key: string]: Chord; // key is the root note, value is the assigned chord
}

const availableSounds: InstrumentType[] = ['balafon', 'piano', 'rhodes', 'steel_drum', 'pluck', 'pad'];
const formatInstrumentName = (name: InstrumentType): string => {
  return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Add type for button style
type ButtonStyle = StyleProp<ViewStyle>;

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
  const [currentChordIndex, setCurrentChordIndex] = useState(0);

  const [clickSound, setClickSound] = useState<Audio.Sound | null>(null);
  const [accentedClickSound, setAccentedClickSound] = useState<Audio.Sound | null>(null);

  // Add after existing state declarations
  const [selectedSound, setSelectedSound] = useState<InstrumentType>('balafon');
  const [isSoundWindowSelected, setIsSoundWindowSelected] = useState(false);

  // Initialize click sounds
  useEffect(() => {
    const loadSounds = async () => {
      try {
        const { sound: normalClick } = await Audio.Sound.createAsync(
          require('@/assets/sounds/click-voice/one.mp3'),
          { 
            volume: 0.45, // -7dB reduction
            shouldPlay: false
          }
        );
        const { sound: accentedClick } = await Audio.Sound.createAsync(
          require('@/assets/sounds/click-voice/four.mp3'),
          { 
            volume: 0.45, // -7dB reduction
            shouldPlay: false
          }
        );
        
        // Keep sounds loaded and ready
        await normalClick.setIsLoopingAsync(false);
        await normalClick.setPositionAsync(0);
        await accentedClick.setIsLoopingAsync(false);
        await accentedClick.setPositionAsync(0);
        
        setClickSound(normalClick);
        setAccentedClickSound(accentedClick);
      } catch (error) {
        console.error('Error loading click sounds:', error);
      }
    };

    void loadSounds();

    return () => {
      if (clickSound) {
        void clickSound.unloadAsync();
      }
      if (accentedClickSound) {
        void accentedClickSound.unloadAsync();
      }
    };
  }, []);

  // Function to play click sound
  const playClick = async (step: number) => {
    if (!isClickEnabled) return;
    await playClickSound(step);
  };

  // Sequencer playback effect
  useEffect(() => {
    if (isPlaying) {
      const stepDuration = (60 / (settings.bpm * 4)) * 1000;
      const stepsPerBar = 16;
      const totalStepsInLoop = stepsPerBar * settings.bars;

      if (isClickEnabled) {
        void playClick(1); // Start with first click sample
      }

      sequencerTimerRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = (prev + 1) % totalStepsInLoop;
          
          if (isClickEnabled) {
            // Get the current bar number (0-3)
            const currentBar = Math.floor(nextStep / 16) % 4;
            // Get the position within the bar (0-15)
            const positionInBar = nextStep % 16;
            
            if (positionInBar === 0) {
              // First beat of each bar uses the bar number (1-4)
              void playClick(currentBar + 1);
            } else if (positionInBar === 4) {
              // Third beat of each bar always plays "two"
              void playClick(2);
            } else if (positionInBar === 8) {
              // Fourth beat of each bar always plays "three"
              void playClick(3);
            } else if (positionInBar === 12) {
              // Fifth beat of each bar always plays "four"
              void playClick(4);
            }
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
    } else {
      setSelectedSetting(undefined);
    }
  };

  // Handle SEQ button press
  const handleSeqButtonPress = (button: 'bpm' | 'bars' | 'timeSig') => {
    setActiveSeqButton(button);
  };

  // Add single press handler
  const handleSinglePress = (direction: 'up' | 'down') => {
    handleSettingAdjust(direction);
  };

  // Update long press handler
  const handlePressIn = (direction: 'up' | 'down') => {
    // First do a single adjustment
    handleSinglePress(direction);
    
    // Clear any existing timers
    if (longPressTimer) {
      clearInterval(longPressTimer);
      setLongPressTimer(null);
    }
    if (initialDelayTimerRef.current) {
      clearTimeout(initialDelayTimerRef.current);
      initialDelayTimerRef.current = null;
    }

    // Set initial delay before starting continuous adjustment
    initialDelayTimerRef.current = setTimeout(() => {
      const timer = setInterval(() => {
        handleSettingAdjust(direction);
      }, 100); // Adjust every 100ms once rapid mode starts
      setLongPressTimer(timer);
      setAdjustmentSpeed(10); // Increase speed after delay
    }, 1000); // 1 second delay before rapid adjustment starts
  };

  const handlePressOut = () => {
    // Reset speed
    setAdjustmentSpeed(1);
    
    // Clear all timers
    if (longPressTimer) {
      clearInterval(longPressTimer);
      setLongPressTimer(null);
    }
    if (initialDelayTimerRef.current) {
      clearTimeout(initialDelayTimerRef.current);
      initialDelayTimerRef.current = null;
    }
  };

  // Add effect to handle sound changes
  useEffect(() => {
    // Update the instrument when selectedSound changes
    void setInstrument(selectedSound);
  }, [selectedSound]);

  // Add cycleSound function
  const cycleSound = () => {
    const currentIndex = availableSounds.indexOf(selectedSound);
    const nextIndex = (currentIndex + 1) % availableSounds.length;
    setSelectedSound(availableSounds[nextIndex]);
  };

  // Update handleSettingAdjust to remove sound cycling
  const handleSettingAdjust = (direction: 'up' | 'down') => {
    if (!selectedSetting && !activeSeqButton) return;

    const increment = direction === 'up' ? 1 : -1;
    const adjustmentMultiplier = adjustmentSpeed;

    // Handle sequencer settings first
    if (activeSeqButton) {
      switch (activeSeqButton) {
        case 'bpm':
          const bpmChange = increment * adjustmentMultiplier;
          setSettings(prev => ({
            ...prev,
            bpm: Math.max(30, Math.min(300, prev.bpm + bpmChange))
          }));
          setBpm(settings.bpm + bpmChange);
          return;
        case 'bars':
          setSettings(prev => ({
            ...prev,
            bars: Math.max(1, Math.min(8, prev.bars + increment))
          }));
          return;
        case 'timeSig':
          const timeSignatures = ['4/4', '3/4', '6/8'];
          const currentIndex = timeSignatures.indexOf(settings.timeSignature);
          const newIndex = (currentIndex + increment + timeSignatures.length) % timeSignatures.length;
          setSettings(prev => ({
            ...prev,
            timeSignature: timeSignatures[newIndex]
          }));
          return;
      }
    }

    // Handle other settings
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
        const newInversion = Math.max(-3, Math.min(3, currentInversion + increment));
        setCurrentInversion(newInversion);
        break;

      default:
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
    const isActive = index === currentStep && isPlaying;

    return (
      <Pressable
        key={index}
        style={[
          styles.stepButton as ViewStyle,
          chord && (styles.stepButtonActive as ViewStyle),
        ]}
        onPress={() => handleStepPress(index)}
      >
        <Text style={[
          styles.stepText as TextStyle,
          isActive ? (styles.stepTextActive as TextStyle) : (styles.stepTextInactive as TextStyle)
        ]}>
          {chord ? chord.root + chord.type : '—'}
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
      <View style={styles.progressionButtonsContainer as ViewStyle}>
        <View style={styles.progressionButtons as ViewStyle}>
          {[0, 1, 2, 3].map((index) => (
            <Pressable
              key={index}
              style={styles.progressionButton as ViewStyle}
            >
              <Text style={styles.progressionButtonText as TextStyle}>{startNumber + index}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={styles.progressionToggleButton as ViewStyle}
          onPress={handleProgressionPageToggle}
        >
          <View style={styles.toggleArrowsContainer as ViewStyle}>
            <Play 
              size={14} 
              color={progressionPage === 0 ? colors.textMuted : colors.textOffWhite}
              style={{ transform: [{ rotate: '180deg' }] }}
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

  // Add the toggle function
  const toggleClick = useCallback(() => {
    setIsClickEnabled(current => !current);
  }, []);

  // Update the settings render function
  const renderSettings = () => {
    return (
      <View style={styles.settingsButtons as ViewStyle}>
        <View style={{ transform: [{ translateX: -4 }] }}>
          <Pressable 
            style={[
              styles.settingsButton as ViewStyle, 
              isClickEnabled && (styles.settingsButtonActive as ViewStyle)
            ]}
            onPress={toggleClick}
          >
            <Text style={styles.settingsButtonName as TextStyle}>CLICK</Text>
            <Text style={styles.settingsButtonValue as TextStyle}>
              {isClickEnabled ? 'ON' : 'OFF'}
            </Text>
          </Pressable>
        </View>
        <Pressable 
          style={[styles.editButton as ViewStyle, isEditPopupVisible && (styles.editButtonActive as ViewStyle)]}
          onPress={() => setIsEditPopupVisible(!isEditPopupVisible)}
        >
          <Text style={styles.editButtonText as TextStyle}>EDIT</Text>
        </Pressable>
        <Pressable 
          style={[styles.toggleButton as ViewStyle, showGrid && (styles.toggleButtonActive as ViewStyle)]}
          onPress={handleToggleView}
        >
          <ArrowLeftRight size={20} color={colors.text} style={{ transform: [{ rotate: '0deg' }] }} />
        </Pressable>
      </View>
    );
  };

  // Simplify the toggle function
  const handleToggleView = () => {
    setShowGrid(!showGrid);
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
    const chordsWithMatchingRoot = diatonicChords.filter(chord => chord.root === note);
    
    // Get available chord types based on the active chord group
    const getChordTypesForGroup = (group: ChordGroup): ChordType[] => {
      switch (group) {
        case 'TRIAD':
          return ['major', 'minor', 'dim', 'augmented', 'sus2', 'sus4'];
        case '4 NOTE':
          return ['7', 'major7', 'minor7', 'm7b5', 'dim7', '6', 'minor6', 'minorMajor7', '7sus4'];
        case 'HIGHER':
          return ['9', 'major9', 'minor9', '11', 'major11', 'major13', 'minor13'];
        case 'RANDOM':
          return ['major', 'minor', 'dim', 'augmented', 'sus2', 'sus4', '7', 'major7', 'minor7', 'major9', 'minor9'];
        default:
          return ['major', 'minor'];
      }
    };

    const allowedTypes = getChordTypesForGroup(activeChordGroup);
    
    // Case-insensitive matching of chord types
    const matchingChords = chordsWithMatchingRoot.filter(chord => 
      allowedTypes.some(type => type.toLowerCase() === chord.type.toLowerCase())
    );

    if (matchingChords.length === 0) {
      // If no matching chords found, create a basic chord based on the active group
      const defaultType = allowedTypes[0] || (mode === 'minor' ? 'minor' : 'major');
      return createChord(note, defaultType);
    }

    // For RANDOM group, pick a random chord from matching chords
    if (activeChordGroup === 'RANDOM') {
      const randomIndex = Math.floor(Math.random() * matchingChords.length);
      return matchingChords[randomIndex];
    }

    // Return the chord at the current index, wrapping around if needed
    return matchingChords[currentChordIndex % matchingChords.length];
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
    
    setCurrentChord(chord);
    void stopChord();
    void playChord(matchingChord.notes);
  };

  // Update cycleChordGroup to properly handle chord updates
  const cycleChordGroup = () => {
    const groups: ChordGroup[] = ['TRIAD', '4 NOTE', 'HIGHER', 'RANDOM'];
    const currentIndex = groups.indexOf(activeChordGroup);
    const nextGroup = groups[(currentIndex + 1) % groups.length];
    setActiveChordGroup(nextGroup);
    
    // Update current chord if a note is selected
    if (selectedNote && isChordinateActive) {
      const availableChords = getAvailableChords(selectedNote as NoteName, currentMode);
      if (availableChords.length > 0) {
        setCurrentChordIndex(0);
        const matchingChord = getChordForNote(selectedNote as NoteName, currentMode);
        if (matchingChord) {
          setCurrentChord(matchingChord);
          void playChord(matchingChord.notes);
        }
      }
    }
  };

  // Update handleNoteSelect to properly sync chord display and playback
  const handleNoteSelect = (note: string) => {
    setSelectedRootNote(note);
    setSelectedNote(note);
    
    if (note) {
      const availableChords = getAvailableChords(note as NoteName, currentMode);
      setAvailableChordOptions(availableChords);
      
      // If CHORDINATE is active, get the appropriate chord and update display
      if (isChordinateActive) {
        const matchingChord = getChordForNote(note as NoteName, currentMode);
        if (matchingChord) {
          setCurrentChord(matchingChord);
          void playChord(matchingChord.notes);
          
          // Update currentChordIndex based on the selected chord
          const chordIndex = availableChords.findIndex(
            option => option.type.toLowerCase() === matchingChord.type.toLowerCase()
          );
          if (chordIndex !== -1) {
            setCurrentChordIndex(chordIndex);
          }
        }
      } else {
        setCurrentChord(null);
        void stopChord();
      }
    }
  };

  // Move handleChordScroll inside component
  const handleChordScroll = (direction: 'up' | 'down') => {
    if (direction === 'up') {
      setCurrentChordIndex((prev: number) => (prev + 1) % availableChordOptions.length);
    } else {
      setCurrentChordIndex((prev: number) => (prev - 1 + availableChordOptions.length) % availableChordOptions.length);
    }
  };

  // Move handleChordinatePress inside component
  const handleChordinatePress = () => {
    setIsChordinateActive(!isChordinateActive);
  };

  // Move renderChordOptions inside component and fix style types
  const renderChordOptions = () => {
    if (!isChordOptionsVisible) return null;
    
    return (
      <Pressable 
        style={styles.editPopupOverlay as ViewStyle}
        onPress={() => setIsChordOptionsVisible(false)}
      >
        <View style={[styles.chordOptionsContainer as ViewStyle, { marginTop: 50 }]}>
          <View style={styles.chordOptionsGrid as ViewStyle}>
            {[0, 1, 2].map((row) => (
              <View key={row} style={styles.chordOptionsRow as ViewStyle}>
                {[0, 1, 2, 3].map((col) => {
                  const position = row * 4 + col;
                  const chord = availableChordOptions[position];
                  const isEmpty = !chord;

                  return (
                    <Pressable
                      key={col}
                      style={[
                        styles.chordOptionButton as ViewStyle,
                        isEmpty && { opacity: 0.3 } as ViewStyle
                      ]}
                      onPress={() => !isEmpty && handleChordOptionPress(chord.type)}
                      disabled={isEmpty}
                    >
                      <Text style={[
                        styles.chordOptionButtonText as TextStyle,
                        isEmpty && { opacity: 0.3 } as TextStyle
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
    );
  };

  // Update the plus/minus buttons to handle chord scrolling
  return (
    <SafeAreaView style={styles.container as ViewStyle}>
      <StatusBar style="light" />
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} currentRoute={pathname} />
      <Pressable style={styles.eyeButton as ViewStyle} onPress={() => setMenuVisible(!menuVisible)}>
        <Eye color={colors.text} size={24} />
      </Pressable>

      {/* Main Content */}
      <View style={styles.mainContent as ViewStyle}>
        {/* Left Side Content */}
        <View style={styles.leftPanel as ViewStyle}>
          {renderSettings()}
          <View style={styles.playButtonContainer as ViewStyle}>
            <Pressable 
              style={[styles.playButton as ViewStyle, isPlaying && (styles.playButtonActive as ViewStyle)]}
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
            onPress={handleChordinatePress}
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
        <View style={styles.rightPanel as ViewStyle}>
          {/* Settings and Piano Container */}
          <View style={styles.settingsAndPianoContainer as ViewStyle}>
            <SettingsPanel
              mode={currentMode}
              octave={currentOctave}
              chord={globalCurrentChord ? `${globalCurrentChord.root}${globalCurrentChord.type}` : ''}
              selectedKey={selectedKey}
              inversion={currentInversion}
              selectedSetting={selectedSetting}
              onSettingSelect={handleSettingSelect}
            />
            
            {/* Replace animated container with simple view switch */}
            <View style={styles.pianoGridContainer as ViewStyle}>
              {!showGrid ? (
                <View style={styles.horizontalPianoContainer as ViewStyle}>
                  <RootNotePiano
                    onNoteSelect={handleNoteSelect}
                    selectedKey={selectedKey}
                    mode={currentMode}
                    isChordinateActive={isChordinateActive}
                    selectedSetting={selectedSetting}
                    activeChordGroup={activeChordGroup}
                    octave={currentOctave}
                    inversion={currentInversion}
                  />
                </View>
              ) : (
                <View style={styles.gridContainer as ViewStyle}>
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
              )}
            </View>

            {/* Cordinate Buttons */}
            <View style={styles.cordinateButtonsContainer}>
              <Pressable
                style={[
                  styles.cordinateButton,
                  styles.cordinateButtonSelected
                ]}
                onPress={cycleChordGroup}
              >
                <Text style={styles.cordinateButtonText}>{activeChordGroup}</Text>
              </Pressable>
              <Pressable 
                style={[
                  styles.soundWindow,
                  isSoundWindowSelected && styles.soundWindowSelected
                ]}
                onPress={() => {
                  cycleSound();
                }}
              >
                <Text style={styles.soundText}>{formatInstrumentName(selectedSound).toUpperCase()}</Text>
              </Pressable>
            </View>
          </View>

          {/* Plus/Minus buttons */}
          <View style={styles.plusMinusContainer}>
            <Pressable 
              style={styles.plusButton}
              onPressIn={() => {
                if (!selectedSetting && isChordinateActive) {
                  handleChordScroll('up');
                } else {
                  handlePressIn('up');
                }
              }}
              onPressOut={handlePressOut}
            >
              <Text style={styles.plusMinusText}>+</Text>
            </Pressable>
            <Pressable 
              style={styles.minusButton}
              onPressIn={() => {
                if (!selectedSetting && isChordinateActive) {
                  handleChordScroll('down');
                } else {
                  handlePressIn('down');
                }
              }}
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
      {renderChordOptions()}
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
    alignItems: 'center',
    transform: [{ translateX: 80 }]
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
    justifyContent: 'flex-start',
    marginTop: 35,
    marginLeft: 280,
    paddingHorizontal: 0,
    position: 'relative',
    width: '100%',
    gap: 20
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
    marginLeft: -55
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
    width: '110%',
    height: 180,
    position: 'relative',
    marginTop: 0,
    marginRight: -20,
  },
  horizontalPianoContainer: {
    width: '100%',
    height: '100%',
    transform: [{ translateX: 20 }],
    marginBottom: -20
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
    width: '100%',
    gap: 8,
    paddingRight: 10,
    backgroundColor: 'transparent',
    position: 'relative'
  },
  gridPageToggle: {
    width: 43,
    height: 29,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: -150,
    top: '46%',
    transform: [
      { rotate: '270deg' },
      { translateY: -14.5 }
    ],
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    backgroundColor: 'transparent',
    zIndex: 10
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
    flex: 1,
  },
  animatedView: {
    flex: 1,
  },
  visible: {
    opacity: 1,
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
  },
  soundWindow: {
    width: 132,
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -190 }],
    position: 'absolute',
    left: 0,
  },
  soundWindowSelected: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
  },
  soundText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
});