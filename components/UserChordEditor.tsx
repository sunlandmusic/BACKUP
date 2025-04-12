import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/colors';
import { Chord, ChordModifier, NoteName, noteNames } from '@/types/music';
import { ChevronDown, ChevronUp, Play } from 'lucide-react-native';
import { createChord } from '@/utils/chord-utils';
import { playChord, stopChord } from '@/utils/audio-utils';

interface UserChordEditorProps {
  onSaveUserChord: (chord: Chord) => void;
}

export const UserChordEditor: React.FC<UserChordEditorProps> = ({
  onSaveUserChord
}) => {
  const [selectedKey, setSelectedKey] = useState<NoteName>('C');
  const [chordTypeIndex, setChordTypeIndex] = useState(0);
  const [bassOffset, setBassOffset] = useState(0);
  const [selectedModifier, setSelectedModifier] = useState<ChordModifier>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Cleanup effect to stop any playing sounds when component unmounts
  useEffect(() => {
    return () => {
      stopChord();
    };
  }, []);
  
  // Chord type names (for display)
  const chordTypeNames = [
    'Major 13',
    'Minor 13',
    'Dominant 13',
    'Major 11',
    'Dominant 11',
    'Major 6/9',
    'Minor 6/9',
    'Augmented 7',
    'Diminished Major 7',
    'Altered',
    'Suspended 2 & 4',
    'Lydian',
    'Phrygian',
    'Whole Tone',
    'Quartal',
    '7sus2',
    '7sus4',
    'Custom'
  ];
  
  // Custom chord intervals for each type
  const chordTypeIntervals: number[][] = [
    [0, 4, 7, 11, 14, 21], // Major 13
    [0, 3, 7, 10, 14, 21], // Minor 13
    [0, 4, 7, 10, 14, 21], // Dominant 13
    [0, 4, 7, 11, 14, 17], // Major 11
    [0, 4, 7, 10, 14, 17], // Dominant 11
    [0, 4, 7, 9, 14], // Major 6/9
    [0, 3, 7, 9, 14], // Minor 6/9
    [0, 4, 8, 10], // Augmented 7
    [0, 3, 6, 11], // Diminished Major 7
    [0, 4, 7, 10, 13, 15], // Altered (7#9b13)
    [0, 2, 5, 7], // Suspended 2 & 4
    [0, 4, 7, 11, 18], // Lydian (maj7#11)
    [0, 1, 3, 7, 10], // Phrygian (m7b9)
    [0, 2, 4, 6, 8, 10], // Whole Tone
    [0, 5, 10, 15], // Quartal
    [0, 2, 7, 10], // 7sus2
    [0, 5, 7, 10], // 7sus4
    [0, 4, 7, 11, 14, 18, 21] // Custom (fully extended)
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
  
  // Handle bass offset change
  const handleBassOffsetChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setBassOffset(Math.max(-3, bassOffset - 1));
    } else {
      setBassOffset(Math.min(3, bassOffset + 1));
    }
  };
  
  // Handle modifier selection
  const handleModifierSelect = (modifier: ChordModifier) => {
    if (selectedModifier === modifier) {
      setSelectedModifier(null);
    } else {
      setSelectedModifier(modifier);
    }
  };
  
  // Get bass note based on offset
  const getBassNote = (): NoteName | undefined => {
    if (bassOffset === 0) return undefined;
    
    const keyIndex = noteNames.indexOf(selectedKey);
    const bassIndex = (keyIndex + bassOffset + 12) % 12;
    return noteNames[bassIndex];
  };
  
  // Create the current user chord
  const getCurrentChord = (): Chord => {
    const bassNote = getBassNote();
    
    // Create a custom chord with the selected intervals
    const chord: Chord = {
      id: 'user-chord',
      root: selectedKey,
      type: 'user',
      notes: [],
      bassNote,
      modifier: selectedModifier
    };
    
    // Calculate MIDI notes based on intervals
    const rootIndex = noteNames.indexOf(selectedKey);
    const rootNote = 60; // Middle C
    
    chord.notes = chordTypeIntervals[chordTypeIndex].map(interval => 
      rootNote + interval
    );
    
    // Add bass note if different from root
    if (bassNote) {
      const bassIndex = noteNames.indexOf(bassNote);
      const bassNoteValue = rootNote + ((bassIndex - rootIndex + 12) % 12);
      
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
  
  // Handle play button release - immediately stop sound
  const handlePlayRelease = () => {
    if (isPlaying) {
      stopChord();
      setIsPlaying(false);
    }
  };
  
  // Handle save button press
  const handleSave = () => {
    const chord = getCurrentChord();
    onSaveUserChord(chord);
    
    // Stop any playing sounds
    stopChord();
  };
  
  // Format bass offset for display
  const formatBassOffset = (): string => {
    if (bassOffset === 0) return 'None';
    
    const sign = bassOffset > 0 ? '+' : '';
    const bassNote = getBassNote();
    return `${sign}${bassOffset} (${bassNote})`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Chord Editor</Text>
      
      <View style={styles.editorGrid}>
        {/* Key selector */}
        <View style={styles.controlGroup}>
          <View style={styles.buttons}>
            <Pressable 
              style={styles.button} 
              onPress={() => handleKeyChange('prev')}
            >
              <ChevronDown size={24} color={colors.text} />
            </Pressable>
            <Pressable 
              style={styles.button} 
              onPress={() => handleKeyChange('next')}
            >
              <ChevronUp size={24} color={colors.text} />
            </Pressable>
          </View>
          
          <View style={styles.display}>
            <Text style={styles.displayLabel}>KEY</Text>
            <Text style={styles.displayValue}>{selectedKey}</Text>
          </View>
        </View>
        
        {/* Chord type selector */}
        <View style={styles.controlGroup}>
          <View style={styles.buttons}>
            <Pressable 
              style={styles.button} 
              onPress={() => handleChordTypeChange('prev')}
            >
              <ChevronDown size={24} color={colors.text} />
            </Pressable>
            <Pressable 
              style={styles.button} 
              onPress={() => handleChordTypeChange('next')}
            >
              <ChevronUp size={24} color={colors.text} />
            </Pressable>
          </View>
          
          <View style={styles.display}>
            <Text style={styles.displayLabel}>CHORD TYPE</Text>
            <Text style={styles.displayValue}>{chordTypeNames[chordTypeIndex]}</Text>
          </View>
        </View>
        
        {/* Play button */}
        <View style={styles.playContainer}>
          <Pressable 
            style={[styles.playButton, isPlaying && styles.playButtonActive]} 
            onPressIn={handlePlay}
            onPressOut={handlePlayRelease} // Stop sound when released
          >
            <Play size={48} color={colors.text} />
          </Pressable>
          <Text style={styles.playLabel}>{isPlaying ? 'STOP' : 'PLAY'}</Text>
        </View>
        
        {/* Bass note selector */}
        <View style={styles.controlGroup}>
          <View style={styles.buttons}>
            <Pressable 
              style={styles.button} 
              onPress={() => handleBassOffsetChange('prev')}
            >
              <ChevronDown size={24} color={colors.text} />
            </Pressable>
            <Pressable 
              style={styles.button} 
              onPress={() => handleBassOffsetChange('next')}
            >
              <ChevronUp size={24} color={colors.text} />
            </Pressable>
          </View>
          
          <View style={styles.display}>
            <Text style={styles.displayLabel}>BASS NOTE</Text>
            <Text style={styles.displayValue}>{formatBassOffset()}</Text>
          </View>
        </View>
        
        {/* Modifier selector */}
        <View style={styles.modifierContainer}>
          <Text style={styles.modifierLabel}>Modifiers:</Text>
          <View style={styles.modifierButtons}>
            <Pressable
              style={[
                styles.modifierButton,
                selectedModifier === 'sus2' && styles.selectedModifierButton,
                { backgroundColor: colors.chord.sus2 }
              ]}
              onPress={() => handleModifierSelect('sus2')}
            >
              <Text style={styles.modifierButtonText}>sus2</Text>
            </Pressable>
            <Pressable
              style={[
                styles.modifierButton,
                selectedModifier === 'sus4' && styles.selectedModifierButton,
                { backgroundColor: colors.chord.sus4 }
              ]}
              onPress={() => handleModifierSelect('sus4')}
            >
              <Text style={styles.modifierButtonText}>sus4</Text>
            </Pressable>
          </View>
        </View>
      </View>
      
      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>S</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  editorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  controlGroup: {
    width: '48%',
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  button: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 12,
    width: '48%',
    alignItems: 'center',
  },
  display: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
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
  playContainer: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  playButton: {
    backgroundColor: colors.primary,
    borderRadius: 40,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  playButtonActive: {
    backgroundColor: colors.error,
  },
  playLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modifierContainer: {
    width: '100%',
    marginBottom: 16,
  },
  modifierLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  modifierButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  modifierButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  selectedModifierButton: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  modifierButtonText: {
    color: '#000000', // Black text for sus2/sus4
    fontWeight: 'bold',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});