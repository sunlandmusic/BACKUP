import React, { useState, useCallback } from 'react';
import { Modal, View, Text, StyleSheet, Platform, Pressable, TextInput, ScrollView, Alert, StyleProp, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { useChordStore } from '@/stores/chord-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, Minus } from 'lucide-react-native';
import { Chord, ChordProgression, NoteName, MusicMode, InstrumentType, FlamValue } from '@/types/music';

interface Session {
  id: string;
  name: string;
  timestamp: number;
  data: {
    currentChord: Chord | null;
    currentProgression: ChordProgression | null;
    currentKey: NoteName;
    currentMode: MusicMode;
    currentInstrument: InstrumentType;
    currentFlamValue: FlamValue;
    savedChords: (Chord | null)[];
    savedProgressions: ChordProgression[];
    userChordType: number;
    userChordBassOffset: number;
  }
}

interface SessionPopupProps {
  visible: boolean;
  onClose: () => void;
}

const SessionPopup: React.FC<SessionPopupProps> = ({
  visible,
  onClose,
}) => {
  const [mode, setMode] = useState<'initial' | 'save' | 'load'>('initial');
  const [sessionName, setSessionName] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);
  
  const chordStore = useChordStore();
  
  // Load sessions from storage when popup opens
  React.useEffect(() => {
    if (visible) {
      loadSessions();
    }
  }, [visible]);
  
  // Load saved sessions from AsyncStorage
  const loadSessions = async () => {
    try {
      const sessionsData = await AsyncStorage.getItem('sessions');
      if (sessionsData) {
        setSessions(JSON.parse(sessionsData));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };
  
  // Save current state as a new session
  const saveSession = async () => {
    if (!sessionName.trim()) return;
    
    const newSession: Session = {
      id: Date.now().toString(),
      name: sessionName.trim(),
      timestamp: Date.now(),
      data: {
        currentChord: chordStore.currentChord,
        currentProgression: chordStore.currentProgression,
        currentKey: chordStore.currentKey,
        currentMode: chordStore.currentMode,
        currentInstrument: chordStore.currentInstrument,
        currentFlamValue: chordStore.currentFlamValue,
        savedChords: chordStore.savedChords,
        savedProgressions: chordStore.savedProgressions,
        userChordType: chordStore.userChordType,
        userChordBassOffset: chordStore.userChordBassOffset,
      }
    };
    
    const updatedSessions = [...sessions, newSession];
    try {
      await AsyncStorage.setItem('sessions', JSON.stringify(updatedSessions));
      setSessions(updatedSessions);
      setMode('initial');
      setSessionName('');
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };
  
  // Load a selected session
  const loadSelectedSession = () => {
    const session = sessions[selectedSessionIndex];
    if (!session) return;
    
    // Load all state from the session
    chordStore.setCurrentChord(session.data.currentChord);
    chordStore.setCurrentProgression(session.data.currentProgression);
    chordStore.setCurrentKey(session.data.currentKey);
    chordStore.setCurrentMode(session.data.currentMode);
    chordStore.setCurrentInstrument(session.data.currentInstrument);
    chordStore.setCurrentFlamValue(session.data.currentFlamValue);
    chordStore.setSavedChords(session.data.savedChords);
    chordStore.setUserChordType(session.data.userChordType);
    chordStore.setUserChordBassOffset(session.data.userChordBassOffset);
    
    setMode('initial');
    onClose();
  };
  
  // Navigate through sessions
  const navigateSessions = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setSelectedSessionIndex(prev => 
        prev < sessions.length - 1 ? prev + 1 : prev
      );
    } else {
      setSelectedSessionIndex(prev => 
        prev > 0 ? prev - 1 : prev
      );
    }
  };

  const handleFreshSession = () => {
    Alert.alert(
      "Fresh Session",
      "This will clear all the settings and return everything to default state. Are you starting a new FRESH SESSION?",
      [
        {
          text: "NO",
          style: "cancel"
        },
        {
          text: "YES",
          onPress: () => {
            // Reset all store values to default
            chordStore.setCurrentChord(null);
            chordStore.setCurrentProgression(null);
            chordStore.setCurrentKey('C');
            chordStore.setCurrentMode('major');
            chordStore.setCurrentInstrument('piano');
            chordStore.setCurrentFlamValue('OFF' as FlamValue);
            chordStore.setSavedChords([]);
            chordStore.setUserChordType(null);
            chordStore.setUserChordBassOffset(0);
            onClose();
          }
        }
      ]
    );
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
            <Text style={styles.headerTitle}>SESSION</Text>
            <Pressable 
              style={styles.closeButton} 
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          
          <View style={styles.content}>
            {mode === 'initial' && (
              <View style={styles.buttonContainer}>
                <View style={styles.buttonRow}>
                  <Pressable 
                    style={styles.button}
                    onPress={() => setMode('save')}
                  >
                    <Text style={[styles.buttonText, { backgroundColor: '#8B0000' }]}>SAVE SESSION</Text>
                  </Pressable>
                  <Pressable 
                    style={styles.button}
                    onPress={() => setMode('load')}
                  >
                    <Text style={[styles.buttonText, { backgroundColor: '#006400' }]}>LOAD SESSION</Text>
                  </Pressable>
                </View>
                <Pressable 
                  style={styles.button}
                  onPress={handleFreshSession}
                >
                  <Text style={[styles.buttonText, { backgroundColor: '#000000' }]}>FRESH SESSION</Text>
                </Pressable>
              </View>
            )}
            
            {mode === 'save' && (
              <View style={styles.saveContainer}>
                <Text style={styles.label}>NAME?</Text>
                <TextInput
                  style={styles.input}
                  value={sessionName}
                  onChangeText={setSessionName}
                  placeholder="Enter session name..."
                  placeholderTextColor={colors.textOffWhite}
                />
                <Pressable 
                  style={styles.button}
                  onPress={saveSession}
                >
                  <Text style={styles.buttonText}>CONFIRM</Text>
                </Pressable>
              </View>
            )}
            
            {mode === 'load' && sessions.length > 0 && (
              <View style={styles.loadContainer}>
                <View style={styles.navigationContainer}>
                  <Pressable 
                    onPress={() => navigateSessions('prev')}
                    style={styles.navButton}
                  >
                    <Minus size={24} color={colors.textOffWhite} />
                  </Pressable>
                  
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionName}>
                      {sessions[selectedSessionIndex].name}
                    </Text>
                    <Text style={styles.sessionDate}>
                      {new Date(sessions[selectedSessionIndex].timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <Pressable 
                    onPress={() => navigateSessions('next')}
                    style={styles.navButton}
                  >
                    <Plus size={24} color={colors.textOffWhite} />
                  </Pressable>
                </View>
                
                <Pressable 
                  style={styles.button}
                  onPress={loadSelectedSession}
                >
                  <Text style={styles.buttonText}>CONFIRM</Text>
                </Pressable>
              </View>
            )}
            
            {mode === 'load' && sessions.length === 0 && (
              <Text style={styles.noSessions}>No saved sessions found</Text>
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
    paddingHorizontal: 16,
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
    width: '100%',
    maxWidth: 500,
    padding: Platform.OS === 'ios' ? 20 : 16,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 16,
    position: 'relative',
  },
  headerTitle: {
    color: colors.text,
    fontSize: Platform.OS === 'ios' ? 18 : 16,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: Platform.OS === 'ios' ? 32 : 28,
    height: Platform.OS === 'ios' ? 32 : 28,
    borderRadius: Platform.OS === 'ios' ? 16 : 14,
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
    minHeight: 200,
  },
  buttonContainer: {
    gap: Platform.OS === 'ios' ? 16 : 12,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Platform.OS === 'ios' ? 16 : 12,
    width: '100%',
  },
  button: {
    flex: 1,
    alignItems: 'center',
    marginVertical: Platform.OS === 'ios' ? 8 : 6,
  },
  buttonText: {
    color: colors.textOffWhite,
    fontSize: Platform.OS === 'ios' ? 18.4 : 16,
    fontWeight: '500',
    padding: Platform.OS === 'ios' ? 16 : 12,
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  saveContainer: {
    gap: 16,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.buttonGrey,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  loadContainer: {
    gap: 24,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  navButton: {
    backgroundColor: colors.buttonGrey,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sessionInfo: {
    flex: 1,
    alignItems: 'center',
  },
  sessionName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionDate: {
    color: colors.textOffWhite,
    fontSize: 14,
  },
  noSessions: {
    color: colors.textOffWhite,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SessionPopup; 