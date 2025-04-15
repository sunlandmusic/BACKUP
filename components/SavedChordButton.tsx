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
  const getChordDisplayName = (): string => {
    if (!chord) return '';
    
    let displayName = chord.root;
    
    switch (chord.type) {
      case 'major': break;
      case 'minor': displayName += 'm'; break;
      case 'diminished': displayName += 'dim'; break;
      case 'augmented': displayName += 'aug'; break;
      case 'dominant7': displayName += '7'; break;
      case 'major7': displayName += 'maj7'; break;
      case 'minor7': displayName += 'm7'; break;
      case 'major9': displayName += 'maj9'; break;
      case 'minor9': displayName += 'm9'; break;
      case 'dominant9': displayName += '9'; break;
      case 'sus2': displayName += 'sus2'; break;
      case 'sus4': displayName += 'sus4'; break;
      case 'add9': displayName += 'add9'; break;
      case 'm7b5': displayName += 'm7b5'; break;
      case 'dim': displayName += 'dim'; break;
      case 'dim7': displayName += 'dim7'; break;
      default: break;
    }
    
    // Add slash notation for bass note if different from root
    if (chord.bassNote && chord.bassNote !== chord.root) {
      displayName += `/${chord.bassNote}`;
    }
    
    return displayName;
  };

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
      // Add data attribute for web to help with event tracking
      {...(Platform.OS === 'web' ? { 'data-chord-index': index.toString() } : {})}
    >
      <Text style={styles.index}>{index}</Text>
      {chord && (
        <Text style={styles.chordName}>{getChordDisplayName()}</Text>
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
    height: 36,
    borderRadius: 4,
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
    color: colors.text,
    fontSize: 10,
    position: 'absolute',
    top: 2,
    left: 4,
  },
  chordName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
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