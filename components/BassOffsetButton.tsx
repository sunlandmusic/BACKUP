import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

interface BassOffsetButtonProps {
  offset: number;
  label: string;
  onPress: (offset: number) => void;
  isSelected?: boolean;
}

export const BassOffsetButton: React.FC<BassOffsetButtonProps> = ({
  offset,
  label,
  onPress,
  isSelected = false
}) => {
  return (
    <Pressable
      style={[
        styles.button,
        isSelected && styles.selectedButton
      ]}
      onPress={() => onPress(offset - 12)}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 78,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    margin: 4,
    backgroundColor: colors.surfaceLight,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  selectedButton: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.text,
  },
  text: {
    color: colors.text, // Keep white text for bass offset buttons
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});