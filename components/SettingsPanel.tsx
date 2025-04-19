import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

interface SettingsPanelProps {
  mode: string;
  octave: number;
  chord: string;
  selectedKey: string;
  selectedSetting?: 'bpm' | 'bars' | undefined;
}

export function SettingsPanel({
  mode,
  octave,
  chord,
  selectedKey,
  selectedSetting
}: SettingsPanelProps) {
  const renderSettingItem = (
    label: string,
    value: string | number,
    settingKey?: 'bpm' | 'bars',
    isChord: boolean = false
  ) => (
    <View style={[
      styles.settingItem,
      isChord && styles.chordItem,
      settingKey && selectedSetting === settingKey && styles.selectedSetting
    ]}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={[
        styles.settingValue,
        isChord && styles.chordValue
      ]}>
        {value}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderSettingItem('KEY', selectedKey)}
      {renderSettingItem('MODE', mode.toUpperCase())}
      {renderSettingItem('OCT', octave)}
      {renderSettingItem('CHORD', chord, undefined, true)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 5,
    height: 67,
    marginTop: -50,
  },
  settingItem: {
    flex: 1,
    alignItems: 'center',
    padding: 5,
    borderRadius: 4,
    justifyContent: 'center',
  },
  chordItem: {
    flex: 2,
  },
  selectedSetting: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 2,
  },
  settingValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '400',
  },
  chordValue: {
    fontSize: 28,
  },
}); 