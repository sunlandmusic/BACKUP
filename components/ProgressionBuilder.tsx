import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { colors } from '@/constants/colors';
import { Chord, ChordProgression, NoteName } from '@/types/music';
import { ChordButton } from './ChordButton';
import { ChordSelector } from './ChordSelector';
import { KeySelector } from './KeySelector';
import { playChord, playProgression, stopChord } from '@/utils/audio-utils';
import { Play, Trash2, Save, Plus, Edit, Music } from 'lucide-react-native';

interface ProgressionBuilderProps {
  progression: ChordProgression;
  onUpdateProgression: (progression: ChordProgression) => void;
  onSaveProgression: () => void;
}

export const ProgressionBuilder: React.FC<ProgressionBuilderProps> = ({
  progression,
  onUpdateProgression,
  onSaveProgression
}) => {
  const [selectedChordIndex, setSelectedChordIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(progression.name);
  const [isAddingChord, setIsAddingChord] = useState(false);

  // Reset state when progression changes
  useEffect(() => {
    setSelectedChordIndex(null);
    setIsPlaying(false);
    setIsEditingName(false);
    setTempName(progression.name);
    setIsAddingChord(false);
  }, [progression.id]);

  // Handle chord selection
  const handleSelectChord = (chord: Chord) => {
    playChord(chord.notes);
    
    if (selectedChordIndex !== null) {
      // Update existing chord
      const updatedChords = [...progression.chords];
      updatedChords[selectedChordIndex] = chord;
      
      onUpdateProgression({
        ...progression,
        chords: updatedChords
      });
    } else if (isAddingChord) {
      // Add new chord
      onUpdateProgression({
        ...progression,
        chords: [...progression.chords, chord]
      });
      setIsAddingChord(false);
    }
  };

  // Handle chord release - stop sound
  const handleChordRelease = () => {
    stopChord();
  };

  // Handle chord press in the progression
  const handleChordPress = (index: number) => {
    setSelectedChordIndex(index);
    if (progression.chords[index]) {
      playChord(progression.chords[index].notes);
    }
  };

  // Handle key change
  const handleKeyChange = (key: NoteName) => {
    onUpdateProgression({
      ...progression,
      key
    });
  };

  // Handle tempo change
  const handleTempoChange = (tempo: number) => {
    onUpdateProgression({
      ...progression,
      tempo
    });
  };

  // Handle play progression
  const handlePlayProgression = () => {
    if (isPlaying) {
      stopChord();
      setIsPlaying(false);
      return;
    }
    
    if (progression.chords.length === 0) return;
    
    setIsPlaying(true);
    
    // Extract notes from each chord
    const chordNotes = progression.chords.map(chord => chord.notes);
    
    // Play the progression
    playProgression(
      chordNotes,
      progression.tempo,
      (index) => {
        setSelectedChordIndex(index);
      }
    );
    
    // Set isPlaying to false when progression finishes
    setTimeout(() => {
      setIsPlaying(false);
      setSelectedChordIndex(null);
    }, (60000 / progression.tempo) * progression.chords.length);
  };

  // Handle remove chord
  const handleRemoveChord = (index: number) => {
    const updatedChords = [...progression.chords];
    updatedChords.splice(index, 1);
    
    onUpdateProgression({
      ...progression,
      chords: updatedChords
    });
    
    setSelectedChordIndex(null);
  };

  // Handle name change
  const handleNameChange = () => {
    if (isEditingName) {
      onUpdateProgression({
        ...progression,
        name: tempName
      });
    }
    
    setIsEditingName(!isEditingName);
  };

  // Handle add chord
  const handleAddChord = () => {
    setSelectedChordIndex(null);
    setIsAddingChord(true);
  };

  return (
    <View style={styles.container}>
      {/* Header with name and controls */}
      <View style={styles.header}>
        {isEditingName ? (
          <TextInput
            style={styles.nameInput}
            value={tempName}
            onChangeText={setTempName}
            autoFocus
            onBlur={handleNameChange}
            onSubmitEditing={handleNameChange}
          />
        ) : (
          <Pressable onPress={handleNameChange} style={styles.nameContainer}>
            <Text style={styles.name}>{progression.name}</Text>
            <Edit size={16} color={colors.textSecondary} style={styles.editIcon} />
          </Pressable>
        )}
        
        <View style={styles.controls}>
          <Pressable 
            style={[styles.controlButton, isPlaying && styles.controlButtonActive]} 
            onPress={handlePlayProgression}
          >
            <Play size={20} color={colors.text} fill={isPlaying ? colors.text : 'transparent'} />
          </Pressable>
          
          <Pressable style={styles.controlButton} onPress={onSaveProgression}>
            <Save size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>
      
      {/* Key and tempo selector */}
      <KeySelector 
        selectedKey={progression.key} 
        onKeyChange={handleKeyChange}
        tempo={progression.tempo}
        onTempoChange={handleTempoChange}
      />
      
      {/* Chord progression display */}
      <View style={styles.progressionContainer}>
        <Text style={styles.sectionTitle}>Progression</Text>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chordList}
        >
          {progression.chords.map((chord, index) => (
            <View key={`chord-${index}`} style={styles.chordItem}>
              <ChordButton
                chord={chord}
                onPress={() => handleChordPress(index)}
                onPressOut={handleChordRelease}
                isSelected={selectedChordIndex === index}
                size="medium"
              />
              
              <Pressable 
                style={styles.removeButton}
                onPress={() => handleRemoveChord(index)}
              >
                <Trash2 size={16} color={colors.danger} />
              </Pressable>
              
              <Text style={styles.chordPosition}>{index + 1}</Text>
            </View>
          ))}
          
          <Pressable 
            style={styles.addChordButton}
            onPress={handleAddChord}
          >
            <Plus size={24} color={colors.text} />
          </Pressable>
        </ScrollView>
      </View>
      
      {/* Chord selector */}
      <ChordSelector 
        onSelectChord={handleSelectChord}
        selectedKey={progression.key}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  editIcon: {
    marginLeft: 8,
  },
  nameInput: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 4,
    minWidth: 200,
  },
  controls: {
    flexDirection: 'row',
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  controlButtonActive: {
    backgroundColor: colors.primary,
  },
  progressionContainer: {
    marginVertical: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chordList: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  chordItem: {
    marginRight: 16,
    alignItems: 'center',
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  chordPosition: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  addChordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
});