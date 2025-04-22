import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ChordSelector } from './src/components/ChordSelector';
import { Piano } from './src/components/Piano';
import { ProgressionBuilder } from './src/components/ProgressionBuilder';
import { NavigationMenu } from './src/components/NavigationMenu';
import { UtilButton } from './src/components/UtilButton';

const Tab = createBottomTabNavigator();

// Wrapper components
const ChordSelectorScreen = () => {
  const handleSoundsPress = () => {
    // Handle sounds button press
  };

  const handleUChordPress = () => {
    // Handle user chord button press
  };

  const handleScanPress = () => {
    // Handle scan button press
  };

  const handleSessionPress = () => {
    // Handle session button press
  };

  return (
    <View style={styles.screenContainer}>
      <ChordSelector onSelectChord={() => {}} />
      <View style={styles.utilButtonContainer}>
        <UtilButton
          onSoundsPress={handleSoundsPress}
          onUChordPress={handleUChordPress}
          onScanPress={handleScanPress}
          onSessionPress={handleSessionPress}
        />
      </View>
    </View>
  );
};

const PianoScreen = () => (
  <Piano />
);

const ProgressionBuilderScreen = () => (
  <ProgressionBuilder 
    progression={[]}
    onUpdateProgression={() => {}}
    onSaveProgression={() => {}}
  />
);

const NavigationMenuScreen = () => (
  <NavigationMenu 
    visible={true}
    onClose={() => {}}
    currentRoute="Menu"
  />
);

export default function App() {
  return (
    <NavigationContainer>
      <View style={styles.container}>
        <Tab.Navigator>
          <Tab.Screen name="Chords" component={ChordSelectorScreen} />
          <Tab.Screen name="Piano" component={PianoScreen} />
          <Tab.Screen name="Progressions" component={ProgressionBuilderScreen} />
          <Tab.Screen name="Menu" component={NavigationMenuScreen} />
        </Tab.Navigator>
        <StatusBar style="auto" />
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  screenContainer: {
    flex: 1,
    position: 'relative',
  },
  utilButtonContainer: {
    position: 'absolute',
    bottom: 20,
    right: 60,
  },
});
