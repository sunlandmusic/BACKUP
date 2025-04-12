import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, SafeAreaView, Pressable, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/colors";
import { useChordStore } from "@/stores/chord-store";
import { Chord, ChordType, NoteName, noteNames } from "@/types/music";
import { playChord, stopChord, initAudio } from "@/utils/audio-utils";
import { createChord, getScaleNotes, getMidiNote } from "@/utils/chord-utils";
import { Eye, Play } from "lucide-react-native";
import { HorizontalPiano } from "@/components/HorizontalPiano";
import { SavedChordButton } from "@/components/SavedChordButton";
import { NavigationMenu } from "@/components/NavigationMenu";
import { usePathname } from "expo-router";

export default function ChordComposeScreen() {
  const { 
    currentChord, 
    setCurrentChord, 
    savedChords, 
    saveChord,
    currentKey,
    setCurrentKey,
    currentMode,
    setCurrentMode
  } = useChordStore();
  
  const [selectedChordType, setSelectedChordType] = useState<ChordType | null>(null);
  const [selectedBassOffset, setSelectedBassOffset] = useState<number | null>(null);
  const [inversion, setInversion] = useState(0);
  const [voicing, setVoicing] = useState(0);
  const [octave, setOctave] = useState(0);
  const [scaleNotes, setScaleNotes] = useState<NoteName[]>([]);
  const [tempHighlightedChord, setTempHighlightedChord] = useState<Chord | null>(null);
  const [lastPlayedChord, setLastPlayedChord] = useState<Chord | null>(null);
  
  // For contextual +/- buttons
  const [selectedControl, setSelectedControl] = useState<'key' | 'mode' | 'inversion' | 'voicing' | 'octave' | null>('key');
  
  // For navigation menu
  const [menuVisible, setMenuVisible] = useState(false);
  
  // For saved chord pagination
  const [savedChordPage, setSavedChordPage] = useState(0);
  const savedChordsPerPage = 8;
  const maxSavedChords = 32; // Limit to 32 saved chords (4 pages of 8)
  
  // For save mode
  const [saveMode, setSaveMode] = useState(false);
  
  // For tracking active saved chord
  const [activeSavedChordIndex, setActiveSavedChordIndex] = useState<number | null>(null);
  
  // Ref to track if any chord button is pressed
  const isChordButtonPressedRef = useRef(false);
  
  // Get current route for navigation menu
  const pathname = usePathname();
  
  // Initialize audio on component mount
  useEffect(() => {
    const setupAudio = async () => {
      await initAudio();
    };
    
    setupAudio();
  }, []);
  
  // Update scale notes when key or mode changes
  useEffect(() => {
    setScaleNotes(getScaleNotes(currentKey, currentMode));
  }, [currentKey, currentMode]);
  
  // Cleanup effect to stop any playing sounds when component unmounts
  useEffect(() => {
    return () => {
      stopChord();
    };
  }, []);
  
  // Add global mouse up handler for web to ensure sound stops when mouse is released
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleGlobalMouseUp = () => {
        if (isChordButtonPressedRef.current) {
          // Stop the chord and reset active index
          stopChord();
          setActiveSavedChordIndex(null);
          setTempHighlightedChord(null);
          setCurrentChord(null);
          isChordButtonPressedRef.current = false;
        }
      };
      
      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [setCurrentChord]);
  
  // Handle note press on piano
  const handleNotePress = (noteName: NoteName, midiNote: number) => {
    if (selectedChordType) {
      // Create chord based on selected type and root note
      let bassNote: NoteName | undefined;
      
      if (selectedBassOffset !== null) {
        const rootIndex = noteNames.indexOf(noteName);
        const bassIndex = (rootIndex + selectedBassOffset + 12) % 12;
        bassNote = noteNames[bassIndex];
      }
      
      // Create the chord with the primary type
      const chord = createChord(noteName, selectedChordType, 4 + octave, bassNote);
      
      // Apply inversion if selected
      if (inversion !== 0 && chord.notes.length >= 3) {
        const notes = [...chord.notes];
        if (inversion < 0) {
          // Move notes down an octave for negative inversions
          for (let i = notes.length - 1; i >= notes.length - Math.abs(inversion); i--) {
            notes[i] -= 12; // Move down an octave
          }
        } else {
          // Move notes up an octave for positive inversions
          for (let i = 0; i < inversion; i++) {
            notes[i] += 12; // Move up an octave
          }
        }
        chord.notes = notes;
      }
      
      setCurrentChord(chord);
      setLastPlayedChord(chord); // Store as last played chord
      playChord(chord.notes);
      
      // Set temporary highlighted chord for visualization
      setTempHighlightedChord(chord);
    } else {
      // Just play the single note
      playChord([midiNote]);
      // Clear current chord when just playing a single note
      setCurrentChord(null);
      setTempHighlightedChord(null);
    }
  };
  
  // Handle note release on piano - stop all sounds
  const handleNoteRelease = () => {
    stopChord();
    setTempHighlightedChord(null);
    // Also clear the current chord when releasing the note
    // This makes the behavior consistent with saved chord buttons
    setCurrentChord(null);
  };
  
  // Handle chord type button press
  const handleChordTypePress = (type: ChordType, label: string, bassOffset?: number) => {
    // Stop any currently playing sounds
    stopChord();
    
    if (label.includes('BASS')) {
      // Handle bass offset buttons - make them toggleable
      if (selectedBassOffset === bassOffset) {
        // If already selected, deselect it
        setSelectedBassOffset(null);
      } else {
        // Otherwise select it
        setSelectedBassOffset(bassOffset || 0);
        if (!selectedChordType) {
          setSelectedChordType('major'); // Default to major when selecting bass
        }
      }
    } else {
      // Handle all chord types as primary chord types
      if (selectedChordType === type) {
        // If already selected, deselect it
        setSelectedChordType(null);
        // Clear the current chord when deselecting a chord type
        setCurrentChord(null);
      } else {
        // Otherwise select it
        setSelectedChordType(type);
      }
    }
  };
  
  // Handle contextual +/- button press
  const handleAdjustValue = (direction: 'up' | 'down') => {
    if (!selectedControl) return;
    
    switch (selectedControl) {
      case 'key':
        const currentKeyIndex = noteNames.indexOf(currentKey);
        const newKeyIndex = direction === 'up' 
          ? (currentKeyIndex + 1) % noteNames.length
          : (currentKeyIndex - 1 + noteNames.length) % noteNames.length;
        setCurrentKey(noteNames[newKeyIndex]);
        break;
        
      case 'mode':
        const modes = ['off', 'major', 'minor', 'ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];
        const currentModeIndex = modes.indexOf(currentMode);
        let newModeIndex;
        
        if (direction === 'up') {
          newModeIndex = (currentModeIndex + 1) % modes.length;
        } else {
          newModeIndex = (currentModeIndex - 1 + modes.length) % modes.length;
        }
        
        setCurrentMode(modes[newModeIndex] as any);
        break;
        
      case 'octave':
        if (direction === 'up') {
          setOctave(prev => prev < 3 ? prev + 1 : prev);
        } else {
          setOctave(prev => prev > -3 ? prev - 1 : prev);
        }
        break;
        
      case 'inversion':
        let newInversion;
        if (direction === 'up') {
          newInversion = inversion === -2 ? -1 :
                         inversion === -1 ? 0 :
                         inversion === 0 ? 1 :
                         inversion === 1 ? 2 : inversion;
        } else {
          newInversion = inversion === 2 ? 1 :
                         inversion === 1 ? 0 :
                         inversion === 0 ? -1 :
                         inversion === -1 ? -2 : inversion;
        }
        setInversion(newInversion);
        break;
        
      case 'voicing':
        if (direction === 'up') {
          setVoicing(prev => prev < 3 ? prev + 1 : prev);
        } else {
          setVoicing(prev => prev > -3 ? prev - 1 : prev);
        }
        break;
    }
  };

  // Handle saved chord press
  const handleSavedChordPress = (index: number) => {
    if (saveMode) {
      // In save mode, pressing a chord slot saves the current chord or last played chord
      handleSaveCurrentChord(index);
      setSaveMode(false);
      return;
    }
    
    if (savedChords.length <= index) return;
    
    const chord = savedChords[index];
    if (!chord) return;
    
    // Set flag that a chord button is pressed
    isChordButtonPressedRef.current = true;
    
    // Set active saved chord index for tracking
    setActiveSavedChordIndex(index);
    
    // Set temporary highlighted chord for visualization
    setTempHighlightedChord(chord);
    
    // Set the current chord in the store
    setCurrentChord(chord);
    setLastPlayedChord(chord); // Update last played chord
    
    // Play the chord
    playChord(chord.notes);
  };

  // Handle saved chord release - immediately stop sound and clear highlight
  const handleSavedChordRelease = () => {
    // Reset the pressed flag
    isChordButtonPressedRef.current = false;
    
    // Clear active saved chord index
    setActiveSavedChordIndex(null);
    
    // Clear temporary highlighted chord
    setTempHighlightedChord(null);
    
    // Stop playing the chord
    stopChord();
    
    // Clear the current chord when releasing the button
    setCurrentChord(null);
  };

  // Handle saving current chord
  const handleSaveCurrentChord = (index: number) => {
    // Use either the current chord or the last played chord, whichever is available
    const chordToSave = currentChord || lastPlayedChord;
    
    if (!chordToSave || index >= maxSavedChords) return;
    saveChord(chordToSave, index);
  };

  // Toggle save mode
  const toggleSaveMode = () => {
    setSaveMode(!saveMode);
  };

  // Get color for saved chord button
  const getSavedChordColor = (index: number) => {
    if (savedChords.length <= index) return colors.buttonGrey;
    
    const chord = savedChords[index];
    if (!chord) return colors.buttonGrey;
    
    switch (chord.type) {
      case 'major': return colors.chord.major;
      case 'minor': return colors.chord.minor;
      case 'diminished': return colors.chord.diminished;
      case 'augmented': return colors.chord.augmented;
      case 'dominant7': return colors.chord.dominant7;
      case 'major7': return colors.chord.major7;
      case 'minor7': return colors.chord.minor7;
      case 'major9': return colors.chord.major9;
      case 'minor9': return colors.chord.minor9;
      case 'dominant9': return colors.chord['9']; // Using '9' from colors instead of 'dominant9'
      case 'sus2': return colors.chord.sus2;
      case 'sus4': return colors.chord.sus4;
      case 'add9': return colors.chord.add9;
      case 'm7b5': return colors.chord.m7b5;
      case 'm11': return colors.chord.m11;
      case 'dim': return colors.chord.dim;
      case 'dim7': return colors.chord.dim7;
      default: return colors.chord.user;
    }
  };

  // Handle saved chord page navigation
  const handleSavedChordPageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSavedChordPage(prev => Math.max(0, prev - 1));
    } else {
      const maxPages = Math.ceil(maxSavedChords / savedChordsPerPage);
      setSavedChordPage(prev => prev < maxPages - 1 ? prev + 1 : prev);
    }
  };

  // Toggle navigation menu
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  // Handle control selection
  const handleControlSelect = (control: 'key' | 'mode' | 'inversion' | 'voicing' | 'octave') => {
    setSelectedControl(control);
  };

  // Get chord display name
  const getChordDisplayName = () => {
    if (!currentChord) return '';
    
    let displayName = currentChord.root;
    
    switch (currentChord.type) {
      case 'major': break;
      case 'minor': displayName += 'm'; break;
      case 'diminished': displayName += 'dim'; break;
      case 'augmented': displayName += 'aug'; break;
      case 'dominant7': displayName += '7'; break;
      case 'major7': displayName += 'maj7'; break;
      case 'minor7': displayName += 'm7'; break;
      case 'major9': displayName += 'maj9'; break;
      case 'minor9': displayName += 'm9'; break;
      case 'dominant9': displayName += '9'; break;
      case 'sus2': displayName += 'sus2'; break;
      case 'sus4': displayName += 'sus4'; break;
      case 'add9': displayName += 'add9'; break;
      case 'm7b5': displayName += 'm7b5'; break;
      case 'm11': displayName += 'm11'; break;
      case 'dim': displayName += 'dim'; break;
      case 'dim7': displayName += 'dim7'; break;
      default: break;
    }
    
    // Add slash notation for bass note if different from root
    if (currentChord.bassNote && currentChord.bassNote !== currentChord.root) {
      displayName += `/${currentChord.bassNote}`;
    }
    
    return displayName;
  };

  // Define chord types for each row
  const chordTypeRows = [
    // Row 1
    [
      { type: 'major' as ChordType, label: 'MAJ', color: colors.chord.major },
      { type: 'major7' as ChordType, label: 'MAJ7', color: colors.chord.major7 },
      { type: 'major9' as ChordType, label: 'MAJ9', color: colors.chord.major9 },
      { type: 'dominant7' as ChordType, label: '7', color: colors.chord.dominant7 },
    ],
    // Row 2
    [
      { type: 'minor' as ChordType, label: 'MIN', color: colors.chord.minor },
      { type: 'minor7' as ChordType, label: 'MIN7', color: colors.chord.minor7 },
      { type: 'minor9' as ChordType, label: 'MIN9', color: colors.chord.minor9 },
      { type: 'dominant9' as ChordType, label: '9', color: colors.chord['9'] }, // Using '9' from colors instead of 'dominant9'
    ],
    // Row 3
    [
      { type: 'sus2' as ChordType, label: 'SUS2', color: colors.chord.sus2 },
      { type: 'sus4' as ChordType, label: 'SUS4', color: colors.chord.sus4 },
      { type: 'diminished' as ChordType, label: 'DIM', color: colors.chord.dim },
      { type: 'dim7' as ChordType, label: 'DIM7', color: colors.chord.dim7 },
    ],
    // Row 4
    [
      { type: 'm11' as ChordType, label: 'M11', color: colors.chord.m11 },
      { type: 'm7b5' as ChordType, label: 'm7b5', color: colors.chord.m7b5 },
      { type: 'add9' as ChordType, label: 'ADD9', color: colors.chord.add9 },
      { type: 'user' as ChordType, label: 'USER', color: colors.chord.user },
    ],
    // Row 5 - Bass offset buttons
    [
      { type: 'major' as ChordType, label: '-2 BASS', bassOffset: -2, color: colors.surfaceLight },
      { type: 'major' as ChordType, label: '+2 BASS', bassOffset: 2, color: colors.surfaceLight },
      { type: 'major' as ChordType, label: '-3 BASS', bassOffset: -3, color: colors.surfaceLight },
      { type: 'major' as ChordType, label: '+3 BASS', bassOffset: 3, color: colors.surfaceLight },
    ],
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
      
      <View style={styles.mainContent}>
        {/* Main layout with chord types on left, piano on right */}
        <View style={styles.topSection}>
          {/* Left side - Chord Types Section */}
          <View style={styles.chordTypesSection}>
            <View style={styles.chordTypeGrid}>
              {chordTypeRows.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.chordTypeRow}>
                  {row.map((item, colIndex) => (
                    <Pressable
                      key={`${item.type}-${rowIndex}-${colIndex}`}
                      style={[
                        styles.chordTypeButton,
                        { backgroundColor: item.color || colors.surface },
                        // For chord types, highlight if they're the selected primary type
                        ('bassOffset' in item && selectedBassOffset === item.bassOffset) ||
                        (!('bassOffset' in item) && selectedChordType === item.type) 
                          ? styles.selectedChordTypeButton 
                          : null
                      ]}
                      onPressIn={() => handleChordTypePress(item.type, item.label, 'bassOffset' in item ? item.bassOffset : undefined)}
                    >
                      <Text style={[
                        styles.chordTypeText,
                        // Apply black text color for all except m11, USER, and BASS buttons
                        (item.label === 'M11' || item.label === 'USER' || item.label.includes('BASS') || 
                         item.label === 'MIN' || item.label === 'MIN7' || item.label === 'MIN9') 
                          ? styles.whiteChordTypeText 
                          : styles.blackChordTypeText
                      ]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </View>
          
          {/* Right side - Piano Keyboard */}
          <View style={styles.pianoSection}>
            {/* Settings panel at top of piano section */}
            <View style={styles.settingsPanel}>
              <Pressable 
                style={[styles.settingItem, selectedControl === 'key' && styles.selectedSettingItem]} 
                onPress={() => handleControlSelect('key')}
              >
                <Text style={styles.settingLabel}>KEY</Text>
                <Text style={styles.settingValue}>{currentKey}</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.settingItem, selectedControl === 'mode' && styles.selectedSettingItem]} 
                onPress={() => handleControlSelect('mode')}
              >
                <Text style={styles.settingLabel}>MODE</Text>
                <Text style={styles.settingValue}>{currentMode.toUpperCase()}</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.settingItem, selectedControl === 'octave' && styles.selectedSettingItem]} 
                onPress={() => handleControlSelect('octave')}
              >
                <Text style={styles.settingLabel}>OCT</Text>
                <Text style={styles.settingValue}>{octave}</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.settingItem, selectedControl === 'inversion' && styles.selectedSettingItem]} 
                onPress={() => handleControlSelect('inversion')}
              >
                <Text style={styles.settingLabel}>INV</Text>
                <Text style={styles.settingValue}>{inversion}</Text>
              </Pressable>
              
              <View style={styles.chordDisplayItem}>
                <Text style={styles.settingLabel}>CHORD</Text>
                <Text style={styles.chordDisplayValue}>{getChordDisplayName()}</Text>
              </View>
            </View>
            
            {/* Piano keyboard */}
            <View style={styles.horizontalPianoContainer}>
              <HorizontalPiano 
                octave={4}
                onNotePress={handleNotePress}
                onNoteRelease={handleNoteRelease}
                highlightedNotes={tempHighlightedChord?.notes || currentChord?.notes}
                rootNote={tempHighlightedChord?.root || currentChord?.root}
                scaleNotes={scaleNotes}
              />
            </View>
          </View>
        </View>
        
        {/* Bottom section with saved chords */}
        <View style={styles.bottomSection}>
          {/* Navigation arrows and saved chord buttons */}
          <View style={styles.savedChordsContainer}>
            <View style={styles.savedChordsRow}>
              {/* Save button */}
              <Pressable 
                style={[styles.saveButton, saveMode && styles.saveButtonActive]}
                onPress={toggleSaveMode}
              >
                <Text style={styles.saveButtonText}>S</Text>
              </Pressable>

              {/* Left arrow button */}
              <Pressable 
                style={styles.savedChordNavButton}
                onPress={() => handleSavedChordPageChange('prev')}
                disabled={savedChordPage === 0}
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
              
              {/* Saved chord buttons */}
              <View style={styles.savedChordButtonsContainer}>
                {Array.from({ length: 8 }).map((_, index) => {
                  const chordIndex = savedChordPage * savedChordsPerPage + index;
                  const chord = savedChords[chordIndex];
                  const isActive = activeSavedChordIndex === chordIndex;
                  
                  return (
                    <SavedChordButton
                      key={`saved-chord-${chordIndex}`}
                      label={`${chordIndex + 1}`}
                      color={getSavedChordColor(chordIndex)}
                      onPress={() => handleSavedChordPress(chordIndex)}
                      onPressOut={handleSavedChordRelease}
                      onLongPress={() => handleSaveCurrentChord(chordIndex)}
                      index={chordIndex + 1}
                      chord={chord}
                      saveMode={saveMode}
                      isHighlighted={isActive}
                    />
                  );
                })}
              </View>

              {/* Right arrow button */}
              <Pressable 
                style={styles.savedChordNavButtonRight}
                onPress={() => handleSavedChordPageChange('next')}
                disabled={savedChordPage >= Math.ceil(maxSavedChords / savedChordsPerPage) - 1}
              >
                <View style={[
                  styles.arrowCircle, 
                  savedChordPage >= Math.ceil(maxSavedChords / savedChordsPerPage) - 1 && styles.arrowCircleDisabled
                ]}>
                  <Play 
                    size={16} 
                    color={savedChordPage >= Math.ceil(maxSavedChords / savedChordsPerPage) - 1 ? colors.textMuted : colors.textOffWhite} 
                    fill={savedChordPage >= Math.ceil(maxSavedChords / savedChordsPerPage) - 1 ? colors.textMuted : colors.textOffWhite}
                  />
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      
      {/* Plus/Minus buttons at right */}
      <View style={styles.plusMinusContainer}>
        <Pressable 
          style={styles.plusButton}
          onPress={() => handleAdjustValue('up')}
        >
          <Text style={styles.plusMinusText}>+</Text>
        </Pressable>
        
        <Pressable 
          style={styles.minusButton}
          onPress={() => handleAdjustValue('down')}
        >
          <Text style={styles.plusMinusText}>-</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    flexDirection: 'row', // Main layout is horizontal for landscape
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    marginLeft: 30, // Reduced from 60px to 30px to slide everything left by 30px
    marginTop: 0, // Removed top margin to move everything up
  },
  // Eye button at top left corner
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
  // Top section containing chord types and piano
  topSection: {
    flexDirection: 'row',
    height: 280, // Height for the top section
    marginTop: 0, // Removed top margin
  },
  // Chord Types Section - at left
  chordTypesSection: {
    width: 340,
    height: '100%',
    padding: 4,
    marginLeft: -16, // Changed from -7 to -16 to move chord grid left by 9 pixels
    position: 'relative', // Added to ensure independent positioning
  },
  chordTypeGrid: {
    width: '100%',
    height: '100%',
  },
  chordTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8, // Space between rows
  },
  chordTypeButton: {
    width: 78, // Updated to W 78 as requested
    height: 48, // H 48 as requested
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2, // This gives spacing between buttons
  },
  selectedChordTypeButton: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  chordTypeText: {
    fontWeight: 'bold',
    fontSize: 14, // Increased from 12 to 14 for better readability
  },
  blackChordTypeText: {
    color: '#000000', // Black text for most chord types
  },
  whiteChordTypeText: {
    color: colors.text, // White text for MIN, MIN7, MIN9, m11, USER, and BASS buttons
  },
  // Piano section - at right of chord types
  pianoSection: {
    flex: 1,
    marginLeft: 5, // Reset to original position
    marginRight: 5,
  },
  // Settings panel above piano
  settingsPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 5,
    height: 67, // Height set to 67px as requested
  },
  settingItem: {
    alignItems: 'center',
    padding: 5,
    borderRadius: 4,
    justifyContent: 'center', // Center content vertically
  },
  chordDisplayItem: {
    alignItems: 'center',
    padding: 5,
    borderRadius: 4,
    justifyContent: 'center',
    flex: 2, // Give more space to the chord display
  },
  selectedSettingItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingLabel: {
    color: colors.textSecondary,
    fontSize: 12, // Increased from 10 to 12
    marginBottom: 2,
    fontWeight: 'bold',
  },
  settingValue: {
    color: colors.text,
    fontSize: 16, // Increased from 12 to 16
    fontWeight: 'bold',
  },
  chordDisplayValue: {
    color: colors.text,
    fontSize: 28, // Much larger for better visibility
    fontWeight: 'bold',
  },
  // Piano keyboard container
  horizontalPianoContainer: {
    width: '100%', // Fill available width
    height: 205, // Height set to 205px as requested
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  // Bottom section with saved chords
  bottomSection: {
    height: 60, // Height for saved chords section
    marginTop: 5, // Small gap between piano and saved chords
  },
  // Saved chords section
  savedChordsContainer: {
    width: '100%',
    marginTop: 4,
    position: 'relative',
    marginLeft: -37, // Changed from -30 to -37 to move 7 pixels to the left
  },
  savedChordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 65, // Changed from 55 to 65 to move 10 pixels to the right
  },
  savedChordNavButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 0,
    marginRight: 10,
  },
  saveButton: {
    width: 30,
    height: 48,
    backgroundColor: colors.buttonGrey,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -90,
    marginRight: 0,
  },
  saveButtonActive: {
    borderWidth: 2,
    borderColor: colors.error,
  },
  saveButtonText: {
    color: '#8B0000',  // DarkRed - same as delete button
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Container for saved chord buttons to align them properly
  savedChordButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 335,
    marginLeft: -5,
    gap: 8,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.buttonGrey, // Updated to use buttonGrey
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowCircleDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  prevArrow: {
    transform: [{ rotate: '180deg' }],
    marginLeft: -8,
  },
  // Plus/Minus buttons at right
  plusMinusContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40, // REDUCED from 45 to 40 (by 5px) as requested
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  minusButton: {
    width: 40, // REDUCED from 45 to 40 (by 5px) as requested
    height: 140, // Height set to 140 as requested
    borderRadius: 8,
    backgroundColor: colors.buttonGrey, // Updated to use buttonGrey
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  plusButton: {
    width: 40, // REDUCED from 45 to 40 (by 5px) as requested
    height: 140, // Height set to 140 as requested
    borderRadius: 8,
    backgroundColor: colors.buttonGrey, // Updated to use buttonGrey
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  plusMinusText: {
    color: colors.textOffWhite, // Updated to off-white
    fontSize: 28, // Increased from 22 to 28 for better visibility
    fontWeight: 'bold',
  },
  savedChordNavButtonRight: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 270, // Changed from 170 to 270 to move 100 pixels to the right
  },
});