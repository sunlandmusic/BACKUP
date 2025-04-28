import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Platform, Pressable, Alert } from 'react-native';
import { useChordStore } from '../stores/chordStore';
import { Chord } from '../types/chord';

const ChordPopup: React.FC<ChordPopupProps> = ({
  visible,
  onClose,
}) => {
  const { setCurrentChord, savedChords, saveChord } = useChordStore();
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

  // Handle saving to next empty slot
  const handleSaveToSlot = async (chord: Chord) => {
    try {
      if (!isMounted.current) return;
      const nextEmptySlot = findNextEmptySlot();
      if (nextEmptySlot !== -1) {
        await saveChord(chord, nextEmptySlot);
        await setCurrentChord(chord); // Update current chord
        onClose();
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

  // ... rest of the existing code ...
}; 