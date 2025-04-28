import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Platform, Pressable, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors } from '@/constants/colors';
import { InstrumentSelector } from '@/components/InstrumentSelector';
import { SavedChordGrid } from '@/components/SavedChordGrid';
import { useChordStore } from '@/stores/chord-store';
import { Chord, InstrumentType, FlamValue } from '@/types/music';
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
    currentFlamValue,
    setCurrentFlamValue,
  } = useChordStore();
  
  const [isSecondPage, setIsSecondPage] = useState(false);
  const [activeChordIndex, setActiveChordIndex] = useState<number | null>(null);
  const isMounted = useRef(true);
  const activeTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Filter out null chords
  const filteredChords = React.useMemo(() => 
    savedChords.filter((chord): chord is NonNullable<typeof chord> => chord !== null),
    [savedChords]
  );
  
  console.log('Filtered chords length:', filteredChords.length);
  
  // Reset page and cleanup when modal opens/closes
  useEffect(() => {
    if (visible) {
      setIsSecondPage(false);
      setActiveChordIndex(null);
    }
    
    return () => {
      isMounted.current = false;
      if (activeTimeoutRef.current) {
        clearTimeout(activeTimeoutRef.current);
      }
      stopChord().catch(console.error);
    };
  }, [visible]);
  
  // Handle instrument change
  const handleInstrumentChange = useCallback(async (instrument: InstrumentType) => {
    try {
      if (!isMounted.current) return;
      await setCurrentInstrument(instrument);
    } catch (e) {
      console.error('Error changing instrument:', e);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to change instrument. Please try again.');
      }
    }
  }, [setCurrentInstrument]);
  
  // Handle flam change
  const handleFlamChange = useCallback(async (value: string) => {
    try {
      if (!isMounted.current) return;
      await setCurrentFlamValue(value as FlamValue);
    } catch (e) {
      console.error('Error changing flam value:', e);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to change flam value. Please try again.');
      }
    }
  }, [setCurrentFlamValue]);
  
  // Handle saved chord press
  const handleSavedChordPress = useCallback(async (chord: Chord, index: number) => {
    try {
      if (!isMounted.current) return;
      setActiveChordIndex(index);
      setCurrentChord(chord);
      
      // Clear any existing timeout
      if (activeTimeoutRef.current) {
        clearTimeout(activeTimeoutRef.current);
      }
      
      // Set new timeout
      activeTimeoutRef.current = setTimeout(async () => {
        if (isMounted.current) {
          await playChord(chord.notes);
        }
      }, 50);
    } catch (e) {
      console.error('Error playing chord:', e);
      if (isMounted.current) {
        setActiveChordIndex(null);
        Alert.alert('Error', 'Failed to play chord. Please try again.');
      }
    }
  }, [setCurrentChord]);
  
  // Handle saved chord release
  const handleSavedChordRelease = useCallback(async () => {
    try {
      if (!isMounted.current) return;
      await stopChord();
      setActiveChordIndex(null);
    } catch (e) {
      console.error('Error stopping chord:', e);
    }
  }, []);

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
              hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          
          <View style={styles.content}>
            <View style={styles.gridContainer}>
              <View style={styles.mainLayout}>
                {/* Left side - Instrument selector */}
                <View style={styles.leftPanel}>
                  <InstrumentSelector
                    currentInstrument={currentInstrument}
                    onInstrumentChange={handleInstrumentChange}
                    flamValue={currentFlamValue}
                    onFlamChange={handleFlamChange}
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
                </View>
              </View>
            </View>

            {/* Toggle button with absolute positioning */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity 
                style={[styles.toggleButton, isSecondPage && styles.toggleButtonActive]}
                onPress={() => setIsSecondPage(!isSecondPage)}
              >
                <ArrowLeftRight size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
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
    backgroundColor: 'black',
    borderRadius: 16,
    width: Platform.OS === 'web' ? '80%' : '90%',
    maxWidth: 1000,
    padding: 20,
    position: 'relative',
    top: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 0,
    position: 'relative',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20.7,
    fontWeight: '600',
    marginLeft: -20,
  },
  closeButton: {
    position: 'absolute',
    left: 0,
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
    height: 500,
    position: 'relative',
  },
  gridContainer: {
    height: 400,
    position: 'relative',
  },
  mainLayout: {
    flexDirection: 'row',
    height: '100%',
  },
  leftPanel: {
    flex: 1,
    marginRight: 20,
  },
  rightPanel: {
    flex: 2,
  },
  toggleContainer: {
    position: 'absolute',
    width: '100%',
    top: 250,
    alignItems: 'center',
    paddingLeft: 421,
  },
  toggleButton: {
    backgroundColor: colors.buttonGrey,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.text,
  },
  toggleText: {
    display: 'none',
  },
});

export default SoundsPopup; 