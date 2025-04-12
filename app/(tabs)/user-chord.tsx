import React, { useEffect, useState } from "react";
import { StyleSheet, View, SafeAreaView, Pressable, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/colors";
import { useChordStore } from "@/stores/chord-store";
import { Chord } from "@/types/music";
import { UserChordEditor } from "@/components/UserChordEditor";
import { Eye } from "lucide-react-native";
import { router, usePathname } from "expo-router";
import { stopChord } from "@/utils/audio-utils";
import { NavigationMenu } from "@/components/NavigationMenu";

export default function UserChordScreen() {
  const { saveChord } = useChordStore();
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Get current route for navigation menu
  const pathname = usePathname();
  
  // Cleanup effect to stop any playing sounds when component unmounts
  useEffect(() => {
    return () => {
      stopChord();
    };
  }, []);
  
  // Handle saving user chord
  const handleSaveUserChord = (chord: Chord) => {
    // Find the first empty slot or overwrite the last chord
    saveChord(chord, 31); // Save to the last slot (index 31)
    
    // Show success message or navigate to main screen
    router.push('/(tabs)');
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
        <Text style={styles.headerTitle}>User Chord</Text>
      </View>
      
      <View style={styles.content}>
        <UserChordEditor onSaveUserChord={handleSaveUserChord} />
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