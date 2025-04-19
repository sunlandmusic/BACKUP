import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Eye, Play, Square } from 'lucide-react-native';
import { usePathname } from 'expo-router';
import { colors } from '@/constants/colors';
import { NavigationMenu } from '@/components/NavigationMenu';
import { RootNotePiano } from '@/components/RootNotePiano';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Chord, NoteName, MusicMode } from '@/types/music';
import { initAudio, playChord, stopChord, stopAllSounds, setBpm } from '@/utils/audio-utils';

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

export default function CordinateScreen() {
  // Navigation menu state
  const [menuVisible, setMenuVisible] = useState(false);
  const [isChordinateActive, setIsChordinateActive] = useState(false);
  const pathname = usePathname();

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

  const [selectedRootNote, setSelectedRootNote] = useState('');

  // Settings panel state
  const [selectedSetting, setSelectedSetting] = useState<'bpm' | 'bars' | undefined>();
  const [currentMode, setCurrentMode] = useState<MusicMode>('major');
  const [currentOctave, setCurrentOctave] = useState(0);
  const [currentChord, setCurrentChord] = useState('');
  const [selectedKey, setSelectedKey] = useState<NoteName>('C');
  const [isClickEnabled, setIsClickEnabled] = useState(false);

  const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const MODES = ['major', 'minor', 'diminished', 'augmented'];
  const OCTAVES = [-3, -2, -1, 0, 1, 2, 3];

  const [selectedButton, setSelectedButton] = useState<number | null>(null);

  // Edit functionality state
  const [isEditPopupVisible, setIsEditPopupVisible] = useState(false);
  const [editHistory, setEditHistory] = useState<Array<StepSequencerState>>([]);
  const [editHistoryIndex, setEditHistoryIndex] = useState(-1);

  // Add new state for progression page
  const [progressionPage, setProgressionPage] = useState(0);

  const handleCordinateButtonPress = (index: number) => {
    setSelectedButton(index === selectedButton ? null : index);
  };

  // Initialize audio on component mount
  useEffect(() => {
    const setupAudio = async () => {
      const audioContext = await initAudio();
      if (audioContext) {
        // Create gain node for click sound
        const clickGain = audioContext.createGain();
        clickGain.gain.value = 0.1; // Set click volume
        clickGain.connect(audioContext.destination);
        clickGainRef.current = clickGain;
      }
    };
    
    setupAudio();

    // Cleanup function
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
    // TODO: Implement step press logic
  };

  // Handle sequencer page toggle
  const handleSeqPageToggle = () => {
    setSeqGridPage(prev => prev === 0 ? 1 : 0);
  };

  // Handle settings selection
  const handleSettingSelect = (setting: 'bpm' | 'bars') => {
    setSelectedSetting(prev => prev === setting ? undefined : setting);
  };

  // Handle settings adjustment
  const handleSettingAdjust = (direction: 'up' | 'down') => {
    if (!selectedSetting) return;

    switch (selectedSetting) {
      case 'bpm':
        setSettings(prev => {
          const newBpm = direction === 'up' 
            ? Math.min(prev.bpm + 1, 240)
            : Math.max(prev.bpm - 1, 40);
          return { ...prev, bpm: newBpm };
        });
        break;
      case 'bars':
        setSettings(prev => {
          const newBars = direction === 'up'
            ? Math.min(prev.bars + 1, 16)
            : Math.max(prev.bars - 1, 1);
          return { ...prev, bars: newBars };
        });
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
        <Pressable 
          style={[styles.settingsButton, selectedSetting === 'bpm' && styles.settingsButtonActive]}
          onPress={() => handleSettingSelect('bpm')}
        >
          <Text style={styles.settingsButtonName}>BPM</Text>
          <Text style={styles.settingsButtonValue}>{settings.bpm}</Text>
        </Pressable>
        <Pressable 
          style={[styles.settingsButton, selectedSetting === 'bars' && styles.settingsButtonActive]}
          onPress={() => handleSettingSelect('bars')}
        >
          <Text style={styles.settingsButtonName}>BARS</Text>
          <Text style={styles.settingsButtonValue}>{settings.bars}</Text>
        </Pressable>
        <Pressable 
          style={[styles.settingsButton, isClickEnabled && styles.settingsButtonActive]}
          onPress={() => setIsClickEnabled(!isClickEnabled)}
        >
          <Text style={styles.settingsButtonName}>CLICK</Text>
          <Text style={styles.settingsButtonValue}>{isClickEnabled ? 'ON' : 'OFF'}</Text>
        </Pressable>
        <Pressable 
          style={[styles.editButton, isEditPopupVisible && styles.editButtonActive]}
          onPress={() => setIsEditPopupVisible(!isEditPopupVisible)}
        >
          <Text style={styles.editButtonText}>EDIT</Text>
        </Pressable>
      </View>
    );
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
        {/* Step Sequencer on Left */}
        <View style={styles.sequencerContainer}>
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
          </View>
          {renderStepSequencer()}
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
          <Pressable style={styles.chordOptionsButton}>
            <Text style={styles.chordOptionsText}>CHORD OPTIONS</Text>
          </Pressable>
        </View>

        {/* Right Side Panel */}
        <View style={styles.rightPanel}>
          {/* Settings and Piano Container */}
          <View style={styles.settingsAndPianoContainer}>
            {/* Settings Panel */}
            <SettingsPanel
              key={selectedRootNote || 'C'}
              mode={currentMode}
              octave={currentOctave}
              chord={currentChord}
              selectedKey={selectedKey}
              selectedSetting={selectedSetting}
            />
            
            {/* Root Note Piano */}
            <View style={[
              styles.pianoContainer,
              {
                transform: [
                  { translateY: 40 },
                  { translateX: 12 }
                ]
              }
            ]}>
              <RootNotePiano 
                onNoteSelect={setSelectedRootNote}
                selectedKey={selectedKey}
                mode={currentMode}
              />
            </View>

            {/* Cordinate Buttons */}
            <View style={styles.cordinateButtonsContainer}>
              {['TRIAD', '4 NOTE', 'HIGHER', 'RANDOM', 'CUSTOM'].map((label, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.cordinateButton,
                    selectedButton === index && styles.cordinateButtonActive
                  ]}
                  onPress={() => handleCordinateButtonPress(index)}
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
    alignItems: 'flex-start'
  },
  settingsAndPianoContainer: {
    width: 370,
    marginLeft: -61,
    marginTop: 60
  },
  sequencerContainer: {
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
    marginTop: -43
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
    transform: [{ translateY: 53 }],
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
    alignItems: 'center'
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
    gap: 8,
    justifyContent: 'center',
    width: '100%',
    marginBottom: 0,
    alignItems: 'flex-start',
    paddingRight: 25,
    marginLeft: 25
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
    fontSize: 12,
    marginBottom: 4
  },
  settingsButtonValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold'
  },
  playButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 0,
    transform: [{ translateX: -138 }, { translateY: -55 }],
    position: 'relative',
    zIndex: 2
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center'
  },
  playButtonActive: {
    backgroundColor: colors.buttonActive
  },
  cordinateButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 40,
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
    marginTop: 7
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
  }
});