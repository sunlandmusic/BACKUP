import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ViewStyle, TextStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { Chord } from '@/types/music';

interface EditButtonProps {
  onClear: () => void;
  onCopyPaste: () => void;
  isCopyMode: boolean;
  lastPressedChord: Chord | null;
}

export const EditButton: React.FC<EditButtonProps> = ({ onClear, onCopyPaste, isCopyMode, lastPressedChord }) => {
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  const handlePress = () => {
    setIsPopupVisible(!isPopupVisible);
  };

  const handleClear = () => {
    onClear();
    setIsPopupVisible(false);
  };

  const handleCopyPaste = () => {
    if (lastPressedChord) {
      onCopyPaste();
    }
    setIsPopupVisible(false);
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.editButton as ViewStyle}
        onPress={handlePress}
      >
        <Text style={styles.editButtonText as TextStyle}>⋮</Text>
      </Pressable>
      
      {isPopupVisible && (
        <View style={styles.popup as ViewStyle}>
          <Pressable style={styles.popupButton as ViewStyle} onPress={handleClear}>
            <Text style={styles.popupButtonText as TextStyle}>CLEAR</Text>
          </Pressable>
          <Pressable 
            style={[styles.popupButton as ViewStyle, !lastPressedChord && styles.disabledButton]} 
            onPress={handleCopyPaste}
            disabled={!lastPressedChord}
          >
            <Text style={[styles.popupButtonText as TextStyle, !lastPressedChord && styles.disabledText]}>
              COPY/PASTE
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  editButtonText: {
    color: '#8B0000',
    fontSize: 28,
    fontWeight: '900',
  },
  popup: {
    position: 'absolute',
    left: 50,
    bottom: 120,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
    minHeight: 100,
    minWidth: 120,
  },
  popupButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    backgroundColor: colors.buttonGrey,
    marginVertical: 5,
  },
  popupButtonText: {
    color: colors.text,
    fontSize: 14.4,
    fontWeight: '400',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: colors.textMuted,
  },
}); 