import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ViewStyle, TextStyle, Dimensions } from 'react-native';
import { colors } from '@/constants/colors';
import { Sliders } from 'lucide-react-native';
import SoundsPopup from './SoundsPopup';

interface UtilButtonProps {
  onSoundsPress: () => void;
  onUChordPress: () => void;
  onScanPress: () => void;
  onSavePress: () => void;
}

export const UtilButton: React.FC<UtilButtonProps> = ({
  onSoundsPress,
  onUChordPress,
  onScanPress,
  onSavePress,
}) => {
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [isSoundsPopupVisible, setIsSoundsPopupVisible] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  const handlePress = () => {
    setIsPopupVisible(!isPopupVisible);
  };

  const handleOptionPress = (handler: () => void) => {
    if (handler === onSoundsPress) {
      setIsSoundsPopupVisible(true);
    } else {
      handler();
    }
    setIsPopupVisible(false);
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.utilButton as ViewStyle}
        onPress={handlePress}
      >
        <Sliders size={20} color={colors.primary} />
      </Pressable>
      
      {isPopupVisible && (
        <View style={[styles.editPopupOverlay, { width: screenWidth * 2, height: screenHeight * 2 }]}>
          <Pressable 
            style={styles.fullScreenPressable}
            onPress={() => setIsPopupVisible(false)}
          >
            <View style={styles.popup}>
              <Pressable 
                style={styles.popupButton} 
                onPress={() => {
                  setIsSoundsPopupVisible(true);
                  setIsPopupVisible(false);
                }}
              >
                <Text style={styles.popupButtonText}>SOUNDS</Text>
              </Pressable>
              <Pressable 
                style={styles.popupButton} 
                onPress={() => handleOptionPress(onUChordPress)}
              >
                <Text style={styles.popupButtonText}>U CHORD</Text>
              </Pressable>
              <Pressable 
                style={styles.popupButton} 
                onPress={() => handleOptionPress(onSavePress)}
              >
                <Text style={styles.popupButtonText}>SAVE</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      )}

      <SoundsPopup
        visible={isSoundsPopupVisible}
        onClose={() => setIsSoundsPopupVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  utilButton: {
    width: 43.2,
    height: 43.2,
    borderRadius: 21.6,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  editPopupOverlay: {
    position: 'absolute',
    left: -500,
    top: -500,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  fullScreenPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 150,
    transform: [
      { translateX: 20 },   // Move right by 20 (70 - 50)
      { translateY: 20 },   // Keep vertical position the same
    ],
  },
  popupButton: {
    backgroundColor: colors.buttonGrey,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  popupButtonText: {
    color: colors.textOffWhite,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 