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
    if (customColor) {
      return customColor;
    }
    
    // Make sure the chord type exists in our colors
    if (type in colors.chord) {
      return colors.chord[type as keyof typeof colors.chord];
    }
    
    return colors.surface;
  };

  // Determine text color based on chord type and specifications
  const getTextColor = () => {
    // Bright grey text for:
    // 1. Major chords (major, major7, major9)
    // 2. 7 chord
    // 3. Extended major chords (major11, major13)
    // 4. 6 and 69 chords
    if (
      type === 'major' || type === 'major7' || type === 'major9' || 
      type === '7' ||
      type === 'major11' || type === 'major13' || 
      type === '6' || type === '69'
    ) {
      return '#E0E0E0';
    }

    // White text for:
    // 1. All minor chords (MIN, MIN7, MIN9)
    // 2. Special chords (m11, m7b5, add9, user)
    // 3. All second row buttons (17-32)
    // 4. Bass offset buttons
    // 5. 9 chord
    if (
      type === 'minor' || type === 'minor7' || type === 'minor9' ||
      type === 'm11' || type === 'm7b5' || type === 'add9' || type === 'user' ||
      label.includes('BASS') ||
      (type === 'minor6' || type === 'minor13' || type === 'minorMajor7' || type === '7sus4') ||
      type === '9'
    ) {
      return '#FFFFFF';
    }
    
    // Black text for all other chord types
    return '#000000';
  };

  // Handle multi-line text for special cases
  const renderLabel = () => {
    if (label === 'AUGM7') {
      return (
        <>
          <Text style={[styles.text, { color: getTextColor() }]}>AUG</Text>
          <Text style={[styles.text, { color: getTextColor() }]}>M7</Text>
        </>
      );
    }
    
    if (label.includes('BASS')) {
      const [direction, bass] = label.split(' ');
      return (
        <>
          <Text style={[styles.text, { color: '#FFFFFF' }]}>{direction}</Text>
          <Text style={[styles.text, { color: '#FFFFFF' }]}>BASS</Text>
        </>
      );
    }

    return (
      <Text style={[
        styles.text,
        { color: getTextColor() }
      ]}>
        {label}
      </Text>
    );
  };

  return (
    <View style={styles.buttonContainer}>
      <Pressable
        style={[
          styles.button,
          { backgroundColor: getBackgroundColor() },
          isSelected && styles.selectedButton,
          isHighlighted && styles.highlightedButton,
        ]}
        onPress={onPress}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
      >
        {isMatchingKeyMode && <View style={styles.innerBorder} />}
        {renderLabel()}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    margin: 3.5,
    marginVertical: 1.5,
    borderRadius: 7,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  button: {
    width: 63,
    height: 50,
    borderRadius: 7,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  innerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: '#FFA500',
    borderRadius: 7,
  },
  text: {
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    zIndex: 2,
  },
  selectedButton: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  highlightedButton: {
    borderWidth: 2,
    borderColor: '#FFC107',
  },
});