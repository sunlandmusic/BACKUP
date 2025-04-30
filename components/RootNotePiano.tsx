import React, { useState, useEffect } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { playChord, stopChord } from '@/utils/audio-utils';
import { colors } from '@/constants/colors';
import { NoteName, MusicMode, Chord, ChordType } from '@/types/music';
import { getScaleNotes, getDiatonicChords, ChordGroup, getChordsForGroup, chordIntervals } from '@/utils/chord-utils';
import { useChordStore } from '@/stores/chord-store';

interface RootNotePianoProps {
  onNoteSelect: (note: string) => void;
  selectedKey: NoteName;
  mode: MusicMode;
  isChordinateActive: boolean;
  selectedSetting?: string | null;
  activeChordGroup?: ChordGroup;
  currentChordIndex?: number;
  octave?: number;
  inversion?: number;
}

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS = ['C#', 'D#', 'F#', 'G#', 'A#'];
const BLACK_KEY_POSITIONS = [33, 92, 206, 265, 323];

export const RootNotePiano: React.FC<RootNotePianoProps> = ({
  onNoteSelect,
  selectedKey,
  mode,
  isChordinateActive = false,
  selectedSetting = null,
  activeChordGroup = 'TRIAD',
  currentChordIndex = 0,
  octave = 0,
  inversion = 0
}) => {
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [scaleNotes, setScaleNotes] = useState<NoteName[]>([]);
  const { setCurrentChord } = useChordStore();
  const [availableChords, setAvailableChords] = useState<string[]>([]);

  useEffect(() => {
    if (selectedKey && mode) {
      setScaleNotes(getScaleNotes(selectedKey, mode));
    }
  }, [selectedKey, mode]);

  useEffect(() => {
    setAvailableChords(getChordsForGroup(activeChordGroup, mode));
  }, [activeChordGroup, mode]);

  const getRandomChordType = (note: NoteName): ChordType => {
    const majorOptions: ChordType[] = ['major', 'major7', 'major9', '6', 'add9', 'major13'];
    const minorOptions: ChordType[] = ['minor', 'minor7', 'minor9', 'minor6', 'minorMajor7', 'm7b5'];
    const dominantOptions: ChordType[] = ['7', '9', '11', '7sus4', 'augmented7'];
    const diminishedOptions: ChordType[] = ['dim', 'dim7'];
    
    const scaleDegree = scaleNotes.indexOf(note);
    if (mode === 'major') {
      switch(scaleDegree) {
        case 0: // I
          return majorOptions[Math.floor(Math.random() * majorOptions.length)];
        case 1: // ii
        case 2: // iii
        case 5: // vi
          return minorOptions[Math.floor(Math.random() * minorOptions.length)];
        case 3: // IV
          return majorOptions[Math.floor(Math.random() * majorOptions.length)];
        case 4: // V
          return dominantOptions[Math.floor(Math.random() * dominantOptions.length)];
        case 6: // vii
          return diminishedOptions[Math.floor(Math.random() * diminishedOptions.length)];
        default:
          return 'major';
      }
    } else if (mode === 'minor') {
      switch(scaleDegree) {
        case 0: // i
          return minorOptions[Math.floor(Math.random() * minorOptions.length)];
        case 1: // ii°
          return diminishedOptions[Math.floor(Math.random() * diminishedOptions.length)];
        case 2: // III
        case 5: // VI
          return majorOptions[Math.floor(Math.random() * majorOptions.length)];
        case 3: // iv
        case 4: // v
          return minorOptions[Math.floor(Math.random() * minorOptions.length)];
        case 6: // VII
          return dominantOptions[Math.floor(Math.random() * dominantOptions.length)];
        default:
          return 'minor';
      }
    }
    return 'major';
  };

  const getDiatonicChordType = (note: NoteName): string => {
    if (!isChordinateActive || !scaleNotes.includes(note)) return note;

    const scaleDegree = scaleNotes.indexOf(note);
    let chordType = '';
    
    if (activeChordGroup === 'RANDOM') {
      const randomType = getRandomChordType(note);
      chordType = note + randomType;
    } else if (mode === 'major') {
      switch (activeChordGroup) {
        case 'TRIAD':
          const triadTypes = ['', 'm', 'm', '', '', 'm', 'dim'];
          chordType = note + triadTypes[scaleDegree];
          break;
        case '4 NOTE':
          const seventhTypes = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'];
          chordType = note + seventhTypes[scaleDegree];
          break;
        case 'HIGHER':
          const extendedTypes = ['maj9', 'm9', 'm9', 'maj9', '9', 'm9', 'm9'];
          chordType = note + extendedTypes[scaleDegree];
          break;
        default:
          chordType = note;
      }
    } else if (mode === 'minor') {
      switch (activeChordGroup) {
        case 'TRIAD':
          const triadTypes = ['m', 'dim', '', 'm', 'm', '', ''];
          chordType = note + triadTypes[scaleDegree];
          break;
        case '4 NOTE':
          const seventhTypes = ['m7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7', '7'];
          chordType = note + seventhTypes[scaleDegree];
          break;
        case 'HIGHER':
          const extendedTypes = ['m9', 'm9b5', 'maj9', 'm9', 'm9', 'maj9', '9'];
          chordType = note + extendedTypes[scaleDegree];
          break;
        default:
          chordType = note;
      }
    } else {
      chordType = note;
    }

    return chordType;
  };

  const getChordLabel = (note: string): string => {
    if (!isChordinateActive) {
      return note;
    }

    if (!scaleNotes.includes(note as NoteName)) {
      return ''; // Return empty string for non-diatonic notes when CHORDINATE is active
    }

    return getDiatonicChordType(note as NoteName);
  };

  const handleKeyPress = (note: string) => {
    setSelectedNote(note);
    
    if (!isChordinateActive) {
      const midiNote = 60 + ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        .indexOf(note);
      playChord([midiNote]);
      setCurrentChord(null);
      onNoteSelect(note);
      return;
    }

    if (!scaleNotes.includes(note as NoteName)) {
      const midiNote = 60 + ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        .indexOf(note);
      playChord([midiNote]);
      setCurrentChord(null);
      onNoteSelect(note);
      return;
    }

    const scaleDegree = scaleNotes.indexOf(note as NoteName);
    let chordType: ChordType;

    if (activeChordGroup === 'RANDOM') {
      chordType = getRandomChordType(note as NoteName);
    } else if (mode === 'major') {
      switch (activeChordGroup) {
        case 'TRIAD':
          chordType = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim'][scaleDegree] as ChordType;
          break;
        case '4 NOTE':
          chordType = ['major7', 'minor7', 'minor7', 'major7', '7', 'minor7', 'm7b5'][scaleDegree] as ChordType;
          break;
        case 'HIGHER':
          chordType = ['major9', 'minor9', 'minor9', 'major9', '9', 'minor9', 'm9b5'][scaleDegree] as ChordType;
          break;
        default:
          chordType = 'major';
      }
    } else if (mode === 'minor') {
      switch (activeChordGroup) {
        case 'TRIAD':
          chordType = ['minor', 'dim', 'major', 'minor', 'minor', 'major', 'major'][scaleDegree] as ChordType;
          break;
        case '4 NOTE':
          chordType = ['minor7', 'm7b5', 'major7', 'minor7', 'minor7', 'major7', '7'][scaleDegree] as ChordType;
          break;
        case 'HIGHER':
          chordType = ['minor9', 'm9b5', 'major9', 'minor9', 'minor9', 'major9', '9'][scaleDegree] as ChordType;
          break;
        default:
          chordType = 'minor';
      }
    } else {
      chordType = 'major';
    }

    // Get the MIDI note number for the root note
    const midiRoot = 60 + ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
      .indexOf(note) + (octave * 12); // Apply octave shift

    // Normalize chord type to match chordIntervals keys
    const normalizedChordType = chordType.toLowerCase()
      .replace('maj', 'major')
      .replace('min', 'minor') as ChordType;

    // Get the chord intervals based on the chord type
    const intervals = chordIntervals[normalizedChordType];
    
    if (!intervals) {
      console.warn(`No intervals found for chord type: ${chordType}`);
      // Fallback to major/minor triad if intervals not found
      const fallbackType = chordType.includes('minor') ? 'minor' : 'major';
      const fallbackIntervals = chordIntervals[fallbackType];
      if (!fallbackIntervals) {
        playChord([midiRoot]); // Last resort: play single note
        return;
      }
      const chordNotes = fallbackIntervals.map((interval: number) => midiRoot + interval);
      playChord(chordNotes);
      return;
    }

    // Generate the chord notes by adding intervals to the root note
    let chordNotes = intervals.map((interval: number) => midiRoot + interval);

    // Apply inversion if specified
    if (inversion !== 0 && chordNotes.length > 0) {
      const octave = 12; // One octave in semitones
      let invertedNotes = [...chordNotes];

      if (inversion > 0) {
        // For each positive inversion step
        for (let i = 0; i < Math.min(Math.abs(inversion), chordNotes.length); i++) {
          // Take the first note and move it up an octave
          const firstNote = invertedNotes[0];
          invertedNotes = [...invertedNotes.slice(1), firstNote + octave];
        }
      } else {
        // For each negative inversion step
        for (let i = 0; i < Math.min(Math.abs(inversion), chordNotes.length); i++) {
          // Take the last note and move it down an octave
          const lastNote = invertedNotes[invertedNotes.length - 1];
          invertedNotes = [lastNote - octave, ...invertedNotes.slice(0, -1)];
        }
      }

      // Ensure the notes are in ascending order within the chord
      chordNotes = invertedNotes.sort((a, b) => a - b);
    }

    // Create and play the chord
    const chord: Chord = {
      id: Date.now().toString(),
      root: note as NoteName,
      type: chordType,
      notes: chordNotes,
      duration: 500
    };

    // Stop any currently playing chord before playing the new one
    stopChord();
    playChord(chord.notes);
    setCurrentChord(chord);
    onNoteSelect(note);
  };

  const handleKeyRelease = () => {
    setSelectedNote(null);
    stopChord();
    setCurrentChord(null);
  };

  const renderWhiteKeys = () => {
    return WHITE_KEYS.map((note) => (
      <Pressable
        key={note}
        style={[
          styles.whiteKey,
          selectedNote === note && styles.whiteKeyHighlighted,
          scaleNotes.includes(note as NoteName) && styles.whiteKeyInScale
        ]}
        onPressIn={() => handleKeyPress(note)}
        onPressOut={handleKeyRelease}
      >
        <View style={[
          styles.whiteKeyInner,
          selectedNote === note && styles.whiteKeyInnerHighlighted,
          scaleNotes.includes(note as NoteName) && styles.whiteKeyInnerInScale,
        ]}>
          {(!isChordinateActive || scaleNotes.includes(note as NoteName)) && (
            isChordinateActive ? (
              <View style={styles.rotatedLabelContainer}>
                <Text style={[
                  styles.noteLabel,
                  styles.chordLabel,
                  selectedNote === note && styles.noteLabelHighlighted,
                ]} numberOfLines={1} adjustsFontSizeToFit>
                  {getChordLabel(note)}
                </Text>
              </View>
            ) : (
              <View style={styles.regularLabelContainer}>
                <Text style={[
                  styles.noteLabel,
                  selectedNote === note && styles.noteLabelHighlighted,
                ]}>
                  {note}
                </Text>
              </View>
            )
          )}
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
          scaleNotes.includes(note as NoteName) && styles.blackKeyInScale
        ]}
        onPressIn={() => handleKeyPress(note)}
        onPressOut={() => handleKeyRelease()}
      >
        {(!isChordinateActive || scaleNotes.includes(note as NoteName)) && (
          isChordinateActive ? (
            <View style={styles.rotatedLabelContainer}>
              <Text style={[
                styles.noteLabel,
                styles.blackKeyLabel,
                selectedNote === note && styles.noteLabelHighlighted,
                styles.chordLabel
              ]}>
                {getChordLabel(note)}
              </Text>
            </View>
          ) : (
            <View style={styles.regularLabelContainer}>
              <Text style={[
                styles.noteLabel,
                styles.blackKeyLabel,
                selectedNote === note && styles.noteLabelHighlighted,
              ]}>
                {note}
              </Text>
            </View>
          )
        )}
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
    borderWidth: 1,
    borderColor: '#444444',
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
  regularLabelContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotatedLabelContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  noteLabel: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  blackKeyLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  noteLabelHighlighted: {
    color: '#FFFFFF',
  },
  chordLabel: {
    fontSize: 16,
    fontWeight: '600',
    width: 90,
    textAlign: 'center',
  }
}); 