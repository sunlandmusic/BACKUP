import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/colors';

type SettingType = 'bpm' | 'bars' | 'key' | 'mode' | 'octave' | 'inversion';

interface SettingsPanelProps {
  mode: string;
  octave: number;
  chord: string;
  selectedKey: string;
  inversion: number;
  selectedSetting?: SettingType;
  onSettingSelect?: (setting: SettingType | '') => void;
}

export function SettingsPanel({
  mode,
  octave,
  chord,
  selectedKey,
  inversion,
  selectedSetting,
  onSettingSelect
}: SettingsPanelProps) {
  const renderModeWithAlternateName = (mode: string) => {
    const upperMode = mode.toUpperCase();
    let mainText = '';
    let alternateName = '';
    
    // Handle modes with alternate names
    switch (upperMode) {
      case 'OFF': 
        mainText = '';  // Remove MODE from here since it's handled by the label
        alternateName = 'OFF';
        break;
      case 'MAJOR': 
        mainText = 'MAJOR';
        alternateName = 'IONIAN';
        break;
      case 'MINOR': 
        mainText = 'MINOR';
        alternateName = 'AEOLIAN';
        break;
      case 'MIXOLYDIAN': 
        mainText = 'MIXO';
        alternateName = 'LYDIAN';
        break;
      case 'PHRYGIAN':
        mainText = 'PHRYG';
        alternateName = 'IAN';
        break;
      default: 
        mainText = upperMode;
        break;
    }

    return (
      <View style={styles.modeValueContainer}>
        {mainText && <Text style={styles.settingValue}>{mainText}</Text>}
        {alternateName && (
          <Text style={styles.alternateModeName}>{alternateName}</Text>
        )}
      </View>
    );
  };

  const renderSettingItem = (
    label: string,
    value: string | number,
    settingKey?: SettingType,
    isChord: boolean = false
  ) => {
    // Add dynamic font size calculation for chord display
    const getChordFontSize = (chordName: string) => {
      const length = chordName.length;
      if (length <= 5) return 28;
      if (length <= 7) return 24;
      if (length <= 9) return 20;
      return 16;
    };

    return (
      <Pressable 
        style={[
          styles.settingItem,
          isChord && styles.chordItem,
          settingKey === 'mode' && styles.modeItem,
          (settingKey === 'key' || settingKey === 'octave' || settingKey === 'inversion') && styles.keyItem,
          settingKey && selectedSetting === settingKey && styles.selectedSetting
        ]}
        onPress={() => {
          if (settingKey) {
            onSettingSelect?.(selectedSetting === settingKey ? '' : settingKey);
          }
        }}
      >
        {/* Only show MODE label for mode setting when value is OFF */}
        {(settingKey !== 'mode' || value.toString().toUpperCase() === 'OFF') && (
          <Text style={[styles.settingLabel, { fontSize: 15 }]}>{label}</Text>
        )}
        {settingKey === 'mode' ? (
          renderModeWithAlternateName(value.toString())
        ) : (
          <Text style={[
            styles.settingValue,
            { fontSize: 20 },
            isChord && [
              styles.chordValue,
              { fontSize: 20 }
            ]
          ]}>
            {value}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {renderSettingItem('KEY', selectedKey, 'key')}
      {renderSettingItem('MODE', mode, 'mode')}
      {renderSettingItem('OCT', octave, 'octave')}
      {renderSettingItem('INV', inversion, 'inversion')}
      {renderSettingItem('CHORD', chord, undefined, true)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 0,
    height: 67,
  },
  settingItem: {
    flex: 1,
    alignItems: 'center',
    padding: 0,
    borderRadius: 4,
    justifyContent: 'center',
  },
  keyItem: {
    flex: 0.84,
  },
  modeItem: {
    flex: 0,
    width: 102,
    minWidth: 0,
    padding: 2,
    margin: 0,
  },
  chordItem: {
    flex: 2,
    paddingHorizontal: 4, // Add some horizontal padding for longer names
  },
  selectedSetting: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingLabel: {
    color: colors.textSecondary,
    fontSize: 13.8,
    fontWeight: '400',
    marginBottom: 2,
  },
  settingValue: {
    color: colors.text,
    fontSize: 18.4,
    fontWeight: '400',
  },
  chordValue: {
    fontSize: 28, // This will be overridden by dynamic sizing
    textAlign: 'center',
    width: '100%',
  },
  modeValueContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    margin: 0,
  },
  alternateModeName: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
    opacity: 0.8,
    marginTop: 0,
    letterSpacing: 0.5,
  },
}); 