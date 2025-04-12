import React, { useState } from "react";
import { StyleSheet, View, SafeAreaView, Alert, Platform, Pressable, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/colors";
import { UtilityPanel } from "@/components/UtilityPanel";
import { useChordStore } from "@/stores/chord-store";
import { Eye } from "lucide-react-native";
import { usePathname } from "expo-router";
import { NavigationMenu } from "@/components/NavigationMenu";

export default function UtilityScreen() {
  const {
    savedSongs,
    createNewSong,
    saveSong,
    loadSong,
  } = useChordStore();
  
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Get current route for navigation menu
  const pathname = usePathname();
  
  // Handle new song
  const handleNewSong = () => {
    createNewSong();
  };
  
  // Handle save song
  const handleSaveSong = () => {
    saveSong();
    Alert.alert("Success", "Song saved successfully");
  };
  
  // Handle load song
  const handleLoadSong = (id: string) => {
    loadSong(id);
    Alert.alert("Success", "Song loaded successfully");
  };
  
  // Handle export song
  const handleExportSong = (format: 'mp3' | 'wav' | 'midi' | 'stems') => {
    // In a real app, this would handle the export process
    if (Platform.OS === 'web') {
      Alert.alert("Export", `Export as ${format} is not available in web version`);
    } else {
      Alert.alert("Export", `Song would be exported as ${format}`);
    }
  };
  
  // Handle import MIDI
  const handleImportMidi = () => {
    // In a real app, this would handle the import process
    if (Platform.OS === 'web') {
      Alert.alert("Import", "MIDI import is not available in web version");
    } else {
      Alert.alert("Import", "MIDI import would be handled here");
    }
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
        <Text style={styles.headerTitle}>Utility</Text>
      </View>
      
      <View style={styles.content}>
        <UtilityPanel
          songs={savedSongs}
          onNewSong={handleNewSong}
          onSaveSong={handleSaveSong}
          onLoadSong={handleLoadSong}
          onExportSong={handleExportSong}
          onImportMidi={handleImportMidi}
        />
      </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
});