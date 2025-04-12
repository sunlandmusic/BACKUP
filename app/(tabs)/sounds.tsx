import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, SafeAreaView, Pressable, Text, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/colors";
import { InstrumentSelector } from "@/components/InstrumentSelector";
import { SavedChordGrid } from "@/components/SavedChordGrid";
import { useChordStore } from "@/stores/chord-store";
import { Chord, FlamValue, InstrumentType } from "@/types/music";
import { playChord, stopChord } from "@/utils/audio-utils";
import { usePathname } from "expo-router";
import { NavigationMenu } from "@/components/NavigationMenu";
import { Eye, Play } from "lucide-react-native";
import * as Tone from 'tone';

export default function SoundsScreen() {
  const { 
    savedChords, 
    currentInstrument, 
    currentFlamValue, 
    setCurrentInstrument, 
    setCurrentFlamValue,
    setCurrentChord,
    currentChord,
    isPlaying,
    setIsPlaying
  } = useChordStore();
  
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
  
  // Handle flam value change
  const handleFlamValueChange = (flamValue: FlamValue) => {
    setCurrentFlamValue(flamValue);
  };
  
  // Handle chord press
  const handleChordPress = (chord: Chord, index: number) => {
    // Set flag that a chord button is pressed
    isChordButtonPressedRef.current = true;
    
    // Set active chord index for tracking
    setActiveChordIndex(index);
    
    // Play the chord
    playChord(chord.notes);
    
    // Set the current chord in the store
    setCurrentChord(chord);
  };
  
  // Handle chord release - immediately stop sound and clear highlight
  const handleChordRelease = () => {
    // Reset the pressed flag
    isChordButtonPressedRef.current = false;
    
    // Clear active chord index
    setActiveChordIndex(null);
    
    // Stop playing the chord
    stopChord();
    
    // Clear the current chord in the store
    setCurrentChord(null);
  };

  // Toggle navigation menu
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      Tone.Transport.stop();
    } else {
      Tone.Transport.start();
    }
    setIsPlaying(!isPlaying);
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
        <Text style={styles.title}>SOUNDS</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.mainLayout}>
          {/* Left side - Instrument selector */}
          <View style={styles.leftPanel}>
            <InstrumentSelector
              currentInstrument={currentInstrument}
              currentFlamValue={currentFlamValue}
              onInstrumentChange={handleInstrumentChange}
              onFlamValueChange={handleFlamValueChange}
            />
          </View>
          
          {/* Right side - Saved chord grid */}
          <View style={styles.rightPanel}>
            <View style={styles.gridContainer}>
              <SavedChordGrid
                chords={savedChords}
                onChordPress={handleChordPress}
                onChordRelease={handleChordRelease}
                currentPage={savedChordPage}
                totalPages={2}
                onPageChange={setSavedChordPage}
                columns={4}
                rows={4}
                activeChordIndex={activeChordIndex}
                saveMode={false}
              />
            </View>
            
            {/* Combined container for pagination and transport */}
            <View style={styles.controlsContainer}>
              <View style={styles.paginationContainer}>
                <Pressable 
                  onPress={() => setSavedChordPage(0)}
                  disabled={savedChordPage === 0}
                  style={styles.paginationArrow}
                >
                  <View style={[styles.arrowCircle, savedChordPage === 0 && styles.arrowCircleDisabled]}>
                    <Play 
                      size={16} 
                      color={savedChordPage === 0 ? colors.textMuted : colors.textOffWhite}
                      style={styles.prevArrow}
                      fill={savedChordPage === 0 ? colors.textMuted : colors.textOffWhite}
                    />
                  </View>
                </Pressable>
                
                <Pressable 
                  onPress={() => setSavedChordPage(1)}
                  disabled={savedChordPage === 1}
                  style={styles.paginationArrow}
                >
                  <View style={[styles.arrowCircle, savedChordPage === 1 && styles.arrowCircleDisabled]}>
                    <Play 
                      size={16} 
                      color={savedChordPage === 1 ? colors.textMuted : colors.textOffWhite}
                      fill={savedChordPage === 1 ? colors.textMuted : colors.textOffWhite}
                    />
                  </View>
                </Pressable>
              </View>
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
    paddingHorizontal: 12,
    paddingTop: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 26,
    maxWidth: Platform.OS === 'web' ? 1200 : undefined,
    width: '100%',
    alignSelf: 'center',
  },
  mainLayout: {
    flexDirection: 'row',
    flex: 1,
    flexWrap: Platform.OS === 'web' ? 'nowrap' : 'wrap', // Prevent wrapping on web
  },
  leftPanel: {
    width: 352,
    marginRight: 16,
    marginTop: -20,
    minWidth: 352,
    maxWidth: 352,
    flex: 1,
    transform: [{ scale: 1.1 }], // Scale up the left panel
  },
  rightPanel: {
    flex: 1,
    position: 'relative',
    marginTop: 0,
    // Ensure minimum width on web to prevent squishing
    minWidth: Platform.OS === 'web' ? 400 : undefined,
  },
  gridContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    position: 'relative',
    width: '100%',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 35,
    left: 0,
    right: 0,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 41,
  },
  transportButton: {
    width: 53,
    height: 53,
    borderRadius: 26.5,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
  },
  transportButtonActive: {
    backgroundColor: colors.buttonActive,
  },
  transportButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  paginationArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.buttonGrey,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowCircleDisabled: {
    backgroundColor: colors.surfaceLight,
  },
  prevArrow: {
    transform: [{ rotate: '180deg' }],
  },
  nextArrow: {
    marginRight: -2,
  },
  eyeButton: {
    position: 'absolute',
    top: 20,
    left: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});