import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ChordSelector } from './src/components/ChordSelector';
import { Piano } from './src/components/Piano';
import { ProgressionBuilder } from './src/components/ProgressionBuilder';
import { NavigationMenu } from './src/components/NavigationMenu';

const Tab = createBottomTabNavigator();

// Wrapper components
const ChordSelectorScreen = () => (
  <ChordSelector onSelectChord={() => {}} />
);

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
});
