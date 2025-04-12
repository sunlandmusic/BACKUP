import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Pressable, Modal } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/colors";
import { useChordStore } from "@/stores/chord-store";
import { SongCard } from "@/components/SongCard";
import { ProgressionCard } from "@/components/ProgressionCard";
import { SongStructureEditor } from "@/components/SongStructureEditor";
import { Plus, X, Eye } from "lucide-react-native";
import { usePathname } from "expo-router";
import { NavigationMenu } from "@/components/NavigationMenu";

export default function SongsScreen() {
  const {
    savedSongs,
    savedProgressions,
    currentSong,
    createNewSong,
    setCurrentSong,
    addProgressionToSong,
    updateSectionInSong,
    removeSectionFromSong,
    saveSong,
    deleteSong,
    loadSong,
  } = useChordStore();

  const [isCreating, setIsCreating] = useState(false);
  const [showProgressionSelector, setShowProgressionSelector] = useState(false);
  const [selectedProgressionId, setSelectedProgressionId] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState("Section");
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Get current route for navigation menu
  const pathname = usePathname();

  // Handle creating a new song
  const handleCreateSong = () => {
    createNewSong();
    setIsCreating(true);
  };

  // Handle selecting a progression to add
  const handleSelectProgression = (progressionId: string) => {
    setSelectedProgressionId(progressionId);
    setShowProgressionSelector(false);
    
    // Add the progression to the song
    addProgressionToSong(progressionId, sectionName);
  };

  // Handle adding a new section
  const handleAddSection = () => {
    setShowProgressionSelector(true);
  };

  // Handle saving the song
  const handleSaveSong = () => {
    saveSong();
    setIsCreating(false);
  };

  // Handle editing a song
  const handleEditSong = (songId: string) => {
    loadSong(songId);
    setIsCreating(true);
  };
  
  // Handle song name change
  const handleSongNameChange = (name: string) => {
    if (!currentSong) return;
    
    setCurrentSong({
      ...currentSong,
      name
    });
  };

  // Toggle navigation menu
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Eye button at top left corner */}
      <Pressable style={styles.eyeButton} onPress={toggleMenu}>
        <Eye size={28} color={colors.text} />
      </Pressable>
      
      {/* Navigation Menu */}
      <NavigationMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
        currentRoute={pathname}
      />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Songs</Text>
      </View>
      
      {isCreating && currentSong ? (
        // Song editor view
        <View style={styles.editorContainer}>
          <SongStructureEditor
            song={currentSong}
            onUpdateSection={updateSectionInSong}
            onRemoveSection={removeSectionFromSong}
            onAddSection={handleAddSection}
            onSave={handleSaveSong}
            onNameChange={handleSongNameChange}
          />
        </View>
      ) : (
        // Songs list view
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Create new song button */}
          <Pressable
            style={styles.createButton}
            onPress={handleCreateSong}
          >
            <Plus size={24} color={colors.text} />
            <Text style={styles.createButtonText}>Create New Song</Text>
          </Pressable>
          
          {/* Saved songs */}
          <View style={styles.songsContainer}>
            <Text style={styles.sectionTitle}>Your Songs</Text>
            
            {savedSongs.length > 0 ? (
              savedSongs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  onEdit={() => handleEditSong(song.id)}
                  onDelete={deleteSong}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>
                You haven't created any songs yet. Tap the button above to get started!
              </Text>
            )}
          </View>
        </ScrollView>
      )}
      
      {/* Progression selector modal */}
      <Modal
        visible={showProgressionSelector}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Progression</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setShowProgressionSelector(false)}
              >
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.progressionsList}>
              {savedProgressions.length > 0 ? (
                savedProgressions.map((progression) => (
                  <ProgressionCard
                    key={progression.id}
                    progression={progression}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onSelect={handleSelectProgression}
                    isSelected={selectedProgressionId === progression.id}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>
                  You need to create progressions first
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  eyeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Ensure it's above other elements
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
    marginTop: 10,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  createButtonText: {
    color: colors.text,
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  songsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 16,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
    fontStyle: "italic",
    padding: 24,
  },
  editorContainer: {
    flex: 1,
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "bold",
  },
  modalCloseButton: {
    padding: 8,
  },
  progressionsList: {
    maxHeight: 500,
  },
});