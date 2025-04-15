import React from 'react';
import { StyleSheet, View, Modal, Text, Pressable } from 'react-native';
import { Chord } from '@/types/music';

const styles = StyleSheet.create({
  nextArrow: {
    marginRight: -17
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#007bff',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 

interface EditModalProps {
  editModalVisible: boolean;
  setEditModalVisible: (visible: boolean) => void;
  setDeleteMode: (mode: boolean) => void;
  selectedChordIndex: number | null;
  savedChords: (Chord | null)[];
  setSavedChords: (chords: (Chord | null)[]) => void;
}

const EditModal: React.FC<EditModalProps> = ({ 
  editModalVisible, 
  setEditModalVisible, 
  setDeleteMode, 
  selectedChordIndex, 
  savedChords, 
  setSavedChords 
}) => (
  <Modal
    visible={editModalVisible}
    transparent={true}
    animationType="fade"
    onRequestClose={() => {
      setEditModalVisible(false);
      setDeleteMode(false);
    }}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Edit Chord</Text>
        <View style={styles.modalButtons}>
          <Pressable 
            style={styles.modalButton}
            onPress={() => {
              if (selectedChordIndex !== null) {
                // Clear the chord
                const newChords = [...savedChords];
                newChords[selectedChordIndex] = null;
                setSavedChords(newChords);
                setEditModalVisible(false);
                setDeleteMode(false);
              }
            }}
          >
            <Text style={styles.modalButtonText}>Clear</Text>
          </Pressable>
          <Pressable 
            style={styles.modalButton}
            onPress={() => {
              if (selectedChordIndex !== null) {
                // Copy the chord
                const chord = savedChords[selectedChordIndex];
                if (chord) {
                  // Find the first empty slot
                  const emptyIndex = savedChords.findIndex((c: Chord | null) => c === null);
                  if (emptyIndex !== -1) {
                    const newChords = [...savedChords];
                    newChords[emptyIndex] = { ...chord };
                    setSavedChords(newChords);
                  }
                }
                setEditModalVisible(false);
                setDeleteMode(false);
              }
            }}
          >
            <Text style={styles.modalButtonText}>Copy</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
); 