import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { colors } from '@/constants/colors';
import { Chord, NoteName, noteNames, ChordType } from '@/types/music';
import { Play } from 'lucide-react-native';
import { playChord, stopChord } from '@/utils/audio-utils';

interface UserChordEditorProps {
  onSaveToU: (chordType: ChordType) => void;
  onSaveToSlot: (chord: Chord) => void;
}

export const UserChordEditor: React.FC<UserChordEditorProps> = ({
  onSaveToU,
  onSaveToSlot
}) => {
  const [selectedKey, setSelectedKey] = useState<NoteName>('C');
  const [chordTypeIndex, setChordTypeIndex] = useState(0);
  const [bassNote, setBassNote] = useState<NoteName | 'NONE'>('NONE');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedControl, setSelectedControl] = useState<'key' | 'chord type' | 'bass'>('chord type');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [saveType, setSaveType] = useState<'u' | 'slot' | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Cleanup effect to stop any playing sounds when component unmounts
  useEffect(() => {
    return () => {
      stopChord();
    };
  }, []);
  
  // Chord types not already in the grid
  const chordTypeNames = [
    '5',      // Power chord
    '13',     // Major 13
    'm69',    // Minor 6/9
    '7b9',    // Dominant 7 flat 9
    '7#9',    // Dominant 7 sharp 9
    '7#11',   // Dominant 7 sharp 11
    '7b13',   // Dominant 7 flat 13
    'maj9#11', // Major 9 sharp 11
    'm9b5',   // Minor 9 flat 5
    '9#11',   // Dominant 9 sharp 11
    '13b9',   // Dominant 13 flat 9
    'maj7#5', // Major 7 sharp 5
    'm11b5',  // Minor 11 flat 5
    '7alt',   // Altered dominant
    '7sus2b9', // Dominant 7 sus2 flat 9
    'dim9',   // Diminished 9
    'aug9',   // Augmented 9
    'φ7',     // Half diminished 7
    '7b5',    // Dominant 7 flat 5
    '7#5',    // Dominant 7 sharp 5
    '9sus',   // Dominant 9 sus4
    '13sus',  // Dominant 13 sus4
    '7sus',   // Dominant 7 sus4
  ];
  
  // Custom chord intervals for each type
  const chordTypeIntervals: number[][] = [
    [0, 7],                    // 5 (power chord)
    [0, 4, 7, 10, 14, 21],    // 13
    [0, 3, 7, 9, 14],         // m69
    [0, 4, 7, 10, 13],        // 7b9
    [0, 4, 7, 10, 15],        // 7#9
    [0, 4, 7, 10, 18],        // 7#11
    [0, 4, 7, 10, 20],        // 7b13
    [0, 4, 7, 11, 14, 18],    // maj9#11
    [0, 3, 6, 10, 14],        // m9b5
    [0, 4, 7, 10, 14, 18],    // 9#11
    [0, 4, 7, 10, 13, 21],    // 13b9
    [0, 4, 8, 11],            // maj7#5
    [0, 3, 6, 10, 14, 17],    // m11b5
    [0, 4, 8, 10, 13, 15],    // 7alt
    [0, 2, 7, 10, 13],        // 7sus2b9
    [0, 3, 6, 9, 14],         // dim9
    [0, 4, 8, 10, 14],        // aug9
    [0, 3, 6, 10],            // φ7
    [0, 4, 6, 10],            // 7b5
    [0, 4, 8, 10],            // 7#5
    [0, 5, 7, 10, 14],        // 9sus
    [0, 5, 7, 10, 14, 21],    // 13sus
    [0, 5, 7, 10],            // 7sus
  ];
  
  // Handle key change
  const handleKeyChange = (direction: 'prev' | 'next') => {
    const currentIndex = noteNames.indexOf(selectedKey);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = (currentIndex - 1 + noteNames.length) % noteNames.length;
    } else {
      newIndex = (currentIndex + 1) % noteNames.length;
    }
    
    setSelectedKey(noteNames[newIndex]);
  };
  
  // Handle chord type change
  const handleChordTypeChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setChordTypeIndex((chordTypeIndex - 1 + chordTypeNames.length) % chordTypeNames.length);
    } else {
      setChordTypeIndex((chordTypeIndex + 1) % chordTypeNames.length);
    }
  };
  
  // Handle bass note change
  const handleBassNoteChange = (direction: 'prev' | 'next') => {
    if (bassNote === 'NONE') {
      setBassNote(direction === 'prev' ? noteNames[11] : noteNames[0]);
      return;
    }
    
    const currentIndex = noteNames.indexOf(bassNote as NoteName);
    if (direction === 'prev') {
      const newIndex = (currentIndex - 1 + noteNames.length) % noteNames.length;
      if (newIndex === 11) {
        setBassNote('NONE');
      } else {
        setBassNote(noteNames[newIndex]);
      }
    } else {
      const newIndex = (currentIndex + 1) % noteNames.length;
      if (newIndex === 0) {
        setBassNote('NONE');
      } else {
        setBassNote(noteNames[newIndex]);
      }
    }
  };
  
  // Create the current user chord
  const getCurrentChord = (): Chord => {
    // Create a custom chord with the selected intervals
    const chord: Chord = {
      id: 'user-chord',
      root: selectedKey,
      type: chordTypeNames[chordTypeIndex] as ChordType,
      notes: [],
      bassNote: bassNote === 'NONE' ? undefined : bassNote,
    };
    
    // Calculate MIDI notes based on intervals
    const rootIndex = noteNames.indexOf(selectedKey);
    const rootNote = 60; // Middle C
    
    chord.notes = chordTypeIntervals[chordTypeIndex].map(interval => 
      rootNote + interval
    );
    
    // Add bass note if different from root
    if (bassNote !== 'NONE') {
      const bassIndex = noteNames.indexOf(bassNote);
      const bassNoteValue = rootNote - 12 + ((bassIndex - rootIndex + 12) % 12); // One octave lower
      
      // Remove any existing instances of the bass note
      chord.notes = chord.notes.filter(note => note % 12 !== bassNoteValue % 12);
      
      // Add the bass note at the beginning
      chord.notes.unshift(bassNoteValue);
    }
    
    return chord;
  };
  
  // Handle play button press
  const handlePlay = () => {
    if (isPlaying) {
      stopChord();
      setIsPlaying(false);
    } else {
      const chord = getCurrentChord();
      try {
        playChord(chord.notes);
      } catch (error) {
        // Silently catch AVFoundation errors
      }
      setIsPlaying(true);
    }
  };
  
  // Handle play button release
  const handlePlayRelease = () => {
    if (isPlaying) {
      stopChord();
      setIsPlaying(false);
    }
  };
  
  // Handle initiating save process
  const handleInitiateSave = (type: 'u' | 'slot') => {
    setSaveType(type);
    if (type === 'u') {
      setSaveMessage(`Save "${chordTypeNames[chordTypeIndex]}" as U chord type?`);
    } else {
      const chord = getCurrentChord();
      const chordName = getChordDisplayName(chord);
      setSaveMessage(`Save "${chordName}" to next empty slot?`);
    }
    setShowSaveConfirm(true);
  };

  // Handle save confirmation
  const handleConfirmSave = (confirmed: boolean) => {
    if (confirmed) {
      if (saveType === 'u') {
        onSaveToU(chordTypeNames[chordTypeIndex] as ChordType);
      } else {
        const chord = getCurrentChord();
        onSaveToSlot(chord);
        // Play the chord when saved
        try {
          playChord(chord.notes);
        } catch (error) {
          // Silently catch AVFoundation errors
        }
      }
    }
    setShowSaveConfirm(false);
    setSaveType(null);
  };

  // Get chord display name (for saved chord buttons)
  const getChordDisplayName = (chord: Chord): string => {
    let displayName = chord.root;
    switch (chord.type) {
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
      default: displayName += chord.type;
    }
    if (chord.bassNote && chord.bassNote !== chord.root) {
      displayName += `/${chord.bassNote}`;
    }
    return displayName;
  };

  // Handle value adjustment
  const handleAdjustValue = (direction: 'up' | 'down') => {
    switch (selectedControl) {
      case 'key':
        handleKeyChange(direction === 'up' ? 'next' : 'prev');
        break;
      case 'chord type':
        handleChordTypeChange(direction === 'up' ? 'next' : 'prev');
        break;
      case 'bass':
        handleBassNoteChange(direction === 'up' ? 'next' : 'prev');
        break;
      default:
        // Default to chord type if nothing is selected
        handleChordTypeChange(direction === 'up' ? 'next' : 'prev');
    }
  };

  // Add click handlers for the control groups
  const handleControlClick = (control: 'KEY' | 'CHORD TYPE' | 'BASS') => {
    switch (control) {
      case 'KEY':
        setSelectedControl('key');
        break;
      case 'CHORD TYPE':
        setSelectedControl('chord type');
        break;
      case 'BASS':
        setSelectedControl('bass');
        break;
    }
  };

  // Handle minus button press and hold
  const handleMinusButtonPressIn = () => {
    handleAdjustValue('down');
  };

  const handleMinusButtonPressOut = () => {
    // Stop any continuous adjustment if needed
  };

  return (
    <View style={styles.container}>
      {/* Play button */}
      <View style={styles.playContainer}>
        <Pressable 
          style={[styles.playButton, isPlaying && styles.playButtonActive]} 
          onPressIn={handlePlay}
          onPressOut={handlePlayRelease}
        >
          <Play size={48} color={colors.text} />
        </Pressable>
      </View>

      {/* Top row of controls */}
      <View style={styles.topControls}>
        {/* Key selector */}
        <Pressable onPress={() => handleControlClick('KEY')}>
          <View style={[styles.controlGroup, selectedControl === 'key' && styles.selectedControl]}>
            <View style={styles.display}>
              <Text style={styles.displayLabel}>KEY</Text>
              <Text style={styles.displayValue}>{selectedKey}</Text>
            </View>
          </View>
        </Pressable>
        
        {/* Chord type selector */}
        <Pressable onPress={() => handleControlClick('CHORD TYPE')}>
          <View style={[styles.controlGroup, selectedControl === 'chord type' && styles.selectedControl]}>
            <View style={styles.display}>
              <Text style={styles.displayLabel}>CHORD TYPE</Text>
              <Text style={styles.displayValue}>{chordTypeNames[chordTypeIndex]}</Text>
            </View>
          </View>
        </Pressable>
        
        {/* Bass note selector */}
        <Pressable onPress={() => handleControlClick('BASS')}>
          <View style={[styles.controlGroup, selectedControl === 'bass' && styles.selectedControl]}>
            <View style={styles.display}>
              <Text style={styles.displayLabel}>BASS</Text>
              <Text style={styles.displayValue}>{bassNote}</Text>
            </View>
          </View>
        </Pressable>
      </View>

      {/* Plus/Minus buttons at right */}
      <View style={styles.plusMinusContainer}>
        <Pressable 
          style={styles.plusMinusButton}
          onPress={() => handleAdjustValue('up')}
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

      {/* Save buttons */}
      <View style={styles.saveButtonsContainer}>
        <Pressable style={styles.saveButton} onPress={() => handleInitiateSave('u')}>
          <View>
            <Text style={styles.saveButtonText}>SAVE TYPE TO</Text>
            <Text style={[styles.saveButtonText, { marginTop: 4 }]}>"U" CHORD</Text>
          </View>
        </Pressable>
        <Pressable style={styles.saveButton} onPress={() => handleInitiateSave('slot')}>
          <View>
            <Text style={styles.saveButtonText}>SAVE TO NEXT</Text>
            <Text style={[styles.saveButtonText, { marginTop: 4 }]}>EMPTY</Text>
          </View>
        </Pressable>
      </View>

      {/* Save Confirmation Modal */}
      <Modal
        visible={showSaveConfirm}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Chord</Text>
            <Text style={styles.modalText}>{saveMessage}</Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonNo]}
                onPress={() => handleConfirmSave(false)}
              >
                <Text style={styles.modalButtonText}>NO</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonYes]}
                onPress={() => handleConfirmSave(true)}
              >
                <Text style={styles.modalButtonText}>YES</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    marginTop: 15,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    width: '100%',
    paddingHorizontal: 20,
  },
  controlGroup: {
    width: 150,
    backgroundColor: colors.buttonGrey,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 98,
    marginTop: -8,
    marginHorizontal: 2,
  },
  display: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  displayLabel: {
    color: colors.textSecondary,
    fontSize: 17.5,
    marginBottom: 12,
    width: '100%',
    textAlign: 'center',
  },
  displayValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '600',
    textAlign: 'center',
  },
  playContainer: {
    position: 'absolute',
    left: 70,
    top: -90,
    zIndex: 1,
  },
  playButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.buttonGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: colors.primary,
  },
  saveButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 154,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: colors.chord.m11,
    borderRadius: 12,
    padding: 24,
    height: 74,
    width: '38%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 18.4,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  plusMinusContainer: {
    position: 'absolute',
    right: -91,
    top: 50,
    bottom: -50,
    width: 91,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.buttonGrey,
    borderRadius: 8,
  },
  plusMinusButton: {
    width: 91,
    height: 218,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.chord.m11,
    borderRadius: 8,
  },
  minusButton: {
    width: 91,
    height: 218,
    borderRadius: 4,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  plusMinusText: {
    color: colors.textOffWhite,
    fontSize: 44,
    fontWeight: 'bold',
  },
  selectedControl: {
    borderWidth: 2,
    borderColor: colors.primary,
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