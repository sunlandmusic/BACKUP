import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/colors';
import { InstrumentType, FlamValue } from '@/types/music';
import { Music } from 'lucide-react-native';

interface InstrumentSelectorProps {
  currentInstrument: InstrumentType;
  onInstrumentChange: (instrument: InstrumentType) => void;
  flamValue: string;
  onFlamChange: (value: string) => void;
}

export const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({
  currentInstrument,
  onInstrumentChange,
  flamValue,
  onFlamChange
}) => {
  // Define available instruments
  const instruments: { type: InstrumentType; label: string }[] = [
    { type: 'balafon', label: 'BALAFON' },
    { type: 'sine', label: 'SINE' },
    { type: 'rhodes', label: 'RHODES' },
    { type: 'piano', label: 'PIANO' },
    { type: 'steel_drum', label: 'STEEL DRUM' },
    { type: 'synth', label: 'SYNTH' },
    { type: 'pad', label: 'PAD' },
    { type: 'guitar', label: 'GUITAR' },
  ];

  const flamOptions = ['OFF', '1/192', '1/96', '1/64', '1/48', '1/32', '1/24', '1/16'];

  const handleFlamCycle = () => {
    const currentIndex = flamOptions.indexOf(flamValue.toUpperCase());
    const nextIndex = (currentIndex + 1) % flamOptions.length;
    onFlamChange(flamOptions[nextIndex]);
  };

  return (
    <View style={[styles.container, { marginTop: 5 }]}>
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
      
      <View style={styles.flamSection}>
        <View style={styles.flamLabelContainer}>
          <Text style={styles.flamLabelText}>FLAM</Text>
        </View>
        <Pressable 
          style={[
            styles.flamValueWindow,
            flamValue !== 'OFF' && styles.flamValueWindowActive
          ]}
          onPress={handleFlamCycle}
        >
          <Text style={styles.flamValueText}>{flamValue.toUpperCase()}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
    marginLeft: -60,
    width: 400,
  },
  section: {
    marginBottom: 24,
  },
  instrumentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '100%',
    gap: 8,
  },
  instrumentButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    width: 147,
    marginBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 45,
  },
  selectedInstrumentButton: {
    backgroundColor: colors.primary,
  },
  instrumentButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedInstrumentButtonText: {
    color: '#FFFFFF',
  },
  flamSection: {
    position: 'absolute',
    left: 359,
    top: 50,
    alignItems: 'center',
  },
  flamLabelContainer: {
    marginBottom: 12,
    marginLeft: -2,
  },
  flamLabelText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'left',
  },
  flamValueWindow: {
    width: 75,
    height: 75,
    backgroundColor: '#333333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  flamValueWindowActive: {
    backgroundColor: colors.primary,
    borderColor: colors.text,
  },
  flamValueText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
});