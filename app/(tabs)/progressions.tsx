import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, SafeAreaView, Pressable, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/colors";
import { Eye, Play, Pause, Square, Circle } from "lucide-react-native";
import { NavigationMenu } from "@/components/NavigationMenu";
import { usePathname } from "expo-router";
import { useChordStore } from "@/stores/chord-store";
import { Chord, ChordType, NoteName, noteNames } from "@/types/music";
import { playChord, stopChord, initAudio } from "@/utils/audio-utils";
import { createChord, getScaleNotes } from "@/utils/chord-utils";

import { SavedChordButton } from "@/components/SavedChordButton";

interface SettingsState {
  bpm: number;
  timeSignature: '4/4' | '3/4' | '6/8';
  click: boolean;
  bars: number;
}

interface StepSequencerState {
  steps: boolean[];
  currentStep: number;
}

type SavedSection = {
  steps: boolean[];
  settings: SettingsState;
};

export default function ProgressionsScreen() {

  // Navigation menu state
  const [menuVisible, setMenuVisible] = useState(false);
  const pathname = usePathname();
  const {
    currentChord,
    setCurrentChord,
    savedChords,
    saveChord,
    currentKey,
    setCurrentKey,
    currentMode,
    setCurrentMode
  } = useChordStore();

  // Transport controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<SettingsState>({
    bpm: 120,
    timeSignature: '4/4',
    click: true,
    bars: 8
  });
  const [selectedSetting, setSelectedSetting] = useState<keyof SettingsState | null>(null);

  // Step sequencer state
  const [stepSequencer, setStepSequencer] = useState<StepSequencerState>({
    steps: new Array(32).fill(false),
    currentStep: 0
  });

  // Saved sections state
  const [savedSections, setSavedSections] = useState<SavedSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);

  // Delete mode state
  const [deleteMode, setDeleteMode] = useState(false);

  // Event Handlers
  const toggleMenu = () => setMenuVisible(!menuVisible);

  const handleTransportPress = (action: 'record' | 'play' | 'stop') => {
    switch (action) {
      case 'record':
        setIsRecording(!isRecording);
        setIsPlaying(true);
        break;
      case 'play':
        setIsPlaying(!isPlaying);
        break;
      case 'stop':
        setIsPlaying(false);
        setIsRecording(false);
        break;
    }
  };

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
      }
      
      return newSettings;
    });
  };

  const handleStepPress = (index: number) => {
    setStepSequencer(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => i === index ? !step : step)
    }));
  };

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

    setSelectedSection(index);
    // Load the section's data
    const section = savedSections[index];
    if (section) {
      setSettings(section.settings);
      setStepSequencer(prev => ({
        ...prev,
        steps: section.steps
      }));
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
  const [lastPlayedChord, setLastPlayedChord] = useState<Chord | null>(null);
  
  // For contextual +/- buttons
  const [selectedControl, setSelectedControl] = useState<'key' | 'mode' | 'inversion' | 'voicing' | 'octave' | null>('key');
  
  // For saved chord pagination
  const [savedChordPage, setSavedChordPage] = useState(0);
  const savedChordsPerPage = 16;
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

  // Handle note press on piano
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
      setCurrentChord(chord);
      setLastPlayedChord(chord); // Store as last played chord
      playChord(chord.notes);
      
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
  
  // Handle note release on piano - stop all sounds
  const handleNoteRelease = () => {
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
          setInversion(prev => prev < 3 ? prev + 1 : prev);
        } else {
          setInversion(prev => prev > -3 ? prev - 1 : prev);
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

  // Handle saved chord press
  const handleSavedChordPress = (index: number) => {
    if (saveMode) {
      // In save mode, pressing a chord slot saves the current chord or last played chord
      handleSaveCurrentChord(index);
      setSaveMode(false);
      return;
    }
    
    if (savedChords.length <= index) return;
    
    const chord = savedChords[index];
    if (!chord) return;
    
    // Play the chord
    playChord(chord.notes);
    
    // Set the current chord in the store
    setCurrentChord(chord);
  };

  // Handle saved chord release - immediately stop sound and clear highlight
  const handleSavedChordRelease = () => {
    // Stop playing the chord
    stopChord();
    
    // Clear the current chord and any visual feedback
    setCurrentChord(null);
    setTempHighlightedChord(null);
    setActiveSavedChordIndex(null);
  };

  // Handle saving current chord
  const handleSaveCurrentChord = (index: number) => {
    // Use either the current chord or the last played chord, whichever is available
    const chordToSave = currentChord || lastPlayedChord;
    
    if (!chordToSave || index >= maxSavedChords) return;
    saveChord(chordToSave, index);
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

  // Toggle navigation menu


  // Handle control selection
  const handleControlSelect = (control: 'key' | 'mode' | 'inversion' | 'voicing' | 'octave') => {
    setSelectedControl(control);
  };

  // Get chord display name
  const getChordDisplayName = () => {
    if (!currentChord) return '';
    
    let displayName = currentChord.root;
    
    switch (currentChord.type) {
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
    if (currentChord.bassNote && currentChord.bassNote !== currentChord.root) {
      displayName += `/${currentChord.bassNote}`;
    }
    
    return displayName;
  };



  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <NavigationMenu visible={menuVisible} onClose={toggleMenu} currentRoute={pathname} />
      <Pressable style={styles.eyeButton} onPress={toggleMenu}>
        <Eye color={colors.text} size={24} />
      </Pressable>

      {/* Transport and Settings Controls */}
      <View style={styles.topControls}>
        <View style={styles.settingsContainer}>
          <Pressable 
            style={[styles.settingButton, selectedSetting === 'bpm' && styles.selectedSetting]}
            onPress={() => handleSettingSelect('bpm')}
          >
            <Text style={styles.settingLabel}>BPM</Text>
            <Text style={styles.settingValue}>{settings.bpm}</Text>
          </Pressable>
          <Pressable 
            style={[styles.settingButton, selectedSetting === 'timeSignature' && styles.selectedSetting]}
            onPress={() => handleSettingSelect('timeSignature')}
          >
            <Text style={styles.settingLabel}>T/S</Text>
            <Text style={styles.settingValue}>{settings.timeSignature}</Text>
          </Pressable>
          <Pressable 
            style={[styles.settingButton, selectedSetting === 'click' && styles.selectedSetting]}
            onPress={() => handleSettingSelect('click')}
          >
            <Text style={styles.settingLabel}>CLICK</Text>
            <Text style={styles.settingValue}>{settings.click ? 'ON' : 'OFF'}</Text>
          </Pressable>
          <Pressable 
            style={[styles.settingButton, selectedSetting === 'bars' && styles.selectedSetting]}
            onPress={() => handleSettingSelect('bars')}
          >
            <Text style={styles.settingLabel}>BARS</Text>
            <Text style={styles.settingValue}>{settings.bars}</Text>
          </Pressable>
        </View>
      </View>

      {/* Saved chords grid */}
      <View style={styles.savedChordsContainer}>
        <View style={styles.controlsRow}>
          <View style={styles.transportContainer}>
            <Pressable 
              style={[styles.transportButton, isRecording && styles.activeTransportButton]}
              onPress={() => handleTransportPress('record')}
            >
              <Circle size={24} color={isRecording ? colors.error : colors.text} fill={isRecording ? colors.error : 'transparent'} />
            </Pressable>
            <Pressable 
              style={[styles.transportButton, isPlaying && styles.activeTransportButton]}
              onPress={() => handleTransportPress('play')}
            >
              {isPlaying ? <Pause color={colors.text} size={24} /> : <Play color={colors.text} size={24} />}
            </Pressable>
            <Pressable 
              style={styles.transportButton}
              onPress={() => handleTransportPress('stop')}
            >
              <Square color={colors.text} size={24} />
            </Pressable>
          </View>
          <View style={styles.adjustButtonsContainer}>
            <Pressable 
              style={styles.settingButton}
              onPress={() => handleSettingAdjust('bars', -1)}
            >
              <Text style={styles.settingValue}>-</Text>
            </Pressable>
            <Pressable 
              style={styles.settingButton}
              onPress={() => handleSettingAdjust('bars', 1)}
            >
              <Text style={styles.settingValue}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.savedChordsGrid}>
          {Array.from({ length: savedChordsPerPage }).map((_, index) => {
            const chordIndex = savedChordPage * savedChordsPerPage + index;
            return (
              <SavedChordButton
                key={chordIndex}
                index={chordIndex}
                onPress={() => handleSavedChordPress(chordIndex)}
                onPressOut={handleSavedChordRelease}
                isHighlighted={activeSavedChordIndex === chordIndex}
                saveMode={saveMode}
                label={savedChords[chordIndex]?.root || ''}
                color={colors.surface}
                chord={savedChords[chordIndex]}
              />
            );
          })}
        </View>
      </View>
      
      {/* Navigation Menu */}
      <NavigationMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
        currentRoute={pathname}
      />
      


      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <Pressable 
          style={[styles.deleteButton, deleteMode && styles.deleteActive]}
          onPress={handleDeletePress}
        >
          <Text style={styles.deleteButtonText}>DEL</Text>
        </Pressable>

        <View style={styles.savedSectionsContainer}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Pressable
              key={`section-${index}`}
              style={[styles.sectionButton, selectedSection === index && styles.selectedSection]}
              onPress={() => handleSectionPress(index)}
            >
              <Text style={styles.sectionButtonText}>{index + 1}</Text>
            </Pressable>
          ))}
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingRight: 16,
  },
  transportContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  topControls: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  adjustButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  transportButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: colors.error,
  },
  playingButton: {
    backgroundColor: colors.primary,
  },
  settingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.buttonGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSetting: {
    backgroundColor: colors.primary,
  },
  settingLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  settingValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  savedChordsContainer: {
    width: 272,
    marginLeft: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  savedChordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    width: 272,
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 8,
  },
  transportButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
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
  savedChordText: {
    color: colors.text,
    fontSize: 16,
  },
  sequencerContainer: {
    flex: 1,
  },
  sequencerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  stepButton: {
    width: 32,
    height: 48,
    backgroundColor: colors.buttonGrey,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStep: {
    backgroundColor: colors.primary,
  },
  stepText: {
    color: colors.text,
    fontSize: 12,
  },
  adjustButtonsContainer: {
    width: 45,
    marginLeft: 16,
  },
  adjustButton: {
    height: 140,
    backgroundColor: colors.buttonGrey,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  adjustButtonText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  deleteButton: {
    width: 68,
    height: 24,
    backgroundColor: colors.buttonGrey,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActive: {
    backgroundColor: colors.error,
  },
  deleteButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  savedSectionsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  sectionButton: {
    width: 68,
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
});