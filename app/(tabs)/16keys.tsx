import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { NoteName, noteNames, ChordType } from '@/types/music';
import { colors } from '@/constants/colors';
import { initAudio, playChord, stopChord } from '@/utils/audio-utils';
import { createChord } from '@/utils/chord-utils';
import { Eye } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { NavigationMenu } from '@/components/NavigationMenu';

// The 16 chord types in the specified order (8 rows of 2)
const chordTypes: ChordType[] = [
  'major', 'minor',      // Row 1
  'major7', 'minor7',    // Row 2
  'major9', 'minor9',    // Row 3
  'sus2', 'sus4',       // Row 4
  'dim', 'dim7',        // Row 5
  'm11', 'm7b5',        // Row 6
  '7', '9',             // Row 7
  'add9', '6'           // Row 8
];

export default function SixteenKeysScreen() {
  const [showChords, setShowChords] = useState(true);
  const [currentNote, setCurrentNote] = useState<NoteName>('C');
  const [currentChordType, setCurrentChordType] = useState<ChordType>('major');
  const [menuVisible, setMenuVisible] = useState(false);

  // Initialize audio on component mount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        const success = await initAudio();
        if (!success) {
          console.error('Failed to initialize audio in 16keys component');
        }
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    };
    setupAudio();
    return () => {
      stopChord();
    };
  }, []);

  // Handle chord button press
  const handleChordPress = async (noteName: NoteName, chordType: ChordType) => {
    try {
      const chord = createChord(noteName, chordType);
      await playChord(chord.notes);
    } catch (error) {
      console.error('Error playing chord:', error);
    }
  };

  // Handle chord button release
  const handleChordRelease = async () => {
    try {
      await stopChord();
    } catch (error) {
      console.error('Error stopping chord:', error);
    }
  };

  // Render a single piano key with its 16 chord buttons
  const renderKey = (noteName: NoteName, isBlack: boolean) => {
    const keyStyle = isBlack ? styles.blackKey : styles.whiteKey;
    const buttonTextStyle = isBlack ? styles.blackKeyButtonText : styles.whiteKeyButtonText;

    return (
      <View style={[styles.pianoKey, keyStyle]}>
        {showChords && (
          <View style={styles.chordButtonsGrid}>
            {/* 8 rows of 2 buttons */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
              <View key={row} style={styles.buttonRow}>
                {[0, 1].map((col) => {
                  const chordIndex = row * 2 + col;
                  const chordType = chordTypes[chordIndex];
                  const displayText = (() => {
                    if (chordType === 'major') return 'MAJ';
                    if (chordType === 'minor') return 'MIN';
                    if (chordType === 'major7') return 'MAJ7';
                    if (chordType === 'minor7') return 'MIN7';
                    if (chordType === 'major9') return 'MAJ9';
                    if (chordType === 'minor9') return 'MIN9';
                    if (chordType === 'm11' || chordType === 'm7b5') return chordType;
                    return chordType.toUpperCase();
                  })();
                  
                  return (
                    <Pressable
                      key={col}
                      style={styles.chordButton}
                      onPressIn={() => handleChordPress(noteName, chordType)}
                      onPressOut={handleChordRelease}
                    >
                      <Text style={[styles.chordButtonText, buttonTextStyle]}>
                        {displayText}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.eyeButton}
        onPress={() => setMenuVisible(!menuVisible)}
      >
        <Eye size={24} color={colors.primary} />
      </Pressable>
      
      {/* Navigation Menu */}
      <NavigationMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
        currentRoute={usePathname()}
      />
      
      <View style={styles.pianoContainer}>
        {/* White keys */}
        {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((note) => (
          renderKey(note as NoteName, false)
        ))}
        {/* Black keys overlay */}
        <View style={[styles.blackKeysContainer, { top: -150 }]}>
          {['C#', 'C#', 'C#', 'C#', 'C#', 'C#', 'D#', 'F#', 'G#', 'A#'].map((note) => (
            renderKey(note as NoteName, true)
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222222',
    padding: 10,
  },
  eyeButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 3,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pianoContainer: {
    flex: 0.5,
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    marginBottom: 10,
  },
  pianoKey: {
    flex: 1,
    height: '100%',
    marginHorizontal: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  whiteKey: {
    backgroundColor: '#999999',
    zIndex: 1,
  },
  blackKey: {
    backgroundColor: '#000000',
    height: '100%',
    position: 'absolute',
    width: '14.28%', // 100% / 7 white keys
    zIndex: 2,
  },
  blackKeysContainer: {
    position: 'absolute',
    top: -150,
    left: '7.14%', // Half of one white key width
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: '100%',
  },
  chordButtonsGrid: {
    flex: 1,
    padding: 2,
    justifyContent: 'space-between',
  },
  buttonRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1,
  },
  chordButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    margin: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 12,
  },
  chordButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  whiteKeyButtonText: {
    color: '#000000',
  },
  blackKeyButtonText: {
    color: '#FFFFFF',
  },
}); 