import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { colors } from '@/constants/colors';
import { Chord } from '@/types/music';
import { ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react-native';
import { SavedChordButton } from './SavedChordButton';

interface SavedChordGridProps {
  chords: Chord[];
  onChordPress: (chord: Chord, index: number) => void;
  onChordRelease: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  columns?: number;
  rows?: number;
  activeChordIndex?: number | null;
  saveMode?: boolean;
  showToggle?: boolean;
  isSecondPage?: boolean;
  onTogglePage?: () => void;
}

export const SavedChordGrid: React.FC<SavedChordGridProps> = ({
  chords,
  onChordPress,
  onChordRelease,
  currentPage,
  totalPages,
  onPageChange,
  columns = 4,
  rows = 4,
  activeChordIndex,
  saveMode = false,
  showToggle = false,
  isSecondPage = false,
  onTogglePage
}) => {
  const startIndex = currentPage * (columns * rows);
  const endIndex = startIndex + (columns * rows);
  const displayedChords = chords.slice(startIndex, endIndex);
  
  // Reference to track if any button is pressed
  const isAnyButtonPressedRef = useRef(false);
  
  // For web, add global mouse up handler to ensure sound stops when mouse is released
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleGlobalMouseUp = () => {
        if (isAnyButtonPressedRef.current) {
          // Call onChordRelease to stop the sound when mouse is released anywhere
          onChordRelease();
          isAnyButtonPressedRef.current = false;
        }
      };
      
      // Add the event listener
      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      // Clean up
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [onChordRelease]);
  
  // Handle chord press
  const handleChordPress = (chord: Chord, index: number) => {
    isAnyButtonPressedRef.current = true;
    onChordPress(chord, index);
  };
  
  // Handle chord release
  const handleChordRelease = () => {
    isAnyButtonPressedRef.current = false;
    onChordRelease();
  };
  
  // Handle page change
  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 0) {
      onPageChange(currentPage - 1);
    } else if (direction === 'next' && currentPage < totalPages - 1) {
      onPageChange(currentPage + 1);
    }
  };
  
  // Get color for chord button
  const getChordColor = (chord: Chord): string => {
    if (!chord) return colors.buttonGrey;
    
    switch (chord.type) {
      case 'major': return colors.chord.major;
      case 'minor': return colors.chord.minor;
      case 'dim': return colors.chord.dim;
      case 'augmented': return colors.chord.augmented;
      case '7': return colors.chord['7'];
      case '9': return colors.chord['9'];
      case 'sus2': return colors.chord.sus2;
      case 'sus4': return colors.chord.sus4;
      case 'add9': return colors.chord.add9;
      case 'm7b5': return colors.chord.m7b5;
      case 'dim7': return colors.chord.dim7;
      default: return colors.chord.user;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {Array.from({ length: columns }).map((_, colIndex) => {
              const index = rowIndex * columns + colIndex;
              const chord = displayedChords[index];
              const globalIndex = startIndex + index;
              const isActive = activeChordIndex === globalIndex;
              
              return (
                <SavedChordButton
                  key={`chord-${index}`}
                  label={`${globalIndex + 1}`}
                  color={chord ? getChordColor(chord) : colors.buttonGrey}
                  onPress={() => chord && handleChordPress(chord, globalIndex)}
                  onPressOut={handleChordRelease}
                  index={globalIndex + 1}
                  chord={chord}
                  saveMode={saveMode}
                  isHighlighted={isActive}
                />
              );
            })}
          </View>
        ))}
      </View>
      
      {showToggle && (
        <TouchableOpacity 
          style={[styles.pageToggle, isSecondPage && styles.pageToggleActive]}
          onPress={onTogglePage}
        >
          <ArrowLeftRight size={24} color={colors.text} />
          <Text style={styles.pageToggleText}>
            {isSecondPage ? '17-32' : '1-16'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginLeft: 165,
    marginTop: 20,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  pageToggle: {
    backgroundColor: colors.buttonGrey,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    width: 120,
    height: 48,
    marginTop: 16,
  },
  pageToggleActive: {
    backgroundColor: colors.primary,
  },
  pageToggleText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
});