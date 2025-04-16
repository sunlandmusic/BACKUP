import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, TextInput } from 'react-native';
import { colors } from '@/constants/colors';
import { Song } from '@/types/music';
import { FilePlus, Save, Download, Upload, X, Check } from 'lucide-react-native';

interface UtilityPanelProps {
  songs: Song[];
  onNewSong: () => void;
  onSaveSong: () => void;
  onLoadSong: (id: string) => void;
  onExportSong: (format: 'mp3' | 'wav' | 'midi' | 'stems') => void;
  onImportMidi: () => void;
}

export const UtilityPanel: React.FC<UtilityPanelProps> = ({
  songs,
  onNewSong,
  onSaveSong,
  onLoadSong,
  onExportSong,
  onImportMidi
}) => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [showNewSongModal, setShowNewSongModal] = useState(false);
  const [newSongName, setNewSongName] = useState('');
  
  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };
  
  // Handle new song
  const handleNewSong = () => {
    setShowNewSongModal(true);
  };
  
  // Handle create new song
  const handleCreateNewSong = () => {
    onNewSong();
    setShowNewSongModal(false);
    setNewSongName('');
  };
  
  // Handle export
  const handleExport = () => {
    setShowExportModal(true);
  };
  
  // Handle export format selection
  const handleExportFormat = (format: 'mp3' | 'wav' | 'midi' | 'stems') => {
    onExportSong(format);
    setShowExportModal(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Utility</Text>
      
      <View style={styles.content}>
        <View style={styles.buttonsContainer}>
          <Pressable style={styles.button} onPress={handleNewSong}>
            <FilePlus size={24} color={colors.text} />
            <Text style={styles.buttonText}>NEW</Text>
          </Pressable>
          
          <Pressable style={styles.button} onPress={onSaveSong}>
            <Save size={24} color={colors.text} />
            <Text style={styles.buttonText}>SAVE</Text>
          </Pressable>
          
          <Pressable style={styles.button} onPress={handleExport}>
            <Download size={24} color={colors.text} />
            <Text style={styles.buttonText}>EXPORT</Text>
          </Pressable>
          
          <Pressable style={styles.button} onPress={onImportMidi}>
            <Upload size={24} color={colors.text} />
            <Text style={styles.buttonText}>IMPORT</Text>
          </Pressable>
        </View>
        
        <View style={styles.songsContainer}>
          <Text style={styles.songsTitle}>SONGS</Text>
          
          <ScrollView style={styles.songsList}>
            {songs.length > 0 ? (
              songs.map((song) => (
                <Pressable
                  key={song.id}
                  style={styles.songItem}
                  onPress={() => onLoadSong(song.id)}
                >
                  <Text style={styles.songName}>{song.name}</Text>
                  <Text style={styles.songDate}>{formatDate(song.updatedAt)}</Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptySongsText}>No saved songs</Text>
            )}
          </ScrollView>
        </View>
      </View>
      
      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Export Format</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setShowExportModal(false)}
              >
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <Pressable
              style={styles.exportFormatButton}
              onPress={() => handleExportFormat('mp3')}
            >
              <Text style={styles.exportFormatText}>MP3</Text>
            </Pressable>
            
            <Pressable
              style={styles.exportFormatButton}
              onPress={() => handleExportFormat('wav')}
            >
              <Text style={styles.exportFormatText}>WAV</Text>
            </Pressable>
            
            <Pressable
              style={styles.exportFormatButton}
              onPress={() => handleExportFormat('midi')}
            >
              <Text style={styles.exportFormatText}>MIDI</Text>
            </Pressable>
            
            <Pressable
              style={styles.exportFormatButton}
              onPress={() => handleExportFormat('stems')}
            >
              <Text style={styles.exportFormatText}>Stems</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      
      {/* New Song Modal */}
      <Modal
        visible={showNewSongModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Song</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setShowNewSongModal(false)}
              >
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <Text style={styles.inputLabel}>Enter a name for your new song:</Text>
            <TextInput
              style={styles.input}
              value={newSongName}
              onChangeText={setNewSongName}
              placeholder="My New Song"
              placeholderTextColor={colors.textMuted}
            />
            
            <Pressable
              style={styles.createButton}
              onPress={handleCreateNewSong}
            >
              <Check size={20} color={colors.text} />
              <Text style={styles.createButtonText}>Create</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  buttonsContainer: {
    width: '40%',
    paddingRight: 16,
  },
  button: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  songsContainer: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 16,
  },
  songsTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  songsList: {
    flex: 1,
  },
  songItem: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  songName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  songDate: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  emptySongsText: {
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  exportFormatButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  exportFormatText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    fontSize: 16,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});