import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { colors } from '@/constants/colors';
import { NoteName, ChordType, noteNames, ChordModifier } from '@/types/music';
import { createChord } from '@/utils/chord-utils';
import { ChordButton } from './ChordButton';
import { Play } from 'lucide-react-native';
import { stopChord } from '@/utils/audio-utils';

// Define chord types array since it's not exported from types/music
const chordTypes: ChordType[] = [
  'major', 'minor', 'diminished', 'augmented', 'dominant7', 'dominant9',
  'major7', 'minor7', 'major9', 'minor9', 'sus2', 'sus4', 
  'add9', 'm7b5', 'm11', 'dim', 'dim7'
];

interface ChordSelectorProps {
  onSelectChord: (chord: any) => void;
  selectedKey?: NoteName;
}

export const ChordSelector: React.FC<ChordSelectorProps> = ({
  onSelectChord,
  selectedKey = 'C'
}) => {
  const [selectedRoot, setSelectedRoot] = useState<NoteName>(selectedKey);
  const [selectedType, setSelectedType] = useState<ChordType | null>('major');
  const [selectedModifier, setSelectedModifier] = useState<ChordModifier>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Create and select a chord
  const handleSelectChord = (root: NoteName, type: ChordType | null) => {
    setSelectedRoot(root);
    
    // Toggle chord type if it's already selected
    if (selectedType === type) {
      setSelectedType(null);
    } else {
      setSelectedType(type);
    }
    
    // Only create and select a chord if a type is selected
    if (type !== null) {
      const chord = createChord(root, type, 4, undefined, selectedModifier);
      onSelectChord(chord);
    }
  };

  // Handle modifier selection (sus2, sus4)
  const handleModifierSelect = (modifier: ChordModifier) => {
    // Toggle modifier if it's already selected
    if (selectedModifier === modifier) {
      setSelectedModifier(null);
    } else {
      setSelectedModifier(modifier);
    }
    
    // Update chord if we have a root and type selected
    if (selectedRoot && selectedType) {
      const newModifier = selectedModifier === modifier ? null : modifier;
      const chord = createChord(selectedRoot, selectedType, 4, undefined, newModifier);
      onSelectChord(chord);
    }
  };

  // Handle chord button release - stop sound
  const handleChordRelease = () => {
    stopChord();
  };

  // Toggle expanded view
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Helper function to get chord color with fallbacks
  const getChordColor = (type: ChordType): string => {
    // Map dominant9 to '9' color if dominant9 doesn't have its own color
    if (type === 'dominant9' && !colors.chord['dominant9']) {
      return colors.chord['9'];
    }
    
    // For other types, use the type's color or fall back to major
    return colors.chord[type as keyof typeof colors.chord] || colors.chord.major;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chord Selector</Text>
        <Pressable onPress={toggleExpanded} style={styles.expandButton}>
          <View style={styles.arrowCircle}>
            <Play 
              size={16} 
              color={colors.text} 
              style={isExpanded ? styles.upArrow : undefined}
              fill={colors.text}
            />
          </View>
        </Pressable>
      </View>

      {/* Root note selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rootSelector}>
        {noteNames.map((note) => (
          <Pressable
            key={note}
            style={[
              styles.rootButton,
              selectedRoot === note && styles.selectedRootButton
            ]}
            onPress={() => handleSelectChord(note, selectedType)}
          >
            <Text
              style={[
                styles.rootButtonText,
                selectedRoot === note && styles.selectedRootButtonText
              ]}
            >
              {note}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Chord type selector */}
      {isExpanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
          {chordTypes.map((type: ChordType) => (
            <Pressable
              key={type}
              style={[
                styles.typeButton,
                selectedType === type && styles.selectedTypeButton,
                { backgroundColor: getChordColor(type) }
              ]}
              onPress={() => handleSelectChord(selectedRoot, type)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  selectedType === type && styles.selectedTypeButtonText
                ]}
              >
                {type}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Modifier selector (sus2, sus4) */}
      {isExpanded && (
        <View style={styles.modifierContainer}>
          <Text style={styles.modifierLabel}>Modifiers:</Text>
          <View style={styles.modifierButtons}>
            <Pressable
              style={[
                styles.modifierButton,
                selectedModifier === 'sus2' && styles.selectedModifierButton,
                { backgroundColor: colors.chord.sus2 }
              ]}
              onPress={() => handleModifierSelect('sus2')}
            >
              <Text style={styles.modifierButtonText}>sus2</Text>
            </Pressable>
            <Pressable
              style={[
                styles.modifierButton,
                selectedModifier === 'sus4' && styles.selectedModifierButton,
                { backgroundColor: colors.chord.sus4 }
              ]}
              onPress={() => handleModifierSelect('sus4')}
            >
              <Text style={styles.modifierButtonText}>sus4</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Current chord display */}
      <View style={styles.currentChordContainer}>
        {selectedType ? (
          <ChordButton
            chord={createChord(selectedRoot, selectedType, 4, undefined, selectedModifier)}
            onPress={() => onSelectChord(createChord(selectedRoot, selectedType, 4, undefined, selectedModifier))}
            onPressOut={handleChordRelease}
            isSelected={true}
            size="large"
          />
        ) : (
          <View style={styles.noChordSelected}>
            <Text style={styles.noChordText}>Select a chord type</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  expandButton: {
    padding: 4,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upArrow: {
    transform: [{ rotate: '270deg' }],
  },
  rootSelector: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  rootButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    minWidth: 40,
    alignItems: 'center',
  },
  selectedRootButton: {
    backgroundColor: colors.primary,
  },
  rootButtonText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  selectedRootButtonText: {
    color: colors.text,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  selectedTypeButton: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  typeButtonText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  selectedTypeButtonText: {
    color: colors.text,
  },
  modifierContainer: {
    marginBottom: 12,
  },
  modifierLabel: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modifierButtons: {
    flexDirection: 'row',
  },
  modifierButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  selectedModifierButton: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  modifierButtonText: {
    color: '#000000', // Black text for sus2/sus4
    fontWeight: 'bold',
  },
  currentChordContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  noChordSelected: {
    height: 80,
    width: 120,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
  },
  noChordText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});