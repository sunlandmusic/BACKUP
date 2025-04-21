import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/colors';

type SettingType = 'bpm' | 'bars' | 'key' | 'mode' | 'octave' | 'inversion';

interface SettingsPanelIndexProps {
  mode: string;
  octave: number;
  chord: string;
  selectedKey: string;
  inversion: number;
  selectedSetting?: SettingType;
  onSettingSelect?: (setting: SettingType | '') => void;
}

export function SettingsPanelIndex({
  mode,
  octave,
  chord,
  selectedKey,
  inversion,
  selectedSetting,
  onSettingSelect
}: SettingsPanelIndexProps) {
  const renderModeWithAlternateName = (mode: string) => {
    const upperMode = mode.toUpperCase();
    let alternateName = '';
    
    switch (upperMode) {
      case 'MAJOR': alternateName = 'IONIAN'; break;
      case 'MINOR': alternateName = 'AEOLIAN'; break;
      case 'DORIAN': alternateName = '2ND MODE'; break;
      case 'PHRYGIAN': alternateName = '3RD MODE'; break;
      case 'LYDIAN': alternateName = '4TH MODE'; break;
      case 'MIXOLYDIAN': 
        return (
          <View style={styles.modeValueContainer}>
            <Text style={styles.settingValue}>MIXO</Text>
            <Text style={styles.alternateModeName}>LYDIAN</Text>
          </View>
        );
      case 'LOCRIAN': alternateName = '7TH MODE'; break;
      default: break;
    }

    return (
      <View style={styles.modeValueContainer}>
        <Text style={styles.settingValue}>{upperMode}</Text>
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
  ) => (
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
      <Text style={styles.settingLabel}>{label}</Text>
      {settingKey === 'mode' ? (
        renderModeWithAlternateName(value.toString())
      ) : (
        <Text style={[
          styles.settingValue,
          isChord && styles.chordValue
        ]}>
          {value}
        </Text>
      )}
    </Pressable>
  );

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
    flex: 0.6,
    width: 90,
    minWidth: 0,
    padding: 0,
    margin: 0,
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
  modeValueContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
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