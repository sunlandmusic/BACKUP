import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { ChordType } from '@/types/music';

interface ChordTypeButtonProps {
  type: ChordType | string;
  label: string;
  onPress: () => void;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isMatchingKeyMode?: boolean;
  customColor?: string;
}

export const ChordTypeButton: React.FC<ChordTypeButtonProps> = ({
  type,
  label,
  onPress,
  isSelected = false,
  isHighlighted = false,
  isMatchingKeyMode = false,
  customColor
}) => {
  // Get background color based on chord type
  const getBackgroundColor = () => {
    if (isSelected) {
      return colors.primary;
    }
    
    if (customColor) {
      return customColor;
    }
    
    // Make sure the chord type exists in our colors
    if (type in colors.chord) {
      return colors.chord[type as keyof typeof colors.chord];
    }
    
    return colors.surface;
  };

  // Determine text color based on chord type
  const getTextColor = () => {
    if (isMatchingKeyMode) {
      return '#FFA500'; // Orange color for matching key/mode
    }
    
    // All buttons in the bottom row should have white text, plus minor chords
    if (type === 'm11' || type === 'm7b5' || type === 'add9' || type === 'user' || 
        type === 'min' || type === 'min7' || type === 'min9' ||
        type === 'minor' || type === 'minor7' || type === 'minor9') {
      return '#FFFFFF';
    }
    
    // Black text for all other chord types
    return '#000000';
  };

  return (
    <Pressable
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        isSelected && styles.selectedButton,
        isHighlighted && styles.highlightedButton
      ]}
      onPress={onPress}
    >
      <Text style={[styles.text, { color: getTextColor() }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 78,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    margin: 4,
    aspectRatio: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  selectedButton: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  highlightedButton: {
    borderWidth: 2,
    borderColor: '#FFC107',
  },
  text: {
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
    transform: [{ rotate: '90deg' }],
  },
});