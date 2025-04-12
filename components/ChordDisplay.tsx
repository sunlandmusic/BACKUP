import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/colors';
import { Chord, MusicMode, NoteName, ChordType } from '@/types/music';

interface ChordDisplayProps {
  chord: Chord | null;
  keySignature: NoteName;
  mode: MusicMode;
  inversion: number;
  voicing: number;
  octave: number;
  onChordChartPress?: () => void;
}

export const ChordDisplay: React.FC<ChordDisplayProps> = ({
  chord,
  keySignature,
  mode,
  inversion,
  voicing,
  octave,
  onChordChartPress
}) => {
  // Get chord display name
  const getChordDisplayName = () => {
    if (!chord) return '';
    
    let displayName = chord.root;
    
    switch (chord.type) {
      case 'major': displayName += ''; break;
      case 'minor': displayName += 'm'; break;
      case 'diminished': displayName += 'dim'; break;
      case 'augmented': displayName += 'aug'; break;
      case 'dominant7': displayName += '7'; break;
      case 'dominant9': displayName += '9'; break;
      case 'major7': displayName += 'maj7'; break;
      case 'minor7': displayName += 'm7'; break;
      case 'major9': displayName += 'maj9'; break;
      case 'minor9': displayName += 'm9'; break;
      case 'sus2': displayName += 'sus2'; break;
      case 'sus4': displayName += 'sus4'; break;
      case 'add9': displayName += 'add9'; break;
      case 'm7b5': displayName += 'm7b5'; break;
      case 'm11': displayName += 'm11'; break;
      case 'dim': displayName += 'dim'; break;
      case 'dim7': displayName += 'dim7'; break;
      case 'user': displayName += 'user'; break;
      default: displayName += ''; break;
    }
    
    // Add slash notation for bass note if different from root
    if (chord.bassNote && chord.bassNote !== chord.root) {
      displayName += `/${chord.bassNote}`;
    }
    
    return displayName;
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>KEY/MODE</Text>
        <Text style={styles.keyValue}>{keySignature}</Text>
        <Text style={styles.modeValue}>{mode.toUpperCase()}</Text>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.section}>
        <Text style={styles.label}>CHORD</Text>
        <Text style={styles.chordValue}>{getChordDisplayName()}</Text>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.section}>
        <Text style={styles.label}>INVERSION:</Text>
        <Text style={styles.paramValue}>{inversion}</Text>
        <Text style={styles.label}>VOICING:</Text>
        <Text style={styles.paramValue}>{voicing}</Text>
        <Text style={styles.label}>OCTAVE:</Text>
        <Text style={styles.paramValue}>{octave > 0 ? `+${octave}` : octave}</Text>
      </View>
      
      <View style={styles.divider} />
      
      <Pressable style={styles.chartSection} onPress={onChordChartPress}>
        <Text style={styles.label}>KEYS/STR</Text>
        <View style={styles.chartPreview}>
          <View style={styles.chartGrid}>
            <View style={styles.chartLine} />
            <View style={styles.chartLine} />
            <View style={styles.chartLine} />
            <View style={styles.chartLine} />
            <View style={styles.chartLine} />
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  section: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  keyValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  modeValue: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  chordValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  paramValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chartSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  chartPreview: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartGrid: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  chartLine: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
  },
});