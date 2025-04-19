import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Pressable, View, Platform } from 'react-native';
import { colors } from '@/constants/colors';
import { Chord } from '@/types/music';

interface SavedChordButtonProps {
  label: string;
  color: string;
  onPress: () => void;
  onPressOut: () => void;
  onLongPress?: () => void;
  index: number;
  chord: Chord | null;
  saveMode?: boolean;
  isHighlighted?: boolean;
  isCurrentlyPlaying?: boolean;
}

export const SavedChordButton: React.FC<SavedChordButtonProps> = ({
  label,
  color,
  onPress,
  onPressOut,
  onLongPress,
  index,
  chord,
  saveMode = false,
  isHighlighted = false,
  isCurrentlyPlaying = false
}) => {
  // Reference to track if button is pressed
  const isPressedRef = useRef(false);

  // For web, add global mouse up handler to ensure sound stops when mouse is released
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleGlobalMouseUp = () => {
        if (isPressedRef.current) {
          // Call onPressOut to stop the sound when mouse is released anywhere
          onPressOut();
          isPressedRef.current = false;
        }
      };
      
      // Add the event listener
      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      // Clean up
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [onPressOut]);

  // Handle press in
  const handlePressIn = () => {
    isPressedRef.current = true;
    onPress();
  };

  // Handle press out
  const handlePressOut = () => {
    isPressedRef.current = false;
    onPressOut();
  };

  // Get chord display name
  const getChordDisplayName = (): { main: string; extension: string } => {
    if (!chord) return { main: '', extension: '' };
    
    let main = chord.root;
    let extension = '';
    
    switch (chord.type) {
      case 'major': break;
      case 'minor': main += 'm'; break;
      case 'dim': main += 'dim'; break;
      case 'dim7': main += 'dim'; extension = '7'; break;
      case 'augmented': main += 'aug'; break;
      case '7': extension = '7'; break;
      case 'major7': main += 'maj'; extension = '7'; break;
      case 'minor7': main += 'm'; extension = '7'; break;
      case 'minorMajor7': main += 'mM'; extension = '7'; break;
      case 'major9': main += 'maj'; extension = '9'; break;
      case 'minor9': main += 'm'; extension = '9'; break;
      case '9': extension = '9'; break;
      case 'sus2': main += 'sus2'; break;
      case 'sus4': main += 'sus4'; break;
      case 'add9': main += 'add'; extension = '9'; break;
      case 'm7b5': main += 'm7b5'; break;
      case 'm11': main += 'm'; extension = '11'; break;
      case '11': extension = '11'; break;
      case 'augmentedMajor7': main += 'aug'; extension = 'M7'; break;
      case 'user': break;
      default: break;
    }
    
    // Add slash notation for bass note if different from root
    if (chord.bassNote && chord.bassNote !== chord.root) {
      main += `/${chord.bassNote}`;
    }
    
    return { main, extension };
  };

  const getTextColor = () => {
    if (!chord) return colors.text;

    // Bright grey text for:
    // 1. Major chords (major, major7, major9)
    // 2. 7 chord
    // 3. Extended major chords (major11, major13)
    // 4. 6 and 69 chords
    if (
      chord.type === 'major' || chord.type === 'major7' || chord.type === 'major9' || 
      chord.type === '7' ||
      chord.type === 'major11' || chord.type === 'major13' || 
      chord.type === '6' || chord.type === '69'
    ) {
      return '#E0E0E0';
    }

    // White text for:
    // 1. All minor chords (MIN, MIN7, MIN9)
    // 2. Special chords (m11, m7b5, add9, user)
    // 3. Bass offset buttons
    // 4. 9 chord
    if (
      chord.type === 'minor' || chord.type === 'minor7' || chord.type === 'minor9' ||
      chord.type === 'm11' || chord.type === 'm7b5' || chord.type === 'add9' || chord.type === 'user' ||
      (chord.type === 'minor6' || chord.type === 'minor13' || chord.type === 'minorMajor7' || chord.type === '7sus4') ||
      chord.type === '9'
    ) {
      return '#FFFFFF';
    }
    
    // Black text for all other chord types
    return '#000000';
  };

  const { main, extension } = getChordDisplayName();

  return (
    <Pressable
      style={[
        styles.button,
        { backgroundColor: chord ? color : colors.buttonGrey },
        saveMode && styles.saveButton,
        isHighlighted && styles.highlightedButton,
        isCurrentlyPlaying && styles.currentlyPlayingButton
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress}
      delayLongPress={500}
      {...(Platform.OS === 'web' ? { 'data-chord-index': index.toString() } : {})}
    >
      <Text style={[styles.index, { color: getTextColor() }]}>{index}</Text>
      {chord && (
        <View style={styles.chordContainer}>
          <Text style={[styles.chordName, { color: getTextColor() }]}>{main}</Text>
          {extension && (
            <Text style={[styles.chordName, { color: getTextColor() }]}>{extension}</Text>
          )}
        </View>
      )}
      {!chord && saveMode && (
        <Text style={styles.saveText}>Empty</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 68,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    borderWidth: 2,
    borderColor: colors.error,
    opacity: 0.9,
  },
  highlightedButton: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  index: {
    fontSize: 10,
    position: 'absolute',
    top: 2,
    left: 4,
  },
  chordContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  chordName: {
    fontSize: 18,
    fontWeight: '400',
  },
  saveText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: 'bold',
  },
  currentlyPlayingButton: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});