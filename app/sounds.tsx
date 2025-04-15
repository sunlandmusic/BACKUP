import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, SafeAreaView, Pressable, Text, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/colors";
import { InstrumentSelector } from "@/components/InstrumentSelector";
import { SavedChordGrid } from "@/components/SavedChordGrid";
import { useChordStore } from "@/stores/chord-store";
import { Chord, InstrumentType } from "@/types/music";
import { playChord, stopChord } from "@/utils/audio-utils";
import { usePathname } from "expo-router";
import { NavigationMenu } from "@/components/NavigationMenu";
import { ChevronLeft, ChevronRight, Eye, Play } from "lucide-react-native";

export default function SoundsScreen() {
  const { 
    savedChords, 
    currentInstrument, 
    setCurrentInstrument,
    setCurrentChord,
    currentChord
  } = useChordStore();
  
  // Filter out null chords once when savedChords changes
  const filteredChords = savedChords.filter((chord): chord is NonNullable<typeof chord> => chord !== null);
  
  const [savedChordPage, setSavedChordPage] = useState(0);
  const [activeChordIndex, setActiveChordIndex] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Ref to track if any chord button is pressed
  const isChordButtonPressedRef = useRef(false);
  
  // Get current route for navigation menu
  const pathname = usePathname();
  
  // Cleanup effect to stop any playing sounds when component unmounts
  useEffect(() => {
    return () => {
      stopChord();
    };
  }, []);
  
  // Handle instrument change
  const handleInstrumentChange = (instrument: InstrumentType) => {
    setCurrentInstrument(instrument);
  };
  
  // Toggle menu visibility
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
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
  
  // Handle page navigation
  const handlePageChange = (direction: 'prev' | 'next') => {
    setSavedChordPage(prev => {
      const newPage = direction === 'next' ? prev + 1 : prev - 1;
      return Math.max(0, Math.min(newPage, Math.ceil(filteredChords.length / 16) - 1));
    });
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Eye button at top left corner - positioned like on the Chord page */}
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
        <Text style={styles.headerTitle}>SOUNDS</Text>
      </View>
      
      <View style={styles.content}>
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
              chords={filteredChords}
              onChordPress={handleSavedChordPress}
              onChordRelease={handleSavedChordRelease}
              currentPage={savedChordPage}
              totalPages={Math.ceil(filteredChords.length / 16) || 1}
              onPageChange={setSavedChordPage}
              columns={4}
              rows={4}
              activeChordIndex={activeChordIndex}
              saveMode={false}
            />
            
            {/* Pagination arrows */}
            <View style={styles.paginationContainer}>
              <Pressable 
                onPress={() => setSavedChordPage(prev => Math.max(0, prev - 1))}
                disabled={savedChordPage === 0}
                style={styles.paginationArrow}
              >
                <View style={[styles.arrowCircle, savedChordPage === 0 && styles.arrowCircleDisabled]}>
                  <Play 
                    size={16} 
                    color={savedChordPage === 0 ? colors.textMuted : colors.textOffWhite}
                    style={{ transform: [{ rotate: '180deg' }] }}
                    fill={savedChordPage === 0 ? colors.textMuted : colors.textOffWhite}
                  />
                </View>
              </Pressable>
              
              <Pressable 
                onPress={() => setSavedChordPage(prev => {
                  const maxPage = Math.ceil(filteredChords.length / 16) - 1;
                  return prev < maxPage ? prev + 1 : prev;
                })}
                disabled={savedChordPage >= Math.ceil(filteredChords.length / 16) - 1}
                style={styles.paginationArrow}
              >
                <View style={[styles.arrowCircle, savedChordPage >= Math.ceil(filteredChords.length / 16) - 1 && styles.arrowCircleDisabled]}>
                  <Play 
                    size={16} 
                    color={savedChordPage >= Math.ceil(filteredChords.length / 16) - 1 ? colors.textMuted : colors.textOffWhite}
                    fill={savedChordPage >= Math.ceil(filteredChords.length / 16) - 1 ? colors.textMuted : colors.textOffWhite}
                  />
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontSize: 18,
    fontWeight: 'bold',
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
  content: {
    flex: 1,
    padding: 16,
    maxWidth: Platform.OS === 'web' ? 1200 : undefined, // Constrain max width on web
    width: '100%',
    alignSelf: 'center', // Center the content on web
  },
  mainLayout: {
    flexDirection: 'row',
    flex: 1,
    flexWrap: Platform.OS === 'web' ? 'nowrap' : 'wrap', // Prevent wrapping on web
  },
  leftPanel: {
    width: 320,
    marginRight: 16,
    marginTop: -20,
    // Ensure consistent width on all platforms
    minWidth: 320,
    maxWidth: 320,
  },
  rightPanel: {
    flex: 1,
    position: 'relative',
    marginTop: 0,
    // Ensure minimum width on web to prevent squishing
    minWidth: Platform.OS === 'web' ? 400 : undefined,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: -15,
    right: 15,
    paddingHorizontal: 8,
    paddingBottom: 16,
    width: 130,
  },
  paginationArrow: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowCircleDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  gridItem: {
    width: 78,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 2,
  },
});