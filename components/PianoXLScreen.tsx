import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Modal } from 'react-native';
import { Eye, Save } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { NoteName, MusicMode, Chord, ChordType } from '@/types/music';
import { getScaleNotes, getDiatonicChords, createChord } from '@/utils/chord-utils';
import { useChordStore } from '@/stores/chord-store';
import { playChord, stopChord } from '@/utils/audio-utils';
import { NavigationMenu } from '@/components/NavigationMenu';
import { usePathname, router } from 'expo-router';

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

export function PianoXL({ onNoteSelect }: PianoXLProps) {
  // State
  const [selectedKey, setSelectedKey] = useState<NoteName>('A#');
  const [mode, setMode] = useState<MusicMode>('minor');
  const [octave, setOctave] = useState(0);
  const [inversion, setInversion] = useState(0);
  const [currentChord, setCurrentChord] = useState<string>('C#m7');
  const [scaleNotes, setScaleNotes] = useState<NoteName[]>([]);
  const [selectedControl, setSelectedControl] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const pathname = usePathname();
  const [lastPressedNote, setLastPressedNote] = useState<NoteName | null>(null);
  const [chordTypeIndices, setChordTypeIndices] = useState<{ [key: string]: number }>({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [nextEmptyIndex, setNextEmptyIndex] = useState<number | null>(null);
  const { setCurrentChord: setStoreChord, savedChords, saveChord } = useChordStore();
  
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
    
    // Deselect any selected setting when a key is pressed
    setSelectedControl(null);
    
    setLastPressedNote(note as NoteName);
    const chordType = getCurrentChordType(note as NoteName);
    const chord = createChord(note as NoteName, chordType);
    
    if (chord) {
      try {
        playChord(chord.notes);
      } catch (error) {
        // Silently catch AVFoundation errors
      }
      setStoreChord(chord);
      setCurrentChord(getChordName(note as NoteName));
      onNoteSelect?.(note);
    }
  };

  // Handle setting selection
  const handleSettingSelect = (setting: string) => {
    setSelectedControl(prev => prev === setting ? null : setting);
  };

  // Handle value adjustments with limits
  const handleAdjustValue = (direction: 'up' | 'down') => {
    // If a setting is selected, handle setting adjustments
    if (selectedControl) {
      if (selectedControl === 'key') {
        const currentKeyIndex = KEYS.indexOf(selectedKey as NoteName);
        if (direction === 'up') {
          const nextKey = KEYS[(currentKeyIndex + 1) % KEYS.length];
          setSelectedKey(nextKey);
        } else {
          const prevKey = KEYS[(currentKeyIndex - 1 + KEYS.length) % KEYS.length];
          setSelectedKey(prevKey);
        }
        return;
      }

      if (selectedControl === 'mode') {
        const currentModeIndex = MODES.indexOf(mode);
        if (direction === 'up') {
          setMode(MODES[(currentModeIndex + 1) % MODES.length]);
        } else {
          setMode(MODES[(currentModeIndex - 1 + MODES.length) % MODES.length]);
        }
        return;
      }

      // Handle remaining controls
      switch (selectedControl) {
        case 'octave':
          if (direction === 'up') {
            setOctave(prev => prev < 3 ? prev + 1 : prev);
          } else {
            setOctave(prev => prev > -3 ? prev - 1 : prev);
          }
          break;
        case 'inversion':
          if (direction === 'up') {
            setInversion(prev => prev < 2 ? prev + 1 : prev);
          } else {
            setInversion(prev => prev > -2 ? prev - 1 : prev);
          }
          break;
      }
      return;
    }

    // If no setting is selected and we have a last pressed note, handle chord type scrolling
    if (lastPressedNote && scaleNotes.includes(lastPressedNote)) {
      const availableTypes = getAvailableChordTypes(lastPressedNote);
      const currentIndex = chordTypeIndices[lastPressedNote] || 0;
      let newIndex;

      if (direction === 'up') {
        newIndex = (currentIndex + 1) % availableTypes.length;
      } else {
        newIndex = (currentIndex - 1 + availableTypes.length) % availableTypes.length;
      }

      setChordTypeIndices(prev => ({
        ...prev,
        [lastPressedNote]: newIndex
      }));

      // Play the new chord
      const newChordType = availableTypes[newIndex];
      const newChord = createChord(lastPressedNote, newChordType);
      if (newChord) {
        try {
          playChord(newChord.notes);
        } catch (error) {
          // Silently catch AVFoundation errors
        }
        setStoreChord(newChord);
        setCurrentChord(getChordName(lastPressedNote));
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
    let alternateName = '';
    
    switch (upperMode) {
      case 'MAJOR': alternateName = 'IONIAN'; break;
      case 'MINOR': alternateName = 'AEOLIAN'; break;
      case 'DORIAN': alternateName = '2ND MODE'; break;
      case 'PHRYGIAN': alternateName = '3RD MODE'; break;
      case 'LYDIAN': alternateName = '4TH MODE'; break;
      case 'MIXOLYDIAN': 
        return (
          <View style={styles.modeValueContainer}>
            <Text style={styles.settingValue}>MIXO</Text>
            <Text style={styles.alternateModeName}>LYDIAN</Text>
          </View>
        );
      case 'LOCRIAN': alternateName = '7TH MODE'; break;
      default: break;
    }

    return (
      <View style={styles.modeValueContainer}>
        <Text style={styles.settingValue}>{upperMode}</Text>
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
  }) => (
    <Pressable 
      style={[styles.settingItem, isSelected && styles.selectedSetting]}
      onPress={onPress}
    >
      <Text style={styles.settingLabel}>{label}</Text>
      {label === 'MODE' ? (
        renderModeWithAlternateName(value.toString())
      ) : (
        <Text style={[
          styles.settingValue,
          label === 'CHORD' && styles.chordValue
        ]}>{value}</Text>
      )}
    </Pressable>
  );

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
        onPress={() => handleKeyPress(note)}
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

  // Find next empty slot
  const findNextEmptySlot = () => {
    for (let i = 0; i < 32; i++) {  // MAX_SAVED_CHORDS is 32
      if (!savedChords[i]) {
        return i;
      }
    }
    return null;
  };

  // Handle save button press
  const handleSavePress = () => {
    console.log('Save button pressed');
    console.log('Last pressed note:', lastPressedNote);
    
    if (!lastPressedNote) {
      console.log('No chord to save - no last pressed note');
      return;
    }
    
    const emptyIndex = findNextEmptySlot();
    console.log('Next empty slot:', emptyIndex);
    
    if (emptyIndex === null) {
      console.log('No empty slots available');
      return;
    }
    
    const chordType = getCurrentChordType(lastPressedNote);
    const chord = createChord(lastPressedNote, chordType);
    
    if (chord) {
      setNextEmptyIndex(emptyIndex);
      setShowSaveConfirm(true);
    }
  };

  // Handle save confirmation
  const handleSaveConfirm = () => {
    console.log('Save confirmed');
    console.log('Saving to index:', nextEmptyIndex);
    console.log('Last pressed note:', lastPressedNote);
    
    if (nextEmptyIndex === null || !lastPressedNote) {
      console.log('Cannot save - missing data');
      return;
    }

    const chordType = getCurrentChordType(lastPressedNote);
    console.log('Chord type:', chordType);
    
    const chord = createChord(lastPressedNote, chordType);
    console.log('Created chord:', chord);
    
    if (chord) {
      // Save to chord store
      saveChord(chord, nextEmptyIndex);
      console.log('Saved chord to store at index:', nextEmptyIndex);
      
      // Play the chord when saved
      try {
        playChord(chord.notes);
      } catch (error) {
        // Silently catch AVFoundation errors
      }
    }
    
    setShowSaveConfirm(false);
  };

  // Add useEffect to monitor savedChords changes
  useEffect(() => {
    console.log('Current saved chords:', savedChords);
  }, [savedChords]);

  return (
    <View style={styles.container}>
      {/* Eye button */}
      <Pressable style={styles.eyeButton} onPress={toggleMenu}>
        <Eye size={28} color={colors.text} />
      </Pressable>

      {/* Save to Next Empty button */}
      <Pressable 
        style={styles.saveButton}
        onPress={() => {
          console.log('Save button pressed - direct');
          handleSavePress();
        }}
      >
        <Text style={styles.saveButtonText}>SAVE TO NEXT EMPTY</Text>
      </Pressable>

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
              Save {lastPressedNote ? getChordName(lastPressedNote) : ''} to slot {nextEmptyIndex !== null ? nextEmptyIndex + 1 : ''}?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonNo]}
                onPress={() => {
                  console.log('Save cancelled');
                  setShowSaveConfirm(false);
                }}
              >
                <Text style={styles.modalButtonText}>NO</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonYes]}
                onPress={() => {
                  console.log('Save confirmed - direct');
                  handleSaveConfirm();
                }}
              >
                <Text style={styles.modalButtonText}>YES</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Navigation Menu */}
      <NavigationMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
        currentRoute={pathname}
      />

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
            <Text style={styles.chordValue}>{currentChord}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    marginLeft: -50,
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
  settingsPanel: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
    paddingHorizontal: 5,
    height: 67,
    alignItems: 'center',
    position: 'absolute',
    top: 20,
    right: 20,
    left: -59,
    backgroundColor: colors.background,
    zIndex: 3,
    transform: [{ translateX: -50 }],
  },
  settingItem: {
    alignItems: 'center',
    padding: 5,
    borderRadius: 4,
    justifyContent: 'center',
    marginLeft: 15,
  },
  selectedSetting: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 2,
  },
  settingValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '400',
  },
  chordDisplay: {
    alignItems: 'center',
    padding: 5,
    borderRadius: 4,
    marginLeft: 15,
    width: 120,
  },
  chordLabel: {
    color: colors.textSecondary,
    fontSize: 12,
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
  },
  whiteKeysRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    height: '100%',
    zIndex: 1,
    paddingHorizontal: 20,
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
    backgroundColor: colors.background,
    zIndex: 5,
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
    fontSize: 28,
    fontWeight: 'bold',
  },
  modeValueContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    margin: 0,
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
  saveButton: {
    position: 'absolute',
    top: 30,
    left: 125,
    width: 119,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
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
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    color: colors.text,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
}); 