import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text, Platform } from 'react-native';
import { colors } from '@/constants/colors';
import { NoteName, noteNames } from '@/types/music';
import { playNote, stopNote, initAudio, stopChord } from '@/utils/audio-utils';

interface PianoProps {
  octave?: number;
  numOctaves?: number;
  onNotePress?: (noteName: NoteName, midiNote: number) => void;
  onNoteRelease?: () => void;
  highlightedNotes?: number[];
  rootNote?: NoteName;
  scaleNotes?: NoteName[];
  horizontal?: boolean;
}

export const Piano: React.FC<PianoProps> = ({
  octave = 4,
  numOctaves = 1,
  onNotePress,
  onNoteRelease,
  highlightedNotes = [],
  rootNote,
  scaleNotes = [],
  horizontal = true
}) => {
  const [pressedKeys, setPressedKeys] = useState<number[]>([]);

  // Initialize audio on component mount
  useEffect(() => {
    const setupAudio = async () => {
      await initAudio();
    };
    
    setupAudio();
    
    // Cleanup function to stop any playing notes when component unmounts
    return () => {
      stopChord();
    };
  }, []);

  // Update highlighted notes when they change
  useEffect(() => {
    // If highlightedNotes is empty, clear pressed keys
    if (highlightedNotes.length === 0 && pressedKeys.length > 0) {
      setPressedKeys([]);
    }
  }, [highlightedNotes]);

  // Calculate MIDI note number from octave and note index
  const getMidiNote = (octaveNum: number, noteIndex: number): number => {
    return 12 * (octaveNum + 1) + noteIndex;
  };

  // Handle key press
  const handleKeyPress = (octaveNum: number, noteIndex: number) => {
    const noteName = noteNames[noteIndex] as NoteName;
    const midiNote = getMidiNote(octaveNum, noteIndex);
    
    // Play the note
    playNote(midiNote);
    
    // Update pressed keys
    setPressedKeys(prev => [...prev, midiNote]);
    
    // Call the callback
    if (onNotePress) {
      onNotePress(noteName, midiNote);
    }
  };

  // Handle key release
  const handleKeyRelease = (octaveNum: number, noteIndex: number) => {
    const midiNote = getMidiNote(octaveNum, noteIndex);
    
    // Stop the note
    stopNote(midiNote);
    
    // Update pressed keys - immediately remove the key
    setPressedKeys(prev => prev.filter(note => note !== midiNote));
    
    // Call the callback
    if (onNoteRelease) {
      onNoteRelease();
    }
  };

  // Check if a note is in the scale
  const isNoteInScale = (noteIndex: number): boolean => {
    if (scaleNotes.length === 0) return false;
    return scaleNotes.includes(noteNames[noteIndex] as NoteName);
  };

  // Check if a note is highlighted (part of the current chord)
  const isNoteHighlighted = (midiNote: number): boolean => {
    // Only show highlights for pressed keys
    if (pressedKeys.includes(midiNote)) {
      return true;
    }
    
    // Otherwise, only show highlights if explicitly provided and not overridden by pressed keys
    if (!highlightedNotes || highlightedNotes.length === 0) return false;
    
    // Check if the note (regardless of octave) is in the highlighted notes
    return highlightedNotes.some(note => note % 12 === midiNote % 12);
  };

  // Check if a note is the root note of the current chord
  const isRootNote = (noteIndex: number): boolean => {
    if (!rootNote) return false;
    return noteNames[noteIndex] === rootNote;
  };

  // Render piano keys for a single octave - horizontal layout
  const renderHorizontalPiano = (octaveNum: number) => {
    // White keys (C, D, E, F, G, A, B)
    const whiteKeys = [0, 2, 4, 5, 7, 9, 11];
    // Black keys (C#, D#, F#, G#, A#)
    const blackKeys = [1, 3, 6, 8, 10];
    
    return (
      <View key={`octave-${octaveNum}`} style={styles.horizontalOctave}>
        {/* White keys container */}
        <View style={styles.whiteKeysRow}>
          {whiteKeys.map(noteIndex => {
            const midiNote = getMidiNote(octaveNum, noteIndex);
            const isPressed = pressedKeys.includes(midiNote);
            const isHighlighted = isNoteHighlighted(midiNote);
            const isRoot = isRootNote(noteIndex);
            const isInScale = isNoteInScale(noteIndex);
            
            return (
              <Pressable
                key={`white-${octaveNum}-${noteIndex}`}
                style={[
                  styles.whiteKeyHorizontal,
                  isPressed && styles.whiteKeyPressed,
                  isHighlighted && (isRoot ? styles.whiteKeyRootHighlighted : styles.whiteKeyHighlighted),
                  isInScale && styles.whiteKeyInScale
                ]}
                onPressIn={() => handleKeyPress(octaveNum, noteIndex)}
                onPressOut={() => handleKeyRelease(octaveNum, noteIndex)}
              >
                <Text style={styles.keyLabel}>
                  {noteNames[noteIndex]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        
        {/* Black keys overlay */}
        <View style={styles.blackKeysRow}>
          {/* First group (C#, D#) */}
          <View style={styles.blackKeyGroupHorizontal}>
            <Pressable
              key={`black-${octaveNum}-1`}
              style={[
                styles.blackKeyHorizontal,
                pressedKeys.includes(getMidiNote(octaveNum, 1)) && styles.blackKeyPressed,
                isNoteHighlighted(getMidiNote(octaveNum, 1)) && (isRootNote(1) ? styles.blackKeyRootHighlighted : styles.blackKeyHighlighted),
                isNoteInScale(1) && styles.blackKeyInScale
              ]}
              onPressIn={() => handleKeyPress(octaveNum, 1)}
              onPressOut={() => handleKeyRelease(octaveNum, 1)}
            >
              <Text style={styles.blackKeyLabel}>C#</Text>
            </Pressable>
            
            <Pressable
              key={`black-${octaveNum}-3`}
              style={[
                styles.blackKeyHorizontal,
                pressedKeys.includes(getMidiNote(octaveNum, 3)) && styles.blackKeyPressed,
                isNoteHighlighted(getMidiNote(octaveNum, 3)) && (isRootNote(3) ? styles.blackKeyRootHighlighted : styles.blackKeyHighlighted),
                isNoteInScale(3) && styles.blackKeyInScale
              ]}
              onPressIn={() => handleKeyPress(octaveNum, 3)}
              onPressOut={() => handleKeyRelease(octaveNum, 3)}
            >
              <Text style={styles.blackKeyLabel}>D#</Text>
            </Pressable>
          </View>
          
          {/* Empty space for E-F */}
          <View style={styles.blackKeySpacerHorizontal} />
          
          {/* Second group (F#, G#, A#) */}
          <View style={styles.blackKeyGroupHorizontal}>
            <Pressable
              key={`black-${octaveNum}-6`}
              style={[
                styles.blackKeyHorizontal,
                pressedKeys.includes(getMidiNote(octaveNum, 6)) && styles.blackKeyPressed,
                isNoteHighlighted(getMidiNote(octaveNum, 6)) && (isRootNote(6) ? styles.blackKeyRootHighlighted : styles.blackKeyHighlighted),
                isNoteInScale(6) && styles.blackKeyInScale
              ]}
              onPressIn={() => handleKeyPress(octaveNum, 6)}
              onPressOut={() => handleKeyRelease(octaveNum, 6)}
            >
              <Text style={styles.blackKeyLabel}>F#</Text>
            </Pressable>
            
            <Pressable
              key={`black-${octaveNum}-8`}
              style={[
                styles.blackKeyHorizontal,
                pressedKeys.includes(getMidiNote(octaveNum, 8)) && styles.blackKeyPressed,
                isNoteHighlighted(getMidiNote(octaveNum, 8)) && (isRootNote(8) ? styles.blackKeyRootHighlighted : styles.blackKeyHighlighted),
                isNoteInScale(8) && styles.blackKeyInScale
              ]}
              onPressIn={() => handleKeyPress(octaveNum, 8)}
              onPressOut={() => handleKeyRelease(octaveNum, 8)}
            >
              <Text style={styles.blackKeyLabel}>G#</Text>
            </Pressable>
            
            <Pressable
              key={`black-${octaveNum}-10`}
              style={[
                styles.blackKeyHorizontal,
                pressedKeys.includes(getMidiNote(octaveNum, 10)) && styles.blackKeyPressed,
                isNoteHighlighted(getMidiNote(octaveNum, 10)) && (isRootNote(10) ? styles.blackKeyRootHighlighted : styles.blackKeyHighlighted),
                isNoteInScale(10) && styles.blackKeyInScale
              ]}
              onPressIn={() => handleKeyPress(octaveNum, 10)}
              onPressOut={() => handleKeyRelease(octaveNum, 10)}
            >
              <Text style={styles.blackKeyLabel}>A#</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  // Render multiple octaves
  const renderOctaves = () => {
    const octaves = [];
    for (let i = 0; i < numOctaves; i++) {
      octaves.push(renderHorizontalPiano(octave + i));
    }
    return octaves;
  };

  return (
    <View style={styles.container}>
      {renderOctaves()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: 10,
    width: '100%',
  },
  horizontalOctave: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  whiteKeysRow: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    position: 'absolute',
    bottom: 0,
  },
  whiteKeyHorizontal: {
    flex: 1,
    backgroundColor: colors.piano.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginHorizontal: 1,
    height: '100%',
  },
  whiteKeyPressed: {
    backgroundColor: '#E0E0E0',
  },
  whiteKeyHighlighted: {
    backgroundColor: colors.piano.highlight,
  },
  whiteKeyRootHighlighted: {
    backgroundColor: colors.chord.user, // Changed to match USER button color (dark purple)
  },
  whiteKeyInScale: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  blackKeysRow: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  blackKeyGroupHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  blackKeySpacerHorizontal: {
    width: '14.28%', // 1/7 of the width (for the E-F gap)
  },
  blackKeyHorizontal: {
    backgroundColor: colors.piano.black,
    borderRadius: 4,
    width: 30,
    height: '100%',
    marginHorizontal: 5,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 5,
    zIndex: 1,
  },
  blackKeyPressed: {
    backgroundColor: '#1A1A1A',
  },
  blackKeyHighlighted: {
    backgroundColor: colors.piano.highlight,
  },
  blackKeyRootHighlighted: {
    backgroundColor: colors.chord.user, // Changed to match USER button color (dark purple)
  },
  blackKeyInScale: {
    borderColor: colors.primary,
    borderWidth: 1.8,
  },
  keyLabel: {
    color: colors.background,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  blackKeyLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
});