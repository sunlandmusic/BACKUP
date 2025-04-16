import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/colors';
import { Song } from '@/types/music';
import { Play, Edit, Trash2 } from 'lucide-react-native';

interface SongCardProps {
  song: Song;
  onEdit: (song: Song) => void;
  onDelete: (id: string) => void;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  onEdit,
  onDelete,
}) => {
  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Format instrument name
  const formatInstrumentName = (name: string): string => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{song.name}</Text>
        <Text style={styles.subtitle}>
          {song.sections.length} sections | {song.progressions.length} progressions
        </Text>
      </View>
      
      {/* Sections preview */}
      <View style={styles.sectionsPreview}>
        {song.sections.length > 0 ? (
          song.sections.slice(0, 3).map((section, index) => (
            <View key={section.id} style={styles.sectionBadge}>
              <Text style={styles.sectionText}>
                {section.name} {section.repeat > 1 ? `(x${section.repeat})` : ''}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No sections in this song</Text>
        )}
        
        {song.sections.length > 3 && (
          <Text style={styles.moreText}>+{song.sections.length - 3} more</Text>
        )}
      </View>
      
      {/* Sound info */}
      <View style={styles.soundInfo}>
        <Text style={styles.soundInfoText}>
          Sound: {formatInstrumentName(song.instrument)} | Flam: {song.flamValue}
        </Text>
      </View>
      
      {/* Footer with metadata and actions */}
      <View style={styles.footer}>
        <Text style={styles.date}>
          Last updated: {formatDate(song.updatedAt)}
        </Text>
        
        <View style={styles.actions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => {}}
            disabled={song.sections.length === 0}
          >
            <Play size={20} color={colors.text} />
          </Pressable>
          
          <Pressable
            style={styles.actionButton}
            onPress={() => onEdit(song)}
          >
            <Edit size={20} color={colors.text} />
          </Pressable>
          
          <Pressable
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onDelete(song.id)}
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
  sectionsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  sectionBadge: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  sectionText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 12,
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
  soundInfo: {
    marginBottom: 12,
  },
  soundInfoText: {
    color: colors.textSecondary,
    fontSize: 14,
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
  deleteButton: {
    backgroundColor: colors.error,
  },
});