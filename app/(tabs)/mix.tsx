import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/constants/colors';
import { useChordStore } from '@/stores/chord-store';
import { InstrumentType } from '@/types/music';
import { playChord, stopChord, initAudio, setEqBand, setSampleStart, setSustain } from '@/utils/audio-utils';
import { createChord } from '@/utils/chord-utils';
import { Eye } from "lucide-react-native";
import { router } from "expo-router";

// Update the control text displays to show values more prominently
const ControlText = ({ label, value, unit }: { label: string; value: number; unit: string }) => (
  <View>
    <Text style={styles.controlLabel}>{label}</Text>
    <Text style={styles.controlValue}>
      {value >= 0 && unit === 'dB' ? '+' : ''}{value}{unit}
    </Text>
  </View>
);

export default function MixScreen() {
  const { currentInstrument, setCurrentInstrument } = useChordStore();
  
  // Add menu visibility state
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Sound control states
  const [sampleStart, setSampleStart] = useState<number>(0); // 0-100 ms
  const [sustain, setSustain] = useState<number>(100); // percentage of original duration
  const [eqLow, setEqLow] = useState<number>(0); // -12 to +12 dB
  const [eqMid, setEqMid] = useState<number>(0); // -12 to +12 dB
  const [eqHigh, setEqHigh] = useState<number>(0); // -12 to +12 dB
  
  // Control selection states
  const [selectedControl, setSelectedControl] = useState<'start' | 'sustain' | 'eq_low' | 'eq_mid' | 'eq_high' | ''>('');
  const [isSoundWindowSelected, setIsSoundWindowSelected] = useState(false);
  const [selectedSound, setSelectedSound] = useState<InstrumentType>(currentInstrument);

  // Available instruments
  const availableSounds: InstrumentType[] = ['balafon', 'piano', 'rhodes', 'steel_drum', 'pluck', 'pad'];

  // Add state for long press
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const acceleratedTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio with EQ
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await initAudio();
        // Initialize EQ with current values
        await setEqBand('low', eqLow);
        await setEqBand('mid', eqMid);
        await setEqBand('high', eqHigh);
        await setSampleStart(sampleStart);
        await setSustain(sustain);
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    };
    
    setupAudio();
    
    return () => {
      stopChord().catch(console.error);
    };
  }, []);

  // Handle control selection
  const handleControlSelect = (control: 'start' | 'sustain' | 'eq_low' | 'eq_mid' | 'eq_high' | '') => {
    if (control === selectedControl) {
      setSelectedControl('');
    } else {
      setSelectedControl(control);
      setIsSoundWindowSelected(false);
    }
  };

  // Handle sound selection
  const handleSoundSelect = () => {
    if (isSoundWindowSelected) {
      setIsSoundWindowSelected(false);
    } else {
      setIsSoundWindowSelected(true);
      setSelectedControl('');
    }
  };

  // Handle long press start
  const handlePressIn = (direction: 'up' | 'down') => {
    // Initial press triggers normal adjustment and plays test chord
    handleAdjustValue(direction, true);

    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      // Start accelerated adjustments (no test chord during acceleration)
      acceleratedTimer.current = setInterval(() => {
        handleAdjustValue(direction, false);
      }, 50); // Adjust every 50ms when long pressing
    }, 500); // Start acceleration after 500ms
  };

  // Handle press out
  const handlePressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (acceleratedTimer.current) {
      clearInterval(acceleratedTimer.current);
      acceleratedTimer.current = null;
    }
    setIsLongPressing(false);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (acceleratedTimer.current) clearInterval(acceleratedTimer.current);
    };
  }, []);

  // Function to apply EQ changes
  const applyEqChange = async (control: string, value: number) => {
    try {
      switch (control) {
        case 'eq_low':
          await setEqBand('low', value);
          break;
        case 'eq_mid':
          await setEqBand('mid', value);
          break;
        case 'eq_high':
          await setEqBand('high', value);
          break;
      }
    } catch (error) {
      console.error('Error applying EQ change:', error);
    }
  };

  // Update handleAdjustValue to handle all audio parameter changes
  const handleAdjustValue = async (direction: 'up' | 'down', playTestChord: boolean = false) => {
    const step = direction === 'up' ? 1 : -1;
    const baseMultiplier = isLongPressing ? 5 : 1;
    
    try {
      if (isSoundWindowSelected) {
        setSelectedSound(prev => {
          const currentIndex = availableSounds.indexOf(prev);
          const newIndex = direction === 'up' 
            ? (currentIndex + 1) % availableSounds.length
            : (currentIndex - 1 + availableSounds.length) % availableSounds.length;
          const newSound = availableSounds[newIndex];
          setCurrentInstrument(newSound);
          return newSound;
        });
        return;
      }

      switch (selectedControl) {
        case 'start': {
          const stepSize = 10 * baseMultiplier;
          setSampleStart(prev => {
            const newStartValue = Math.max(0, Math.min(500, prev + (step * stepSize)));
            if (playTestChord) {
              setTimeout(() => {
                const testChord = createChord('C', 'major', 4);
                if (testChord) playChord(testChord.notes);
              }, 0);
            }
            return newStartValue;
          });
          await setSampleStart(sampleStart + (step * stepSize));
          break;
        }
        case 'sustain': {
          const stepSize = 5 * baseMultiplier;
          setSustain(prev => {
            const newSustainValue = Math.max(10, Math.min(200, prev + (step * stepSize)));
            if (playTestChord) {
              setTimeout(() => {
                const testChord = createChord('C', 'major', 4);
                if (testChord) playChord(testChord.notes);
              }, 0);
            }
            return newSustainValue;
          });
          await setSustain(sustain + (step * stepSize));
          break;
        }
        case 'eq_low':
        case 'eq_mid':
        case 'eq_high': {
          const setEq = selectedControl === 'eq_low' ? setEqLow : 
                       selectedControl === 'eq_mid' ? setEqMid : setEqHigh;
          const currentValue = selectedControl === 'eq_low' ? eqLow : 
                             selectedControl === 'eq_mid' ? eqMid : eqHigh;
          const stepSize = baseMultiplier;
          setEq(prev => {
            const newEqValue = Math.max(-12, Math.min(12, prev + (step * stepSize)));
            if (playTestChord) {
              setTimeout(() => {
                const testChord = createChord('C', 'major', 4);
                if (testChord) playChord(testChord.notes);
              }, 0);
            }
            return newEqValue;
          });
          await setEqBand(
            selectedControl.split('_')[1] as 'low' | 'mid' | 'high',
            currentValue + (step * stepSize)
          );
          break;
        }
      }
    } catch (error) {
      console.error('Error adjusting value:', error);
    }
  };

  // Handle test chord
  const handleTestChord = () => {
    const testChord = createChord('C', 'major', 4);
    if (testChord) {
      playChord(testChord.notes);
    }
  };

  // Format instrument name helper
  const formatInstrumentName = (name: InstrumentType): string => {
    if (name === 'steel_drum') return 'STEEL DRUM';
    return name.toUpperCase();
  };

  // Add navigation menu component import and usage
  const handleEyePress = () => {
    router.back(); // This will navigate back to the previous screen
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Eye button */}
      <Pressable style={styles.eyeButton} onPress={handleEyePress}>
        <Eye size={28} color={colors.text} />
      </Pressable>

      {/* Title */}
      <Text style={styles.title}>MIX</Text>

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.controlsContainer}>
          {/* Main controls */}
          <View style={styles.mainControls}>
            {/* Instrument selector */}
            <Pressable 
              style={[
                styles.controlWindow,
                isSoundWindowSelected && styles.controlWindowSelected
              ]}
              onPress={handleSoundSelect}
            >
              <Text style={styles.controlText}>{formatInstrumentName(selectedSound)}</Text>
            </Pressable>

            {/* Start time control */}
            <Pressable 
              style={[
                styles.controlWindow,
                selectedControl === 'start' && styles.controlWindowSelected
              ]}
              onPress={() => handleControlSelect('start')}
            >
              <ControlText label="START" value={sampleStart} unit="ms" />
            </Pressable>

            {/* Sustain control */}
            <Pressable 
              style={[
                styles.controlWindow,
                selectedControl === 'sustain' && styles.controlWindowSelected
              ]}
              onPress={() => handleControlSelect('sustain')}
            >
              <ControlText label="SUSTAIN" value={sustain} unit="%" />
            </Pressable>

            {/* Low EQ control */}
            <Pressable 
              style={[
                styles.controlWindow,
                selectedControl === 'eq_low' && styles.controlWindowSelected
              ]}
              onPress={() => handleControlSelect('eq_low')}
            >
              <ControlText label="LOW" value={eqLow} unit="dB" />
            </Pressable>
          </View>

          {/* Side EQ controls */}
          <View style={styles.sideEQControls}>
            {/* Mid EQ control */}
            <Pressable 
              style={[
                styles.controlWindow,
                selectedControl === 'eq_mid' && styles.controlWindowSelected
              ]}
              onPress={() => handleControlSelect('eq_mid')}
            >
              <ControlText label="MID" value={eqMid} unit="dB" />
            </Pressable>

            {/* High EQ control */}
            <Pressable 
              style={[
                styles.controlWindow,
                selectedControl === 'eq_high' && styles.controlWindowSelected
              ]}
              onPress={() => handleControlSelect('eq_high')}
            >
              <ControlText label="HIGH" value={eqHigh} unit="dB" />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Test chord button - updated to play on press */}
      <Pressable 
        style={styles.testButton}
        onPressIn={handleTestChord}
        onPressOut={stopChord}
      >
        <Text style={styles.testButtonText}>TEST CHORD</Text>
      </Pressable>

      {/* Plus/Minus buttons - updated with long press handling */}
      <View style={styles.plusMinusContainer}>
        <Pressable 
          style={styles.plusButton}
          onPressIn={() => handlePressIn('up')}
          onPressOut={handlePressOut}
        >
          <Text style={styles.plusMinusText}>+</Text>
        </Pressable>
        
        <Pressable 
          style={styles.minusButton}
          onPressIn={() => handlePressIn('down')}
          onPressOut={handlePressOut}
        >
          <Text style={styles.plusMinusText}>-</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '500',
    position: 'absolute',
    top: 20,
    left: 120,
  },
  scrollContainer: {
    flex: 1,
  },
  controlsContainer: {
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  mainControls: {
    gap: 12,
  },
  sideEQControls: {
    position: 'absolute',
    top: 80, // Changed from 280 to 80 (raised by another 200)
    left: 190, // Changed from 140 to 190 (moved right by 50 more)
    gap: 12,
  },
  controlWindow: {
    width: 132,
    height: 50,
    backgroundColor: colors.buttonGrey,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  controlWindowSelected: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
  },
  controlLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  controlValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  controlText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  testButton: {
    position: 'absolute',
    bottom: 40,
    left: 220,
    width: 132,
    height: 44,
    backgroundColor: colors.buttonGrey,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  plusMinusContainer: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -150 }],
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    height: 300,
  },
  plusButton: {
    width: 40,
    height: 140,
    borderRadius: 8,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  minusButton: {
    width: 40,
    height: 140,
    borderRadius: 8,
    backgroundColor: colors.buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  plusMinusText: {
    color: colors.textOffWhite,
    fontSize: 28,
    fontWeight: 'bold',
  },
  eyeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
}); 