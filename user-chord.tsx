import React, { useEffect, useState } from "react";
import { StyleSheet, View, SafeAreaView, Pressable, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/colors";
import { useChordStore } from "@/stores/chord-store";
import { Chord, ChordType } from "@/types/music";
import { UserChordEditor } from "@/components/UserChordEditor";
import { Eye } from "lucide-react-native";
import { router, usePathname } from "expo-router";
import { stopChord } from "@/utils/audio-utils";
import { NavigationMenu } from "@/components/NavigationMenu";

export default function UserChordScreen() {
  const { saveChord, setUserChordType } = useChordStore();
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Get current route for navigation menu
  const pathname = usePathname();
  
  // Cleanup effect to stop any playing sounds when component unmounts
  useEffect(() => {
    return () => {
      stopChord();
    };
  }, []);
  
  // Handle saving to U chord type
  const handleSaveToU = (chordType: ChordType) => {
    setUserChordType(chordType);
    router.push('/(tabs)');
  };

  // Handle saving to slot
  const handleSaveToSlot = (chord: Chord) => {
    saveChord(chord, 31); // Save to the last slot (index 31)
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
        <UserChordEditor 
          onSaveToU={handleSaveToU}
          onSaveToSlot={handleSaveToSlot}
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
    zIndex: 10,
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