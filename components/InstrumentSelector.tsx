import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/colors';
import { FlamValue, InstrumentType } from '@/types/music';
import { Music, Zap } from 'lucide-react-native';

interface InstrumentSelectorProps {
  currentInstrument: InstrumentType;
  currentFlamValue: FlamValue;
  onInstrumentChange: (instrument: InstrumentType) => void;
  onFlamValueChange: (flamValue: FlamValue) => void;
}

export const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({
  currentInstrument,
  currentFlamValue,
  onInstrumentChange,
  onFlamValueChange
}) => {
  // Define available instruments
  const instruments: { type: InstrumentType; label: string }[] = [
    { type: 'balafon', label: 'Balafon' },
    { type: 'piano', label: 'Piano' },
    { type: 'synth', label: 'Synth' },
    { type: 'guitar', label: 'Guitar' },
    { type: 'strings', label: 'Strings' },
    { type: 'brass', label: 'Brass' },
  ];

  // Define flam values
  const flamValues: { value: FlamValue; label: string }[] = [
    { value: 'off', label: 'Off' },
    { value: '1/32', label: '1/32' },
    { value: '1/16', label: '1/16' },
    { value: '1/8', label: '1/8' },
    { value: '1/4', label: '1/4' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={styles.instrumentGrid}>
          {instruments.map((instrument) => (
            <Pressable
              key={instrument.type}
              style={[
                styles.instrumentButton,
                currentInstrument === instrument.type && styles.selectedInstrumentButton
              ]}
              onPress={() => onInstrumentChange(instrument.type)}
            >
              <Text style={[
                styles.instrumentButtonText,
                currentInstrument === instrument.type && styles.selectedInstrumentButtonText
              ]}>
                {instrument.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Zap size={20} color={colors.text} />
          <Text style={styles.sectionTitle}>FLAM</Text>
        </View>
        
        <View style={styles.flamRow}>
          {flamValues.map((flam) => (
            <Pressable
              key={flam.value}
              style={[
                styles.flamButton,
                currentFlamValue === flam.value && styles.selectedFlamButton
              ]}
              onPress={() => onFlamValueChange(flam.value)}
            >
              <Text style={[
                styles.flamButtonText,
                currentFlamValue === flam.value && styles.selectedFlamButtonText
              ]}>
                {flam.label}
              </Text>
            </Pressable>
          ))}
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
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  instrumentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  instrumentButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    width: '48%',
    alignItems: 'center',
  },
  selectedInstrumentButton: {
    backgroundColor: colors.primary,
  },
  instrumentButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectedInstrumentButtonText: {
    color: colors.textOffWhite,
  },
  flamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flamButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 0,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  selectedFlamButton: {
    backgroundColor: colors.primary,
  },
  flamButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectedFlamButtonText: {
    color: colors.textOffWhite,
  },
});