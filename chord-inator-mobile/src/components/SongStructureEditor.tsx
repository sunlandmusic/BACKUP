import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { colors } from '@/constants/colors';
import { Section, Song } from '@/types/music';
import { ChevronDown, ChevronUp, Play, Pause, SkipBack, SkipForward, Edit, Trash2, Plus, Save } from 'lucide-react-native';

interface SongStructureEditorProps {
  song: Song;
  onUpdateSection: (index: number, section: Partial<Section>) => void;
  onRemoveSection: (index: number) => void;
  onAddSection: () => void;
  onSave: () => void;
  onNameChange: (name: string) => void;
}

export const SongStructureEditor: React.FC<SongStructureEditorProps> = ({
  song,
  onUpdateSection,
  onRemoveSection,
  onAddSection,
  onSave,
  onNameChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState({ bar: 1, beat: 1 });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(song.name);

  // Handle play/pause
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle rewind
  const handleRewind = () => {
    setCurrentPosition({ bar: 1, beat: 1 });
  };

  // Handle forward
  const handleForward = () => {
    // Logic to skip to next section
  };

  // Handle section repeat change
  const handleRepeatChange = (index: number, direction: 'increase' | 'decrease') => {
    const section = song.sections[index];
    if (!section) return;
    
    let newRepeat = section.repeat;
    if (direction === 'increase') {
      newRepeat += 1;
    } else {
      newRepeat = Math.max(1, newRepeat - 1);
    }
    
    onUpdateSection(index, { repeat: newRepeat });
  };

  // Handle name change
  const handleNameChange = () => {
    onNameChange(tempName);
    setIsEditingName(false);
  };

  // Get progression name by ID
  const getProgressionName = (progressionId: string): string => {
    const progression = song.progressions.find(p => p.id === progressionId);
    return progression ? progression.name : 'Unknown';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {isEditingName ? (
          <View style={styles.nameEditContainer}>
            <TextInput
              style={styles.nameInput}
              value={tempName}
              onChangeText={setTempName}
              autoFocus
              onBlur={handleNameChange}
              onSubmitEditing={handleNameChange}
            />
          </View>
        ) : (
          <Pressable style={styles.nameContainer} onPress={() => setIsEditingName(true)}>
            <Text style={styles.title}>{song.name}</Text>
            <Edit size={16} color={colors.textSecondary} style={styles.editIcon} />
          </Pressable>
        )}
      </View>
      
      <View style={styles.positionDisplay}>
        <Text style={styles.positionText}>
          BAR: {currentPosition.bar}
        </Text>
        <Text style={styles.positionText}>
          BEAT: {currentPosition.beat}
        </Text>
      </View>
      
      <View style={styles.transportControls}>
        <Pressable style={styles.transportButton} onPress={handleRewind}>
          <SkipBack size={24} color={colors.text} />
        </Pressable>
        
        <Pressable style={styles.transportButton} onPress={handlePlayPause}>
          {isPlaying ? (
            <Pause size={32} color={colors.text} />
          ) : (
            <Play size={32} color={colors.text} />
          )}
        </Pressable>
        
        <Pressable style={styles.transportButton} onPress={handleForward}>
          <SkipForward size={24} color={colors.text} />
        </Pressable>
      </View>
      
      <ScrollView style={styles.sectionsContainer}>
        {song.sections.length > 0 ? (
          song.sections.map((section, index) => (
            <View key={section.id} style={styles.sectionItem}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionName}>
                  {index + 1}. {section.name}
                </Text>
                
                <View style={styles.sectionControls}>
                  <View style={styles.repeatControl}>
                    <Text style={styles.repeatLabel}>Repeat:</Text>
                    <View style={styles.repeatButtons}>
                      <Pressable
                        style={styles.repeatButton}
                        onPress={() => handleRepeatChange(index, 'decrease')}
                        disabled={section.repeat <= 1}
                      >
                        <ChevronDown size={16} color={colors.text} />
                      </Pressable>
                      
                      <Text style={styles.repeatValue}>{section.repeat}</Text>
                      
                      <Pressable
                        style={styles.repeatButton}
                        onPress={() => handleRepeatChange(index, 'increase')}
                      >
                        <ChevronUp size={16} color={colors.text} />
                      </Pressable>
                    </View>
                  </View>
                  
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => onRemoveSection(index)}
                  >
                    <Trash2 size={16} color={colors.error} />
                  </Pressable>
                </View>
              </View>
              
              <View style={styles.progressionInfo}>
                <Text style={styles.progressionName}>
                  {getProgressionName(section.progressionId)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            Add progressions to build your song structure
          </Text>
        )}
      </ScrollView>
      
      <View style={styles.footer}>
        <Pressable style={styles.addButton} onPress={onAddSection}>
          <Plus size={20} color={colors.text} />
          <Text style={styles.buttonText}>Add Section</Text>
        </Pressable>
        
        <Pressable style={styles.saveButton} onPress={onSave}>
          <Save size={20} color={colors.text} />
          <Text style={styles.buttonText}>Save Song</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameEditContainer: {
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 8,
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  editIcon: {
    marginLeft: 8,
  },
  positionDisplay: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  positionText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  transportControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  transportButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionsContainer: {
    flex: 1,
    marginBottom: 16,
  },
  sectionItem: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repeatControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  repeatLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    marginRight: 4,
  },
  repeatButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 4,
  },
  repeatButton: {
    padding: 4,
  },
  repeatValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  deleteButton: {
    padding: 4,
  },
  progressionInfo: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    padding: 8,
  },
  progressionName: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  emptyText: {
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  addButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.text,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});