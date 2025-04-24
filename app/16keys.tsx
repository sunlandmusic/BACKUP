import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Eye } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { initAudio, stopChord } from '@/utils/audio-utils';
import { NavigationMenu } from '@/components/NavigationMenu';
import { HorizontalPiano } from '@/components/HorizontalPiano'; // Ensure this import

export default function TwelveKeysScreen() {
  useEffect(() => {
    const setupAudio = async () => {
      await initAudio();
    };
    setupAudio().catch(console.error);
    return () => stopChord();
  }, []);

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.eyeButton}
        onPress={() => setMenuVisible(!menuVisible)}
      >
        <Eye size={24} color={colors.primary} />
      </Pressable>
      
      <NavigationMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
        currentRoute={usePathname()}
      />
      
      <HorizontalPiano /> {/* Use the new piano component */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222222',
    padding: 10,
  },
  // ... other styles ...
});