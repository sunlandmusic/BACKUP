import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
      playChord(chord.notes);
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
  
  // Handle save to U button
  const handleSaveToU = () => {
    onSaveToU(chordTypeNames[chordTypeIndex] as ChordType);
  };
  
  // Handle save to slot button
  const handleSaveToSlot = () => {
    const chord = getCurrentChord();
    onSaveToSlot(chord);
  };

  return (
    <View style={styles.container}>
      <View style={styles.editorGrid}>
        {/* Key selector */}
        <View style={styles.controlGroup}>
          <View style={styles.display}>
            <Text style={styles.displayLabel}>KEY</Text>
            <Text style={styles.displayValue}>{selectedKey}</Text>
          </View>
          <View style={styles.buttonGroup}>
            <Pressable 
              style={styles.button} 
              onPress={() => handleKeyChange('prev')}
            >
              <Text style={styles.buttonText}>-</Text>
            </Pressable>
            <Pressable 
              style={styles.button}
              onPress={() => handleKeyChange('next')}
            >
              <Text style={styles.buttonText}>+</Text>
            </Pressable>
          </View>
        </View>
        
        {/* Chord type selector */}
        <View style={styles.controlGroup}>
          <View style={styles.display}>
            <Text style={styles.displayLabel}>CHORD TYPE</Text>
            <Text style={styles.displayValue}>{chordTypeNames[chordTypeIndex]}</Text>
          </View>
          <View style={styles.buttonGroup}>
            <Pressable 
              style={styles.button}
              onPress={() => handleChordTypeChange('prev')}
            >
              <Text style={styles.buttonText}>-</Text>
            </Pressable>
            <Pressable 
              style={styles.button}
              onPress={() => handleChordTypeChange('next')}
            >
              <Text style={styles.buttonText}>+</Text>
            </Pressable>
          </View>
        </View>
        
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
        
        {/* Bass note selector */}
        <View style={styles.controlGroup}>
          <View style={styles.display}>
            <Text style={styles.displayLabel}>BASS</Text>
            <Text style={styles.displayValue}>{bassNote}</Text>
          </View>
          <View style={styles.buttonGroup}>
            <Pressable 
              style={styles.button}
              onPress={() => handleBassNoteChange('prev')}
            >
              <Text style={styles.buttonText}>-</Text>
            </Pressable>
            <Pressable 
              style={styles.button}
              onPress={() => handleBassNoteChange('next')}
            >
              <Text style={styles.buttonText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>
      
      {/* Save buttons */}
      <View style={styles.saveButtonsContainer}>
        <Pressable style={styles.saveButton} onPress={handleSaveToU}>
          <Text style={styles.saveButtonText}>SAVE TYPE TO "U" CHORD</Text>
        </Pressable>
        <Pressable style={styles.saveButton} onPress={handleSaveToSlot}>
          <Text style={styles.saveButtonText}>SAVE TO NEXT EMPTY SLOT</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  editorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  controlGroup: {
    flex: 1,
    minWidth: 150,
    backgroundColor: colors.buttonGrey,
    borderRadius: 12,
    padding: 12,
  },
  display: {
    marginBottom: 8,
  },
  displayLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  displayValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  playContainer: {
    flex: 1,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.buttonGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: colors.primary,
  },
  saveButtonsContainer: {
    gap: 16,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});