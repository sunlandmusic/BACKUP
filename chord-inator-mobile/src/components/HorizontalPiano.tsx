import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Text, Platform } from 'react-native';
import { colors } from '@/constants/colors';
import { NoteName, noteNames } from '@/types/music';
import { playNote, stopNote, initAudio } from '@/utils/audio-utils';

interface HorizontalPianoProps {
  octave?: number;
  numOctaves?: number;
  onNotePress?: (noteName: NoteName, midiNote: number) => void;
  onNoteRelease?: () => void;
  highlightedNotes?: number[];
  rootNote?: NoteName;
  scaleNotes?: NoteName[];
}

export const HorizontalPiano: React.FC<HorizontalPianoProps> = ({
  octave = 4,
  numOctaves = 1,
  onNotePress,
  onNoteRelease,
  highlightedNotes = [],
  rootNote,
  scaleNotes = [],
}) => {
  const [pressedKeys, setPressedKeys] = useState<number[]>([]);
  const [activeKey, setActiveKey] = useState<number | null>(null);
  const isMouseDownRef = useRef(false);

  // Initialize audio on component mount
  useEffect(() => {
    const setupAudio = async () => {
      await initAudio();
    };
    
    setupAudio();
    
    // Cleanup function to stop any playing notes when component unmounts
    return () => {
      pressedKeys.forEach(midiNote => {
        stopNote(midiNote);
      });
    };
  }, []);

  // Update highlighted notes when they change
  useEffect(() => {
    // If highlightedNotes is empty, clear pressed keys
    if (highlightedNotes.length === 0 && pressedKeys.length > 0) {
      setPressedKeys([]);
    }
  }, [highlightedNotes]);

  // Add global mouse up handler for web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleGlobalMouseUp = () => {
        if (isMouseDownRef.current && activeKey !== null) {
          // Release the active key
          const midiNote = activeKey;
          stopNote(midiNote);
          setPressedKeys(prev => prev.filter(note => note !== midiNote));
          setActiveKey(null);
          isMouseDownRef.current = false;
          
          // Call onNoteRelease to ensure highlights are cleared
          if (onNoteRelease) {
            onNoteRelease();
          }
        }
      };
      
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (isMouseDownRef.current && activeKey !== null) {
          // Check if mouse is still over the element
          const element = document.elementFromPoint(e.clientX, e.clientY);
          const keyId = element?.getAttribute('data-key-id');
          
          if (!keyId || keyId !== activeKey.toString()) {
            // Mouse has left the key
            const midiNote = activeKey;
            stopNote(midiNote);
            setPressedKeys(prev => prev.filter(note => note !== midiNote));
            setActiveKey(null);
            
            // Call onNoteRelease to ensure highlights are cleared
            if (onNoteRelease) {
              onNoteRelease();
            }
          }
        }
      };
      
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('mousemove', handleGlobalMouseMove);
      
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [activeKey, onNoteRelease]);

  // Calculate MIDI note number from octave and note index
  const getMidiNote = (octaveNum: number, noteIndex: number): number => {
    return 12 * (octaveNum + 1) + noteIndex;
  };

  // Handle key press
  const handleKeyPress = (octaveNum: number, noteIndex: number) => {
    const noteName = noteNames[noteIndex] as NoteName;
    const midiNote = getMidiNote(octaveNum, noteIndex);
    
    // Set mouse down state for web
    if (Platform.OS === 'web') {
      isMouseDownRef.current = true;
      setActiveKey(midiNote);
    }
    
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
    
    // Reset mouse down state for web
    if (Platform.OS === 'web') {
      isMouseDownRef.current = false;
      setActiveKey(null);
    }
    
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

  return (
    <View style={styles.container}>
      {/* White keys */}
      <View style={styles.whiteKeysRow}>
        {[0, 2, 4, 5, 7, 9, 11].map(noteIndex => {
          const midiNote = getMidiNote(octave, noteIndex);
          const isPressed = pressedKeys.includes(midiNote);
          const isHighlighted = isNoteHighlighted(midiNote);
          const isRoot = isRootNote(noteIndex);
          const isInScale = isNoteInScale(noteIndex);
          const noteName = noteNames[noteIndex];
          
          // Use the scaleNotes prop to determine if the note is in the current scale
          const isInCurrentScale = scaleNotes.includes(noteName);
          
          return (
            <Pressable
              key={`white-${noteIndex}`}
              style={[
                styles.whiteKey,
                isPressed && styles.whiteKeyPressed,
                isHighlighted && (isRoot ? styles.whiteKeyRootHighlighted : styles.whiteKeyHighlighted),
                isInCurrentScale && styles.whiteKeyInScale
              ]}
              onPressIn={() => handleKeyPress(octave, noteIndex)}
              onPressOut={() => handleKeyRelease(octave, noteIndex)}
              {...(Platform.OS === 'web' ? { 'data-key-id': midiNote.toString() } : {})}
            >
              <View style={[
                styles.whiteKeyInner,
                isInCurrentScale && styles.whiteKeyInnerInScale
              ]}>
                <Text style={styles.keyLabel}>
                  {noteName}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      
      {/* Black keys */}
      <View style={styles.blackKeysRow}>
        {/* C# */}
        <Pressable
          style={[
            styles.blackKey,
            styles.blackKeyPosition1,
            pressedKeys.includes(getMidiNote(octave, 1)) && styles.blackKeyPressed,
            isNoteHighlighted(getMidiNote(octave, 1)) && (isRootNote(1) ? styles.blackKeyRootHighlighted : styles.blackKeyHighlighted),
            isNoteInScale(1) && styles.blackKeyInScale
          ]}
          onPressIn={() => handleKeyPress(octave, 1)}
          onPressOut={() => handleKeyRelease(octave, 1)}
          {...(Platform.OS === 'web' ? { 'data-key-id': getMidiNote(octave, 1).toString() } : {})}
        >
          <Text style={styles.blackKeyLabel}>C#</Text>
        </Pressable>
        
        {/* D# */}
        <Pressable
          style={[
            styles.blackKey,
            styles.blackKeyPosition2,
            pressedKeys.includes(getMidiNote(octave, 3)) && styles.blackKeyPressed,
            isNoteHighlighted(getMidiNote(octave, 3)) && (isRootNote(3) ? styles.blackKeyRootHighlighted : styles.blackKeyHighlighted),
            isNoteInScale(3) && styles.blackKeyInScale
          ]}
          onPressIn={() => handleKeyPress(octave, 3)}
          onPressOut={() => handleKeyRelease(octave, 3)}
          {...(Platform.OS === 'web' ? { 'data-key-id': getMidiNote(octave, 3).toString() } : {})}
        >
          <Text style={styles.blackKeyLabel}>D#</Text>
        </Pressable>
        
        {/* F# */}
        <Pressable
          style={[
            styles.blackKey,
            styles.blackKeyPosition3,
            pressedKeys.includes(getMidiNote(octave, 6)) && styles.blackKeyPressed,
            isNoteHighlighted(getMidiNote(octave, 6)) && (isRootNote(6) ? styles.blackKeyRootHighlighted : styles.blackKeyHighlighted),
            isNoteInScale(6) && styles.blackKeyInScale
          ]}
          onPressIn={() => handleKeyPress(octave, 6)}
          onPressOut={() => handleKeyRelease(octave, 6)}
          {...(Platform.OS === 'web' ? { 'data-key-id': getMidiNote(octave, 6).toString() } : {})}
        >
          <Text style={styles.blackKeyLabel}>F#</Text>
        </Pressable>
        
        {/* G# */}
        <Pressable
          style={[
            styles.blackKey,
            styles.blackKeyPosition4,
            pressedKeys.includes(getMidiNote(octave, 8)) && styles.blackKeyPressed,
            isNoteHighlighted(getMidiNote(octave, 8)) && (isRootNote(8) ? styles.blackKeyRootHighlighted : styles.blackKeyHighlighted),
            isNoteInScale(8) && styles.blackKeyInScale
          ]}
          onPressIn={() => handleKeyPress(octave, 8)}
          onPressOut={() => handleKeyRelease(octave, 8)}
          {...(Platform.OS === 'web' ? { 'data-key-id': getMidiNote(octave, 8).toString() } : {})}
        >
          <Text style={styles.blackKeyLabel}>G#</Text>
        </Pressable>
        
        {/* A# */}
        <Pressable
          style={[
            styles.blackKey,
            styles.blackKeyPosition5,
            pressedKeys.includes(getMidiNote(octave, 10)) && styles.blackKeyPressed,
            isNoteHighlighted(getMidiNote(octave, 10)) && (isRootNote(10) ? styles.blackKeyRootHighlighted : styles.blackKeyHighlighted),
            isNoteInScale(10) && styles.blackKeyInScale
          ]}
          onPressIn={() => handleKeyPress(octave, 10)}
          onPressOut={() => handleKeyRelease(octave, 10)}
          {...(Platform.OS === 'web' ? { 'data-key-id': getMidiNote(octave, 10).toString() } : {})}
        >
          <Text style={styles.blackKeyLabel}>A#</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#222222',
    overflow: 'visible',
  },
  whiteKeysRow: {
    flexDirection: 'row',
    position: 'absolute',
    zIndex: 1,
    top: 101,
    left: 0,
    width: '100%',
    justifyContent: 'space-between',
  },
  whiteKey: {
    width: 39,
    height: 100,
    borderRadius: 15,
    backgroundColor: '#999999',
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginHorizontal: 0,
    position: 'relative',
  },
  whiteKeyPressed: {
    backgroundColor: '#777777',
  },
  whiteKeyHighlighted: {
    backgroundColor: colors.piano.highlight,
  },
  whiteKeyRootHighlighted: {
    backgroundColor: colors.chord.user, // Changed to match USER button color (dark purple)
  },
  whiteKeyInScale: {
    borderColor: '#FFA500', // Orange color
    borderWidth: 4, // Increased from 3 to 4 pixels (25% increase)
  },
  whiteKeyInner: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#808080',
    borderRadius: 13, // Slightly smaller than the outer border radius
    margin: 0, // Removed margin to make borders flush
  },
  whiteKeyInnerInScale: {
    borderWidth: 2, // Slightly thicker black border when in scale
  },
  blackKeysRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  blackKey: {
    width: 39,
    height: 100,
    borderRadius: 15,
    position: 'absolute',
    backgroundColor: '#000000',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 5,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  blackKeyPosition1: {
    left: 25, // C#
  },
  blackKeyPosition2: {
    left: 76, // D#
  },
  blackKeyPosition3: {
    left: 177, // F#
  },
  blackKeyPosition4: {
    left: 228, // G#
  },
  blackKeyPosition5: {
    left: 279, // A#
  },
  blackKeyPressed: {
    backgroundColor: '#1D1D1D',
  },
  blackKeyHighlighted: {
    backgroundColor: colors.piano.highlight,
  },
  blackKeyRootHighlighted: {
    backgroundColor: colors.chord.user, // Changed to match USER button color (dark purple)
  },
  blackKeyInScale: {
    borderColor: '#FFA500', // Orange color
    borderWidth: 1, // Regular border width
  },
  keyLabel: {
    color: '#000000',
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  blackKeyLabel: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 3,
  },
});