import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PianoXL } from '@/components/PianoXLScreen';
import { colors } from '@/constants/colors';

export default function PianoXLScreen() {
  return (
    <View style={styles.container}>
      <PianoXL />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
}); 