import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/colors';
import { ChordProgression } from '@/types/music';
import { ChordButton } from './ChordButton';
import { Play, Edit, Trash2 } from 'lucide-react-native';
import { playProgression } from '@/utils/audio-utils';

interface ProgressionCardProps {
  progression: ChordProgression;
  onEdit: (progression: ChordProgression) => void;
  onDelete: (id: string) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}

export const ProgressionCard: React.FC<ProgressionCardProps> = ({
  progression,
  onEdit,
  onDelete,
  onSelect,
  isSelected = false
}) => {
  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Handle playing the progression
  const handlePlay = () => {
    if (progression.chords.length === 0) return;
    
    // Extract notes from each chord
    const chordNotes = progression.chords.map(chord => chord.notes);
    
    // Play the progression
    playProgression(chordNotes, progression.tempo);
  };

  return (
    <View style={[
      styles.container,
      isSelected && styles.selectedContainer
    ]}>
      <View style={styles.header}>
        <Text style={styles.title}>{progression.name}</Text>
        <Text style={styles.subtitle}>
          Key: {progression.key} | {progression.timeSignature[0]}/{progression.timeSignature[1]} | {progression.tempo} BPM
        </Text>
      </View>
      
      {/* Chord preview */}
      <View style={styles.chordsPreview}>
        {progression.chords.length > 0 ? (
          progression.chords.slice(0, 4).map((chord, index) => (
            <ChordButton
              key={`${chord.id}-${index}`}
              chord={chord}
              onPress={() => {}}
              size="small"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>No chords in this progression</Text>
        )}
        
        {progression.chords.length > 4 && (
          <Text style={styles.moreText}>+{progression.chords.length - 4} more</Text>
        )}
      </View>
      
      {/* Footer with metadata and actions */}
      <View style={styles.footer}>
        <Text style={styles.date}>
          Last updated: {formatDate(progression.updatedAt)}
        </Text>
        
        <View style={styles.actions}>
          {onSelect && (
            <Pressable
              style={[styles.actionButton, styles.selectButton]}
              onPress={() => onSelect(progression.id)}
            >
              <Text style={styles.selectButtonText}>Select</Text>
            </Pressable>
          )}
          
          <Pressable
            style={styles.actionButton}
            onPress={handlePlay}
            disabled={progression.chords.length === 0}
          >
            <Play size={20} color={colors.text} />
          </Pressable>
          
          <Pressable
            style={styles.actionButton}
            onPress={() => onEdit(progression)}
          >
            <Edit size={20} color={colors.text} />
          </Pressable>
          
          <Pressable
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onDelete(progression.id)}
          >
            <Trash2 size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedContainer: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  chordsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  emptyText: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  moreText: {
    color: colors.textSecondary,
    alignSelf: 'center',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  date: {
    color: colors.textMuted,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 8,
    marginLeft: 8,
  },
  selectButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
  },
  selectButtonText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
});