import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Modal, TouchableOpacity, ImageBackground } from 'react-native';
import { Eye, Save, Image as ImageIcon } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { NoteName, MusicMode, Chord, ChordType, InstrumentType } from '@/types/music';
import { getScaleNotes, getDiatonicChords, createChord } from '@/utils/chord-utils';
import { useChordStore } from '@/stores/chord-store';
import { playChord, stopChord } from '@/utils/audio-utils';
import { NavigationMenu } from '@/components/NavigationMenu';
import { usePathname, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PianoXLProps {
  onNoteSelect?: (note: string) => void;
}

const MODES: MusicMode[] = ['off', 'major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'] as MusicMode[];
const KEYS: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as NoteName[];

// Define chord progressions for each scale degree
const MAJOR_SCALE_CHORDS: { [key: string]: ChordType[] } = {
  '1': ['major', 'major7', 'major9', 'add9', 'major11', 'major13', '6', '69'],
  '2': ['minor', 'minor7', 'minor9', 'm11'],
  '3': ['minor', 'minor7', 'minor9', 'm11'],
  '4': ['major', 'major7', 'major9', 'add9'],
  '5': ['major', '7', '9', '11'],
  '6': ['minor', 'minor7', 'minor9', 'm11'],
  '7': ['dim', 'dim7', 'm7b5'],
};

const MINOR_SCALE_CHORDS: { [key: string]: ChordType[] } = {
  '1': ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6'],
  '2': ['dim', 'dim7', 'm7b5'],
  '3': ['major', 'major7', 'add9'],
  '4': ['minor', 'minor7', 'minor9'],
  '5': ['minor', 'minor7', 'minor9'],
  '6': ['major', 'major7', 'add9'],
  '7': ['major', '7', '9'],
};

const availableSounds: InstrumentType[] = ['balafon', 'piano', 'rhodes', 'steel_drum', 'pluck', 'pad'];
const formatInstrumentName = (name: InstrumentType): string => {
  return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Add type definition
type SettingType = 'key' | 'mode' | 'octave' | 'inversion';

export function PianoXL({ onNoteSelect }: PianoXLProps) {
  // State
  const [selectedKey, setSelectedKey] = useState<NoteName>('A#');
  const [mode, setMode] = useState<MusicMode>('minor');
  const [octave, setOctave] = useState(0);
  const [inversion, setInversion] = useState(0);
  const [currentChord, setCurrentChord] = useState<Chord | null>(null);
  const [scaleNotes, setScaleNotes] = useState<NoteName[]>([]);
  const [selectedControl, setSelectedControl] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const pathname = usePathname();
  const [lastPressedNote, setLastPressedNote] = useState<NoteName | null>(null);
  const [chordTypeIndices, setChordTypeIndices] = useState<{ [key: string]: number }>({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [nextEmptyIndex, setNextEmptyIndex] = useState<number | null>(null);
  const { setCurrentChord: setStoreChord, savedChords, saveChord } = useChordStore();
  const [selectedSound, setSelectedSound] = useState<InstrumentType>('balafon');
  const [isSoundWindowSelected, setIsSoundWindowSelected] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isSlotSelectionActive, setIsSlotSelectionActive] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  
  // Update scale notes when key or mode changes
  useEffect(() => {
    if (selectedKey && mode) {
      setScaleNotes(getScaleNotes(selectedKey, mode));
    }
  }, [selectedKey, mode]);

  // Get available chord types for a note based on scale degree
  const getAvailableChordTypes = (note: NoteName): ChordType[] => {
    if (!scaleNotes.includes(note)) return [];
    
    const scaleIndex = scaleNotes.indexOf(note);
    const scaleDegree = (scaleIndex + 1).toString();
    
    return mode === 'minor' ? 
      MINOR_SCALE_CHORDS[scaleDegree] || [] : 
      MAJOR_SCALE_CHORDS[scaleDegree] || [];
  };

  // Get current chord type for a note
  const getCurrentChordType = (note: NoteName): ChordType => {
    const availableTypes = getAvailableChordTypes(note);
    const currentIndex = chordTypeIndices[note] || 0;
    return availableTypes[currentIndex] || 'major';
  };

  // Get chord name for a note in the current scale
  const getChordName = (note: NoteName): string => {
    if (!scaleNotes.includes(note)) return '';
    
    const chordType = getCurrentChordType(note);
    let name = note;
    
    switch (chordType) {
      case 'major': break;
      case 'minor': name += 'm'; break;
      case 'dim': name += 'dim'; break;
      case 'major7': name += 'maj7'; break;
      case 'minor7': name += 'm7'; break;
      case 'major9': name += 'maj9'; break;
      case 'minor9': name += 'm9'; break;
      case '7': name += '7'; break;
      case '9': name += '9'; break;
      case '11': name += '11'; break;
      case 'add9': name += 'add9'; break;
      case 'm7b5': name += 'm7b5'; break;
      case 'm11': name += 'm11'; break;
      case 'dim7': name += 'dim7'; break;
      case 'major11': name += 'maj11'; break;
      case 'major13': name += 'maj13'; break;
      case '6': name += '6'; break;
      case '69': name += '69'; break;
      case 'minor6': name += 'm6'; break;
      case 'minor13': name += 'm13'; break;
      default: name += chordType;
    }
    return name;
  };

  // Handle key press - updated to store last pressed note and deselect settings
  const handleKeyPress = (note: string) => {
    if (!scaleNotes.includes(note as NoteName)) return;
    
    setLastPressedNote(note as NoteName);
    const chordType = getCurrentChordType(note as NoteName);
    const chord = createChord(note as NoteName, chordType);
    
    if (chord) {
      try {
        // Apply octave and inversion if they are set
        const modifiedNotes = chord.notes.map(note => {
          let modifiedNote = note;
          if (octave !== 0) {
            modifiedNote += 12 * octave;
          }
          return modifiedNote;
        });

        // Apply inversion if set
        if (inversion !== 0) {
          for (let i = 0; i < Math.abs(inversion); i++) {
            if (inversion > 0) {
              // Move the lowest note up an octave
              modifiedNotes[0] += 12;
              modifiedNotes.push(modifiedNotes.shift()!);
            } else {
              // Move the highest note down an octave
              modifiedNotes[modifiedNotes.length - 1] -= 12;
              modifiedNotes.unshift(modifiedNotes.pop()!);
            }
          }
        }

        playChord(modifiedNotes, selectedSound);
        const modifiedChord = { ...chord, notes: modifiedNotes };
        setStoreChord(modifiedChord);
        setCurrentChord(modifiedChord);
      } catch (error) {
        // Silently catch AVFoundation errors
      }
      onNoteSelect?.(note);
    }
  };

  // Handle setting selection
  const handleSettingSelect = (setting: SettingType) => {
    setSelectedControl(selectedControl === setting ? null : setting);
  };

  // Handle value adjustments with limits
  const handleAdjustValue = (direction: 'up' | 'down') => {
    console.log('Adjusting value:', direction, 'Selected control:', selectedControl);

    // If sound window is selected, handle sound selection
    if (isSoundWindowSelected) {
      const currentIndex = availableSounds.indexOf(selectedSound);
      const newIndex = direction === 'up' ? 
        (currentIndex + 1) % availableSounds.length :
        (currentIndex - 1 + availableSounds.length) % availableSounds.length;
      setSelectedSound(availableSounds[newIndex]);
        return;
      }

    // If save confirmation is visible and slot selection is active
    if (showSaveConfirm && isSlotSelectionActive && selectedSlot !== null) {
      const emptySlots = findEmptySlots();
      const currentIndex = emptySlots.indexOf(selectedSlot);
      const newIndex = direction === 'up' ?
        (currentIndex + 1) % emptySlots.length :
        (currentIndex - 1 + emptySlots.length) % emptySlots.length;
      setSelectedSlot(emptySlots[newIndex]);
        return;
      }

    // Handle setting adjustments
    if (selectedControl) {
      console.log('Adjusting setting:', selectedControl);
      switch (selectedControl) {
        case 'key':
          const currentKeyIndex = KEYS.indexOf(selectedKey);
          const newKeyIndex = direction === 'up' ?
            (currentKeyIndex + 1) % KEYS.length :
            (currentKeyIndex - 1 + KEYS.length) % KEYS.length;
          setSelectedKey(KEYS[newKeyIndex]);
          break;

        case 'mode':
          const currentModeIndex = MODES.indexOf(mode);
          const newModeIndex = direction === 'up' ?
            (currentModeIndex + 1) % MODES.length :
            (currentModeIndex - 1 + MODES.length) % MODES.length;
          setMode(MODES[newModeIndex]);
          break;

        case 'octave':
          setOctave(prev => {
            const newValue = direction === 'up' ? prev + 1 : prev - 1;
            return Math.max(-3, Math.min(3, newValue));
          });
          break;

        case 'inversion':
          setInversion(prev => {
            const newValue = direction === 'up' ? prev + 1 : prev - 1;
            return Math.max(-2, Math.min(2, newValue));
          });
          break;
      }
      return;
    }

    // Handle chord type cycling when no setting is selected
    if (lastPressedNote && scaleNotes.includes(lastPressedNote)) {
      const availableTypes = getAvailableChordTypes(lastPressedNote);
      if (availableTypes.length === 0) return;
      
      const currentIndex = chordTypeIndices[lastPressedNote] || 0;
      const newIndex = direction === 'up' ?
        (currentIndex + 1) % availableTypes.length :
        (currentIndex - 1 + availableTypes.length) % availableTypes.length;

      setChordTypeIndices(prev => ({
        ...prev,
        [lastPressedNote]: newIndex
      }));

      const newChordType = availableTypes[newIndex];
      const newChord = createChord(lastPressedNote, newChordType);
      if (newChord) {
        setStoreChord(newChord);
        setCurrentChord(newChord);
      }
    }
  };

  // Reset chord type indices when key or mode changes
  useEffect(() => {
    setChordTypeIndices({});
    setLastPressedNote(null);
  }, [selectedKey, mode]);

  // Toggle menu
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  // Add helper function for mode display
  const renderModeWithAlternateName = (mode: string) => {
    const upperMode = mode.toUpperCase();
    let mainText = '';
    let alternateName = '';
    
    switch (upperMode) {
      case 'OFF': 
        mainText = '';  // Remove MODE from here since it's handled by the label
        alternateName = 'OFF';
        break;
      case 'MAJOR': 
        mainText = 'MAJOR';
        alternateName = 'IONIAN';
        break;
      case 'MINOR': 
        mainText = 'MINOR';
        alternateName = 'AEOLIAN';
        break;
      case 'MIXOLYDIAN': 
        mainText = 'MIXO';
        alternateName = 'LYDIAN';
        break;
      case 'PHRYGIAN':
        mainText = 'PHRYG';
        alternateName = 'IAN';
        break;
      default: 
        mainText = upperMode;
        break;
    }

    return (
      <View style={styles.modeValueContainer}>
        {mainText && <Text style={styles.settingValue}>{mainText}</Text>}
        {alternateName && (
          <Text style={styles.alternateModeName}>{alternateName}</Text>
        )}
      </View>
    );
  };

  // Settings panel component
  const SettingItem = ({ label, value, isSelected, onPress }: { 
    label: string; 
    value: string | number; 
    isSelected?: boolean;
    onPress?: () => void;
  }) => {
    // Add dynamic font size calculation for chord display
    const getChordFontSize = (chordName: string) => {
      const length = chordName.length;
      if (length <= 5) return 28; // Maximum size for short names
      if (length <= 7) return 24;
      if (length <= 9) return 20;
      return 16; // Minimum size for very long names
    };

    const settingType = label.toLowerCase() as SettingType;
    
    return (
    <Pressable 
        style={[
          styles.settingItem,
          label === 'MODE' && styles.modeSettingItem,
          label === 'CHORD' && styles.chordDisplay,
          isSelected && styles.selectedSetting
        ]}
      onPress={onPress}
    >
        {(label !== 'MODE' || value.toString().toUpperCase() === 'OFF') && (
      <Text style={styles.settingLabel}>{label}</Text>
        )}
      {label === 'MODE' ? (
        renderModeWithAlternateName(value.toString())
      ) : (
        <Text style={[
          styles.settingValue,
          label === 'CHORD' && [
            styles.chordValue,
            { fontSize: getChordFontSize(value.toString()) }
          ]
        ]}>{value}</Text>
      )}
    </Pressable>
  );
  };

  // Piano key component with chord name
  const PianoKey = ({ isWhite = true, note }: { isWhite?: boolean; note: string }) => {
    const chordName = getChordName(note as NoteName);
    const isInScale = scaleNotes.includes(note as NoteName);

    return (
      <Pressable 
        style={[
          styles.pianoKey,
          isWhite ? styles.whiteKey : styles.blackKey,
          isInScale && styles.keyInScale
        ]}
        onPressIn={() => handleKeyPress(note)}
        onPressOut={() => {
          stopChord();
          setCurrentChord(null);
        }}
      >
        <View style={styles.keyContent}>
          {isInScale && (
            <Text style={[
              styles.chordNameText,
              isWhite ? styles.whiteKeyText : styles.blackKeyText
            ]}>
              {chordName}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  // Find next empty slot and all available empty slots
  const findEmptySlots = () => {
    const emptySlots: number[] = [];
    for (let i = 0; i < 32; i++) {
      if (!savedChords[i]) {
        emptySlots.push(i);
      }
    }
    return emptySlots;
  };

  // Handle slot selection
  const handleSlotSelect = () => {
    setIsSlotSelectionActive(!isSlotSelectionActive);
  };

  // Handle save button press
  const handleSavePress = () => {
    if (!lastPressedNote) {
      return;
    }
    
    const emptySlots = findEmptySlots();
    if (emptySlots.length === 0) {
      return;
    }
    
    setSelectedSlot(emptySlots[0]);
      setShowSaveConfirm(true);
  };

  // Handle save confirmation
  const handleSaveConfirm = () => {
    if (selectedSlot === null || !lastPressedNote) {
      return;
    }

    const chordType = getCurrentChordType(lastPressedNote);
    const chord = createChord(lastPressedNote, chordType);
    
    if (chord) {
      saveChord(chord, selectedSlot);
    }
    
    setShowSaveConfirm(false);
    setIsSlotSelectionActive(false);
  };

  // Add useEffect to monitor savedChords changes
  useEffect(() => {
    console.log('Current saved chords:', savedChords);
  }, [savedChords]);

  const cycleInstrument = () => {
    const currentIndex = availableSounds.indexOf(selectedSound);
    const nextSound = availableSounds[(currentIndex + 1) % availableSounds.length];
    setSelectedSound(nextSound);
  };

  // Add a helper function to get the full chord name
  const getFullChordName = (chord: Chord | null): string => {
    if (!chord) return '';
    return getChordName(chord.root);
  };

  // Add dynamic font size calculation for chord display
  const getChordFontSize = (chordName: string) => {
    const length = chordName.length;
    if (length <= 5) return 28; // Maximum size for short names
    if (length <= 7) return 24;
    if (length <= 9) return 20;
    return 16; // Minimum size for very long names
  };

  // Load saved background on mount
  useEffect(() => {
    loadSavedBackground();
  }, []);

  const loadSavedBackground = async () => {
    try {
      const savedImage = await AsyncStorage.getItem('pianoXLBackground');
      if (savedImage) {
        setBackgroundImage(savedImage);
      }
    } catch (error) {
      console.log('Error loading background:', error);
    }
  };

  const handleSelectBackground = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: true,
        aspect: [21, 9],
      });

      if (!result.canceled && result.assets[0].uri) {
        const uri = result.assets[0].uri;
        setBackgroundImage(uri);
        await AsyncStorage.setItem('pianoXLBackground', uri);
      }
    } catch (error) {
      console.log('Error selecting background:', error);
    }
  };

  const handleRemoveBackground = async () => {
    setBackgroundImage(null);
    await AsyncStorage.removeItem('pianoXLBackground');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentOverlay}>
        {/* Eye button */}
        <Pressable style={styles.eyeButton} onPress={toggleMenu}>
          <Eye size={28} color={colors.text} />
        </Pressable>

        {/* Skin button */}
        <Pressable 
          style={styles.skinButton} 
          onPress={handleSelectBackground}
          onLongPress={handleRemoveBackground}
        >
          <ImageIcon size={20} color={colors.text} />
        </Pressable>

        {/* Save button */}
        <Pressable style={styles.saveButton} onPress={handleSavePress}>
          <View style={styles.saveButtonTextContainer}>
            <Text style={styles.saveButtonText}>SAVE</Text>
            <Text style={styles.saveButtonText}>CHORD</Text>
          </View>
        </Pressable>

        {/* Sound selection window */}
        <Pressable 
          style={[
            styles.soundWindow,
            isSoundWindowSelected && styles.soundWindowSelected
          ]}
          onPress={cycleInstrument}
        >
          <Text style={styles.soundText}>{formatInstrumentName(selectedSound).toUpperCase()}</Text>
        </Pressable>

        {backgroundImage && (
          <ImageBackground 
            source={{ uri: backgroundImage }} 
            style={styles.backgroundImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.mainContent}>
          {/* Piano Keys */}
          <View style={styles.pianoContainer}>
            <View style={styles.whiteKeysRow}>
              {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(note => (
                <PianoKey key={note} note={note} isWhite={true} />
              ))}
            </View>
            <View style={styles.blackKeysRow}>
              {['C#', 'D#', null, 'F#', 'G#', 'A#'].map((note, index) => (
                note ? <PianoKey key={note} note={note} isWhite={false} /> : <View key={index} style={styles.blackKeyPlaceholder} />
              ))}
            </View>
          </View>

          {/* Settings Panel */}
          <View style={styles.settingsPanel}>
            <SettingItem 
              label="KEY" 
              value={selectedKey}
              isSelected={selectedControl === 'key'}
              onPress={() => handleSettingSelect('key')}
            />
            <SettingItem 
              label="MODE" 
              value={mode}
              isSelected={selectedControl === 'mode'}
              onPress={() => handleSettingSelect('mode')}
            />
            <SettingItem 
              label="OCT" 
              value={octave}
              isSelected={selectedControl === 'octave'}
              onPress={() => handleSettingSelect('octave')}
            />
            <SettingItem 
              label="INV" 
              value={inversion}
              isSelected={selectedControl === 'inversion'}
              onPress={() => handleSettingSelect('inversion')}
            />
            <View style={styles.chordDisplay}>
              <Text style={styles.chordLabel}>CHORD</Text>
              <Text style={[
                styles.chordValue,
                { fontSize: getChordFontSize(getFullChordName(currentChord)) }
              ]}>
                {getFullChordName(currentChord)}
              </Text>
            </View>
          </View>
        </View>

        {/* Plus/Minus Buttons */}
        <View style={styles.plusMinusContainer}>
          <Pressable 
            style={styles.plusButton}
            onPress={() => handleAdjustValue('up')}
          >
            <Text style={styles.plusMinusText}>+</Text>
          </Pressable>
          <Pressable 
            style={styles.minusButton}
            onPress={() => handleAdjustValue('down')}
          >
            <Text style={styles.plusMinusText}>-</Text>
          </Pressable>
        </View>

        {/* Navigation Menu */}
        <NavigationMenu 
          visible={menuVisible} 
          onClose={() => setMenuVisible(false)} 
          currentRoute={pathname}
        />

        {/* Save Confirmation Modal */}
        <Modal
          visible={showSaveConfirm}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Save Chord</Text>
              <Text style={styles.modalText}>
                Save {lastPressedNote ? getChordName(lastPressedNote) : ''} to
              </Text>
              <Pressable
                onPress={handleSlotSelect}
                style={[
                  styles.slotSelector,
                  isSlotSelectionActive && styles.slotSelectorActive
                ]}
              >
                <Text style={[
                  styles.modalText,
                  isSlotSelectionActive && styles.modalTextHighlighted
                ]}>
                  SLOT {selectedSlot !== null ? selectedSlot + 1 : ''}
                </Text>
              </Pressable>
              <Text style={styles.modalText}>?</Text>
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonNo]}
                  onPress={() => {
                    setShowSaveConfirm(false);
                    setIsSlotSelectionActive(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>NO</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonYes]}
                  onPress={handleSaveConfirm}
                >
                  <Text style={styles.modalButtonText}>YES</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
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
  saveButton: {
    position: 'absolute',
    top: 30,
    left: 120,
    width: 79,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  saveButtonTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
  soundWindow: {
    position: 'absolute',
    left: 217,
    top: 30,
    width: 132,
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
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
  settingsPanel: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 5,
    height: 67,
    alignItems: 'center',
    position: 'absolute',
    top: 20,
    left: 310,
    width: 'auto',
    zIndex: 3,
  },
  settingItem: {
    alignItems: 'center',
    padding: 5,
    borderRadius: 15,
    justifyContent: 'center',
    marginLeft: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeSettingItem: {
    width: 102,
    minWidth: 0,
    padding: 2,
    margin: 0,
    height: 67,
  },
  selectedSetting: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
  },
  settingLabel: {
    color: colors.textSecondary,
    fontSize: 13.8,
    fontWeight: '400',
    marginBottom: 2,
  },
  settingValue: {
    color: colors.text,
    fontSize: 18.4,
    fontWeight: '400',
  },
  chordDisplay: {
    alignItems: 'center',
    padding: 5,
    borderRadius: 15,
    marginLeft: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    height: 67,
    justifyContent: 'center',
    width: 102,
  },
  chordLabel: {
    color: colors.textSecondary,
    fontSize: 13.8,
    fontWeight: '400',
    marginBottom: 2,
  },
  chordValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '400',
    textAlign: 'center',
  },
  pianoContainer: {
    flex: 1,
    position: 'relative',
    marginTop: 220,
    width: '100%',
    alignItems: 'center',
    transform: [{ translateX: -35 }],
  },
  whiteKeysRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    height: '100%',
    zIndex: 1,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 800,
  },
  blackKeysRow: {
    position: 'absolute',
    top: -120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    height: '60%',
    zIndex: 2,
    width: '100%',
    maxWidth: 800,
  },
  pianoKey: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  whiteKey: {
    width: 72,
    height: 119,
    backgroundColor: '#4A4A4A',
    marginHorizontal: 13.5,
  },
  blackKey: {
    width: 72,
    height: 119,
    backgroundColor: '#000000',
    marginHorizontal: 13.5,
    borderWidth: 2,
    borderColor: '#4A4A4A',
  },
  blackKeyPlaceholder: {
    width: 99,
    height: 119,
  },
  keyInScale: {
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  keyContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
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
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  plusButton: {
    width: 40,
    height: 140,
    borderRadius: 8,
    backgroundColor: 'rgba(58, 58, 60, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    zIndex: 1001,
  },
  minusButton: {
    width: 40,
    height: 140,
    borderRadius: 8,
    backgroundColor: 'rgba(58, 58, 60, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    zIndex: 1001,
  },
  plusMinusText: {
    color: colors.textOffWhite,
    fontSize: 28,
    fontWeight: 'bold',
  },
  modeValueContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    margin: 0,
    width: '100%',
  },
  alternateModeName: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
    opacity: 0.8,
    marginTop: 0,
    letterSpacing: 0.5,
  },
  chordNameText: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  whiteKeyText: {
    color: colors.text,
  },
  blackKeyText: {
    color: colors.text,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalText: {
    color: colors.text,
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalTextHighlighted: {
    color: colors.primary,
  },
  slotSelector: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginVertical: 10,
  },
  slotSelectorActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    width: '100%',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonNo: {
    backgroundColor: colors.buttonGrey,
    marginRight: 10,
  },
  modalButtonYes: {
    backgroundColor: colors.primary,
    marginLeft: 10,
  },
  modalButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    position: 'relative',
    width: '100%',
    paddingRight: 40,
    marginLeft: 40,
  },
  backgroundImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  contentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    position: 'absolute',
    left: 0,
    right: -150,
    top: 0,
    bottom: -30,
    width: '115%',
    height: '105%',
  },
  skinButton: {
    position: 'absolute',
    top: 30,
    left: 60,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
}); 