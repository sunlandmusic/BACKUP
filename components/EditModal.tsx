import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

interface EditModalProps {
  visible: boolean;
  onClose: () => void;
  onClear: () => void;
  onCopyPaste: () => void;
}

const EditModal: React.FC<EditModalProps> = ({
  visible,
  onClose,
  onClear,
  onCopyPaste
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Progression</Text>
          <View style={styles.modalButtons}>
            <Pressable 
              style={styles.modalButton}
              onPress={onClear}
            >
              <Text style={styles.modalButtonText}>Clear</Text>
            </Pressable>
            <Pressable 
              style={styles.modalButton}
              onPress={onCopyPaste}
            >
              <Text style={styles.modalButtonText}>Copy/Paste</Text>
            </Pressable>
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
  modalContent: {
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    backgroundColor: colors.buttonGrey,
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditModal; 