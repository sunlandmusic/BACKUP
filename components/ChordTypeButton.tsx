import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
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
    <View style={[
      styles.buttonContainer,
      isMatchingKeyMode && styles.matchingKeyModeContainer
    ]}>
      <Pressable
        style={[
          styles.button,
          { backgroundColor: getBackgroundColor() },
          isSelected && styles.selectedButton,
          isHighlighted && styles.highlightedButton,
        ]}
        onPress={onPress}
      >
        <Text style={[
          styles.text,
          { color: getTextColor() },
          isSelected && styles.selectedText
        ]}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    margin: 2,
    borderRadius: 8,
    padding: 2,
  },
  matchingKeyModeContainer: {
    borderWidth: 3,
    borderColor: '#FFA500',
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
  },
  button: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedButton: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  text: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectedText: {
    color: colors.primary,
  },
  highlightedButton: {
    opacity: 0.8,
  },
});