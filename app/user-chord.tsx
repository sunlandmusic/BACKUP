import React, { useEffect, useState } from "react";
import { StyleSheet, View, SafeAreaView, Pressable, Text, TouchableOpacity, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/colors";
import { useChordStore } from "@/stores/chord-store";
import { Chord } from "@/types/music";
import { UserChordEditor } from "@/components/UserChordEditor";
import { Eye } from "lucide-react-native";
import { router, usePathname } from "expo-router";
import { stopChord } from "@/utils/audio-utils";
import { NavigationMenu } from "@/components/NavigationMenu";
import { ChordType } from '@/types/chord-types';

export default function UserChordScreen() {
  const { saveChord, setUserChordType, setUserChordIntervals } = useChordStore();
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

  // Handle saving to U chord type
  const handleSaveToU = (chordType: ChordType) => {
    const intervals = {
      major: [0, 4, 7],
      minor: [0, 3, 7],
      dim: [0, 3, 6],
      augmented: [0, 4, 8],
      '7': [0, 4, 7, 10],
      '9': [0, 4, 7, 10, 14],
      major7: [0, 4, 7, 11],
      minor7: [0, 3, 7, 10],
      major9: [0, 4, 7, 11, 14],
      minor9: [0, 3, 7, 10, 14],
      sus2: [0, 2, 7],
      sus4: [0, 5, 7],
      add9: [0, 4, 7, 14],
      'm7b5': [0, 3, 6, 10],
      'm11': [0, 3, 7, 10, 14, 17],
      dim7: [0, 3, 6, 9],
      'major11': [0, 4, 7, 11, 14, 17],
      'major13': [0, 4, 7, 11, 14, 17, 21],
      '6': [0, 4, 7, 9],
      '69': [0, 4, 7, 9, 14],
      'minor6': [0, 3, 7, 9],
      'minor13': [0, 3, 7, 10, 14, 17, 21],
      'minorMajor7': [0, 3, 7, 11],
      '7sus4': [0, 5, 7, 10],
      'augmented7': [0, 4, 8, 10],
      'augmentedMajor7': [0, 4, 8, 11],
      '11': [0, 4, 7, 10, 14, 17],
      'bass': [0],
      'user': [0, 4, 7],
      '7b5': [0, 4, 6, 10],
      '7#5': [0, 4, 8, 10],
      '9sus': [0, 5, 7, 10, 14],
      '13sus': [0, 5, 7, 10, 14, 21],
      '7sus': [0, 5, 7, 10]
    } as Record<ChordType, number[]>;

    const chordIntervals = intervals[chordType] || intervals.major;
    
    // Set both type and intervals
    setUserChordType(chordType);
    setUserChordIntervals(chordIntervals);
    
    router.push('/(tabs)');
  };

  const chordTypes: ChordType[] = [
    'major', 'minor', 'dim', 'augmented',
    '7', '9', 'major7', 'minor7',
    'major9', 'minor9', 'sus2', 'sus4',
    'add9', 'm7b5', 'm11', 'dim7',
    'major11', 'major13', '6', '69',
    'minor6', 'minor13', 'minorMajor7',
    '7sus4', 'augmented7', 'augmentedMajor7',
    '11', '7b5', '7#5', '9sus',
    '13sus', '7sus'
  ];

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
        <Text style={{ 
          fontSize: 24, 
          fontWeight: 'bold', 
          color: colors.text,
          padding: 16,
          textAlign: 'center'
        }}>
          Select Chord Type for U
        </Text>
        <ScrollView style={{ flex: 1 }}>
          <View style={{ 
            flexDirection: 'row', 
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: 8
          }}>
            {chordTypes.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => handleSaveToU(type)}
                style={{
                  backgroundColor: colors.primary,
                  padding: 12,
                  margin: 4,
                  borderRadius: 8,
                  minWidth: 80,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: colors.background, fontWeight: '500' }}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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