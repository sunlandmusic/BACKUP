import React from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { colors } from '@/constants/colors';
import { Chord } from '@/types/music';

interface ChordButtonProps {
  chord: Chord;
  onPress: () => void;
  onPressOut?: () => void; // Added onPressOut prop
  isSelected?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const ChordButton: React.FC<ChordButtonProps> = ({
  chord,
  onPress,
  onPressOut, // Use the new prop
  isSelected = false,
  size = 'medium'
}) => {
  // Get chord display name
  const getChordDisplayName = (): string => {
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
  
  // Get color for chord button
  const getChordColor = (): string => {
    switch (chord.type) {
      case 'major': return colors.chord.major;
      case 'minor': return colors.chord.minor;
      case 'diminished': return colors.chord.diminished;
      case 'augmented': return colors.chord.augmented;
      case 'dominant7': return colors.chord.dominant7;
      case 'major7': return colors.chord.major7;
      case 'minor7': return colors.chord.minor7;
      case 'major9': return colors.chord.major9;
      case 'minor9': return colors.chord.minor9;
      case 'dominant9': return colors.chord['9']; // Using '9' from colors instead of 'dominant9'
      case 'sus2': return colors.chord.sus2;
      case 'sus4': return colors.chord.sus4;
      case 'add9': return colors.chord.add9;
      case 'm7b5': return colors.chord.m7b5;
      case 'dim': return colors.chord.dim;
      case 'dim7': return colors.chord.dim7;
      default: return colors.chord.user;
    }
  };
  
  // Get size-specific styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          button: styles.buttonSmall,
          text: styles.textSmall
        };
      case 'large':
        return {
          button: styles.buttonLarge,
          text: styles.textLarge
        };
      default:
        return {
          button: styles.buttonMedium,
          text: styles.textMedium
        };
    }
  };
  
  const sizeStyles = getSizeStyles();

  return (
    <Pressable
      style={[
        styles.button,
        sizeStyles.button,
        { backgroundColor: getChordColor() },
        isSelected && styles.selectedButton
      ]}
      onPressIn={onPress}
      onPressOut={onPressOut} // Use onPressOut when finger is lifted
    >
      <Text style={[styles.text, sizeStyles.text]}>
        {getChordDisplayName()}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  buttonSmall: {
    width: 60,
    height: 60,
  },
  buttonMedium: {
    width: 80,
    height: 80,
  },
  buttonLarge: {
    width: 120,
    height: 120,
  },
  selectedButton: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  text: {
    color: colors.text,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 16,
  },
  textLarge: {
    fontSize: 20,
  },
});