import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Platform, Pressable, Alert } from 'react-native';
import { colors } from '@/constants/colors';
import { UserChordEditor } from './UserChordEditor';
import { useChordStore } from '@/stores/chord-store';
import { ChordType, Chord } from '@/types/music';

interface UserChordPopupProps {
  visible: boolean;
  onClose: () => void;
}

const UserChordPopup: React.FC<UserChordPopupProps> = ({
  visible,
  onClose,
}) => {
  const { setCurrentChord, savedChords, saveChord, setUserChordType } = useChordStore();
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Find next empty slot in saved chords
  const findNextEmptySlot = () => {
    for (let i = 0; i < 32; i++) {  // MAX_SAVED_CHORDS is 32
      if (!savedChords[i]) {
        return i;
      }
    }
    return -1;
  };

  // Handle saving chord type to U button
  const handleSaveToU = async (chordType: ChordType) => {
    try {
      if (!isMounted.current) return;
      await setUserChordType(chordType);
      onClose();
    } catch (e) {
      console.error('Error saving chord type:', e);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to save chord type. Please try again.');
      }
    }
  };

  // Handle saving to next empty slot
  const handleSaveToSlot = async (chord: Chord) => {
    try {
      if (!isMounted.current) return;
      const nextEmptySlot = findNextEmptySlot();
      if (nextEmptySlot !== -1) {
        await saveChord(chord, nextEmptySlot);
        await setCurrentChord(chord); // Update current chord
      } else {
        Alert.alert('Error', 'No empty slots available. Please delete some saved chords first.');
      }
    } catch (e) {
      console.error('Error saving chord to slot:', e);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to save chord. Please try again.');
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.outsideModal} onPress={onClose} />
        <View style={styles.modalContent}>
          <Text style={styles.headerTitle}>USER CHORD</Text>
          <Pressable 
            style={styles.closeButton} 
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </Pressable>
          
          <View style={styles.content}>
            <UserChordEditor
              onSaveToU={handleSaveToU}
              onSaveToSlot={handleSaveToSlot}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outsideModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: 'transparent',
    width: Platform.OS === 'web' ? '80%' : '90%',
    maxWidth: 1000,
    maxHeight: Platform.OS === 'web' ? '80%' : '90%',
    padding: 20,
    position: 'relative',
    top: -100,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    top: 13,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 24,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  saveButton: {
    backgroundColor: colors.chord.m11, // Dark purple from our color palette
    borderRadius: 12,
    padding: 24,
    height: 90,
    width: '38%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusMinusContainer: {
    position: 'absolute',
    right: -91,
    top: 50,
    bottom: -50,
    width: 91,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.buttonGrey,
    borderRadius: 8,
  },
  plusButton: {
    width: 91,
    height: 218,
    borderRadius: 4,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  minusButton: {
    width: 91,
    height: 218,
    borderRadius: 4,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  plusMinusText: {
    color: colors.textOffWhite,
    fontSize: 44,
    fontWeight: 'bold',
  },
});

export default UserChordPopup; 