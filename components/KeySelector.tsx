import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { colors } from '@/constants/colors';
import { NoteName, noteNames } from '@/types/music';

interface KeySelectorProps {
  selectedKey: NoteName;
  onSelectKey: (key: NoteName) => void;
}

export const KeySelector: React.FC<KeySelectorProps> = ({
  selectedKey,
  onSelectKey,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Key</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.keySelector}>
        {noteNames.map((note) => (
          <Pressable
            key={note}
            style={[
              styles.keyButton,
              selectedKey === note && styles.selectedKeyButton
            ]}
            onPress={() => onSelectKey(note)}
          >
            <Text
              style={[
                styles.keyButtonText,
                selectedKey === note && styles.selectedKeyButtonText
              ]}
            >
              {note}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  keySelector: {
    flexDirection: 'row',
  },
  keyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    minWidth: 45,
    alignItems: 'center',
  },
  selectedKeyButton: {
    backgroundColor: colors.primary,
  },
  keyButtonText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectedKeyButtonText: {
    color: colors.text,
  },
});