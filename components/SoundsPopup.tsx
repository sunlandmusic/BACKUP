import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Platform, Pressable, ScrollView } from 'react-native';
import { colors } from '@/constants/colors';
import { InstrumentSelector } from '@/components/InstrumentSelector';
import { SavedChordGrid } from '@/components/SavedChordGrid';
import { useChordStore } from '@/stores/chord-store';
import { Chord, InstrumentType } from '@/types/music';
import { playChord, stopChord } from '@/utils/audio-utils';
import { ArrowLeftRight } from 'lucide-react-native';

interface SoundsPopupProps {
  visible: boolean;
  onClose: () => void;
}

const SoundsPopup: React.FC<SoundsPopupProps> = ({
  visible,
  onClose,
}) => {
  const { 
    savedChords, 
    currentInstrument, 
    setCurrentInstrument,
    setCurrentChord,
  } = useChordStore();
  
  // Filter out null chords
  const filteredChords = savedChords.filter((chord): chord is NonNullable<typeof chord> => chord !== null);
  
  const [isSecondPage, setIsSecondPage] = useState(false);
  const [activeChordIndex, setActiveChordIndex] = useState<number | null>(null);
  
  // Reset page when modal opens
  useEffect(() => {
    if (visible) {
      setIsSecondPage(false);
      setActiveChordIndex(null);
    }
  }, [visible]);
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      stopChord();
    };
  }, []);
  
  // Handle instrument change
  const handleInstrumentChange = (instrument: InstrumentType) => {
    setCurrentInstrument(instrument);
  };
  
  // Handle saved chord press
  const handleSavedChordPress = (chord: Chord, index: number) => {
    setActiveChordIndex(index);
    setCurrentChord(chord);
    playChord(chord.notes);
  };
  
  // Handle saved chord release
  const handleSavedChordRelease = () => {
    stopChord();
    setActiveChordIndex(null);
  };

  // Toggle between pages
  const togglePage = () => {
    setIsSecondPage(!isSecondPage);
  };

  if (!visible) return null;

  // Get current page of chords
  const currentPageChords = isSecondPage 
    ? filteredChords.slice(16, 32)
    : filteredChords.slice(0, 16);

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
            <Text style={styles.headerTitle}>SOUNDS</Text>
            <Pressable 
              style={styles.closeButton} 
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            <View style={styles.mainLayout}>
              {/* Left side - Instrument selector */}
              <View style={styles.leftPanel}>
                <InstrumentSelector
                  currentInstrument={currentInstrument}
                  onInstrumentChange={handleInstrumentChange}
                />
              </View>
              
              {/* Right side - Saved chord grid */}
              <View style={styles.rightPanel}>
                <SavedChordGrid
                  chords={currentPageChords}
                  onChordPress={handleSavedChordPress}
                  onChordRelease={handleSavedChordRelease}
                  currentPage={0}
                  totalPages={1}
                  onPageChange={() => {}}
                  columns={4}
                  rows={4}
                  activeChordIndex={activeChordIndex}
                  saveMode={false}
                />
                
                {/* Page toggle button */}
                {filteredChords.length > 16 && (
                  <View style={styles.paginationContainer}>
                    <Pressable 
                      onPress={togglePage}
                      style={[
                        styles.toggleButton,
                        isSecondPage && styles.toggleButtonActive
                      ]}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <ArrowLeftRight 
                        size={24} 
                        color={colors.textOffWhite}
                        style={styles.toggleIcon}
                      />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
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
  closeButtonText: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  mainLayout: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
  },
  leftPanel: {
    flex: Platform.OS === 'web' ? 0.4 : undefined,
    marginBottom: Platform.OS === 'web' ? 0 : 16,
  },
  rightPanel: {
    flex: Platform.OS === 'web' ? 0.6 : undefined,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    paddingBottom: Platform.OS === 'web' ? 0 : 20,
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleIcon: {
    opacity: 0.9,
  },
});

export default SoundsPopup; 