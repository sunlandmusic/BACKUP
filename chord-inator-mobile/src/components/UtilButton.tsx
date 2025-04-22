import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ViewStyle } from 'react-native';
import { Sliders } from 'lucide-react-native';

interface UtilButtonProps {
  onSoundsPress: () => void;
  onUChordPress: () => void;
  onScanPress: () => void;
  onSessionPress: () => void;
}

export const UtilButton: React.FC<UtilButtonProps> = ({
  onSoundsPress,
  onUChordPress,
  onScanPress,
  onSessionPress,
}) => {
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  const handlePress = () => {
    setIsPopupVisible(!isPopupVisible);
  };

  const handleOptionPress = (handler: () => void) => {
    handler();
    setIsPopupVisible(false);
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.utilButton as ViewStyle}
        onPress={handlePress}
      >
        <Sliders size={20} color="#007AFF" />
      </Pressable>
      
      {isPopupVisible && (
        <Pressable 
          style={styles.editPopupOverlay}
          onPress={() => setIsPopupVisible(false)}
        >
          <View style={styles.popup}>
            <Pressable 
              style={styles.popupButton} 
              onPress={() => handleOptionPress(onSoundsPress)}
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
              onPress={() => handleOptionPress(onSessionPress)}
            >
              <Text style={styles.popupButtonText}>SESSION</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginLeft: -20,
  },
  utilButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  editPopupOverlay: {
    position: 'absolute',
    left: -20,
    top: 50,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  popup: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  popupButton: {
    backgroundColor: '#F2F2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
  },
  popupButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 