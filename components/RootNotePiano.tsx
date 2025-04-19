import React, { useState, useEffect } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { playChord, stopChord } from '@/utils/audio-utils';
import { colors } from '@/constants/colors';
import { NoteName, MusicMode } from '@/types/music';
import { getScaleNotes } from '@/utils/chord-utils';

interface RootNotePianoProps {
  onNoteSelect?: (note: string) => void;
  selectedKey?: NoteName;
  mode?: MusicMode;
}

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS = ['C#', 'D#', 'F#', 'G#', 'A#'];
const BLACK_KEY_POSITIONS = [33, 92, 206, 265, 323];

export function RootNotePiano({ onNoteSelect, selectedKey = 'C', mode = 'major' }: RootNotePianoProps) {
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [scaleNotes, setScaleNotes] = useState<NoteName[]>([]);

  useEffect(() => {
    if (selectedKey && mode) {
      setScaleNotes(getScaleNotes(selectedKey, mode));
    }
  }, [selectedKey, mode]);

  const handleKeyPress = (note: string) => {
    if (selectedNote === note) {
      setSelectedNote(null);
      stopChord();
      onNoteSelect?.('');
    } else {
      setSelectedNote(note);
      const midiNote = 60 + ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        .indexOf(note);
      playChord([midiNote]);
      onNoteSelect?.(note);
    }
  };

  const renderWhiteKeys = () => {
    return WHITE_KEYS.map((note) => (
      <Pressable
        key={note}
        style={[
          styles.whiteKey,
          selectedNote === note && styles.whiteKeyHighlighted,
          scaleNotes.includes(note as NoteName) && styles.whiteKeyInScale,
        ]}
        onPress={() => handleKeyPress(note)}
      >
        <View style={[
          styles.whiteKeyInner,
          selectedNote === note && styles.whiteKeyInnerHighlighted,
          scaleNotes.includes(note as NoteName) && styles.whiteKeyInnerInScale,
        ]}>
          <Text style={[
            styles.noteLabel,
            selectedNote === note && styles.noteLabelHighlighted,
          ]}>
            {note}
          </Text>
        </View>
      </Pressable>
    ));
  };

  const renderBlackKeys = () => {
    return BLACK_KEYS.map((note, index) => (
      <Pressable
        key={note}
        style={[
          styles.blackKey,
          { left: BLACK_KEY_POSITIONS[index] },
          selectedNote === note && styles.blackKeyHighlighted,
          scaleNotes.includes(note as NoteName) && styles.blackKeyInScale,
        ]}
        onPress={() => handleKeyPress(note)}
      >
        <Text style={[
          styles.noteLabel,
          styles.blackKeyLabel,
          selectedNote === note && styles.noteLabelHighlighted,
        ]}>
          {note}
        </Text>
      </Pressable>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.whiteKeysContainer}>
        {renderWhiteKeys()}
      </View>
      <View style={styles.blackKeysContainer}>
        {renderBlackKeys()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222222',
    position: 'relative',
    overflow: 'visible',
  },
  whiteKeysContainer: {
    position: 'absolute',
    zIndex: 1,
    top: 101,
    left: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  whiteKey: {
    width: 49,
    height: 100,
    borderRadius: 15,
    backgroundColor: '#999999',
    borderWidth: 0,
    borderColor: '#333333',
    marginHorizontal: 4.5,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whiteKeyHighlighted: {
    backgroundColor: colors.piano.highlight,
  },
  whiteKeyInScale: {
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  whiteKeyInner: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 13,
    margin: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  whiteKeyInnerHighlighted: {
    borderWidth: 2,
  },
  whiteKeyInnerInScale: {
    borderColor: '#FFA500',
  },
  blackKeysContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    zIndex: 2,
  },
  blackKey: {
    width: 49,
    height: 100,
    borderRadius: 15,
    backgroundColor: '#000000',
    borderWidth: 0,
    borderColor: colors.primary,
    paddingBottom: 5,
    margin: 0,
    position: 'absolute',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  blackKeyHighlighted: {
    backgroundColor: colors.piano.highlight,
  },
  blackKeyInScale: {
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  noteLabel: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  blackKeyLabel: {
    color: '#FFFFFF',
  },
  noteLabelHighlighted: {
    color: '#FFFFFF',
  },
}); 