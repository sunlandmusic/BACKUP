import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { NoteName, noteNames, ChordType } from '@/types/music';
import { colors } from '@/constants/colors';
import { initAudio, playChord, stopChord } from '@/utils/audio-utils';
import { createChord } from '@/utils/chord-utils';

// The 12 chord types we'll use (replacing 'user' with 'add9')
const chordTypes: ChordType[] = [
  'major', 'minor', 'diminished', 'augmented',
  'dominant7', 'major7', 'minor7', 'major9',
  'minor9', 'sus2', 'sus4', 'add9'
];

export default function TwelveKeysScreen() {
  // Initialize audio on component mount
  useEffect(() => {
    const setupAudio = async () => {
      await initAudio();
    };
    // Fire and forget
    setupAudio().catch(console.error);
    return () => stopChord();
  }, []);

  // Handle chord button press
  const handleChordPress = (noteName: NoteName, chordType: ChordType) => {
    const chord = createChord(noteName, chordType);
    playChord(chord.notes);
  };

  // Handle chord button release
  const handleChordRelease = () => {
    stopChord();
  };

  // Render a single piano key with its 12 chord buttons
  const renderKey = (noteName: NoteName, isBlack: boolean) => {
    const keyStyle = isBlack ? styles.blackKey : styles.whiteKey;
    const buttonTextStyle = isBlack ? styles.blackKeyButtonText : styles.whiteKeyButtonText;

    return (
      <View style={[styles.pianoKey, keyStyle]}>
        <View style={styles.chordButtonsGrid}>
          {/* 4 rows of 3 buttons */}
          {[0, 1, 2, 3].map((row) => (
            <View key={row} style={styles.buttonRow}>
              {[0, 1, 2].map((col) => {
                const chordIndex = row * 3 + col;
                const chordType = chordTypes[chordIndex];
                return (
                  <Pressable
                    key={col}
                    style={styles.chordButton}
                    onPressIn={() => handleChordPress(noteName, chordType)}
                    onPressOut={handleChordRelease}
                  >
                    <Text style={[styles.chordButtonText, buttonTextStyle]}>
                      {chordType}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.pianoContainer}>
        {/* White keys */}
        {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((note) => (
          renderKey(note as NoteName, false)
        ))}
        {/* Black keys overlay */}
        <View style={styles.blackKeysContainer}>
          {['C#', 'D#', 'F#', 'G#', 'A#'].map((note) => (
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
  pianoContainer: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
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
    height: '60%',
    position: 'absolute',
    width: '8%',
    zIndex: 2,
  },
  blackKeysContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: '6%',
  },
  chordButtonsGrid: {
    flex: 1,
    padding: 2,
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