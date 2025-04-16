import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/colors';
import { InstrumentType } from '@/types/music';
import { Music } from 'lucide-react-native';

interface InstrumentSelectorProps {
  currentInstrument: InstrumentType;
  onInstrumentChange: (instrument: InstrumentType) => void;
}

export const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({
  currentInstrument,
  onInstrumentChange
}) => {
  // Define available instruments
  const instruments: { type: InstrumentType; label: string }[] = [
    { type: 'balafon', label: 'BALAFON' },
    { type: 'piano', label: 'PIANO' },
    { type: 'rhodes', label: 'RHODES' },
    { type: 'pluck', label: 'PLUCK' },
    { type: 'pad', label: 'PAD' },
    { type: 'steel_drum', label: 'STEEL DRUM' },
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
  }
});