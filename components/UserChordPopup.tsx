import React from 'react';
import { Modal, View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { colors } from '@/constants/colors';
import { UserChordEditor } from './UserChordEditor';
import { useChordStore } from '@/stores/chord-store';
import { QRCodeGenerator } from './QRCodeGenerator';
import { ChordType } from '@/types/music';

interface UserChordPopupProps {
  visible: boolean;
  onClose: () => void;
}

const UserChordPopup: React.FC<UserChordPopupProps> = ({
  visible,
  onClose,
}) => {
  const { setCurrentChord, savedChords, setSavedChords, setUserChordType } = useChordStore();
  const [showQR, setShowQR] = React.useState(false);

  // Find next empty slot in saved chords
  const findNextEmptySlot = () => {
    return savedChords.findIndex(chord => chord === null);
  };

  // Handle saving chord type to U button
  const handleSaveToU = (chordType: ChordType) => {
    // Convert chord type to index (assuming this is how it's used in the store)
    const chordTypeIndex = 0; // This should be the correct index for the user chord type
    setUserChordType(chordTypeIndex);
  };

  // Handle saving to next empty slot
  const handleSaveToSlot = (chord: any) => {
    const nextEmptySlot = findNextEmptySlot();
    if (nextEmptySlot !== -1) {
      const newSavedChords = [...savedChords];
      newSavedChords[nextEmptySlot] = chord;
      setSavedChords(newSavedChords);
    }
  };

  // Handle QR code generation
  const handleQRGenerate = (qrData: string) => {
    console.log('QR Code data:', qrData);
    // You can use this data to sync between devices
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
          <View style={styles.header}>
            <Text style={styles.headerTitle}>USER CHORD</Text>
            <Pressable 
              style={styles.qrButton} 
              onPress={() => setShowQR(!showQR)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.qrButtonText}>QR</Text>
            </Pressable>
            <Pressable 
              style={styles.closeButton} 
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          
          <View style={styles.content}>
            {showQR ? (
              <View style={styles.qrContainer}>
                <Text style={styles.qrText}>Scan to open on mobile:</Text>
                <QRCodeGenerator size={200} onGenerate={handleQRGenerate} />
              </View>
            ) : (
              <UserChordEditor
                onSaveToU={handleSaveToU}
                onSaveToSlot={handleSaveToSlot}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    backgroundColor: colors.background,
    borderRadius: 16,
    width: Platform.OS === 'web' ? '80%' : '90%',
    maxWidth: 1000,
    maxHeight: Platform.OS === 'web' ? '80%' : '90%',
    padding: 20,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrButton: {
    position: 'absolute',
    right: 40,
    top: 0,
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
  qrButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrText: {
    color: colors.text,
    fontSize: 16,
    marginBottom: 20,
  },
});

export default UserChordPopup; 