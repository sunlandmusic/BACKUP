// Audio utilities for playing notes and chords
import { Platform } from 'react-native';
import { FlamValue, InstrumentType } from '../types/music';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Tone from 'tone';

// Web Audio API context and oscillators
let audioContext: AudioContext | null = null;
let oscillators: { [key: number]: OscillatorNode } = {};
let gainNodes: { [key: number]: GainNode } = {};

// For native platforms - sound objects
type SoundObjects = {
  [K in InstrumentType]?: Audio.Sound;
} & {
  [key: string]: Audio.Sound | undefined;
};

let soundObjects: SoundObjects = {};
let isAudioInitialized = false;
let clickSound: Audio.Sound | null = null;

// Current instrument type - make it mutable
let currentInstrumentType = 'balafon';
export const getCurrentInstrument = () => currentInstrumentType;

// Current flam value (for chord arpeggiation)
let currentFlamValue: FlamValue = 'off';

// Current BPM for flam synchronization
let currentBpm: number = 120;

// Debug flag - set to true to see detailed logs
const DEBUG_AUDIO = true;

// Log function that only logs when debug is enabled
const logDebug = (...args: any[]) => {
  if (DEBUG_AUDIO) {
    console.log('[AudioUtils]', ...args);
  }
};

// Sound file mapping - using direct require statements
const BALAFON = require('../assets/sounds/BALAFON.mp3');
const PIANO = require('../assets/sounds/PIANO.mp3');
const RHODES = require('../assets/sounds/SYNTH.mp3');  // Using SYNTH for RHODES
const PLUCK = require('../assets/sounds/GUITAR.mp3');  // Using GUITAR for PLUCK
const PAD = require('../assets/sounds/STRINGS.mp3');   // Using STRINGS for PAD
const STEEL_DRUM = require('../assets/sounds/BRASS.mp3'); // Using BRASS for STEEL_DRUM

// Voice click sounds with explicit asset requires
const CLICK_SOUNDS = {
  1: require('/Users/hakimabdulsamad/Desktop/chordcraft-nugesaf/app/assets/click-voice/one.mp3'),
  2: require('/Users/hakimabdulsamad/Desktop/chordcraft-nugesaf/app/assets/click-voice/two.mp3'),
  3: require('/Users/hakimabdulsamad/Desktop/chordcraft-nugesaf/app/assets/click-voice/three.mp3'),
  4: require('/Users/hakimabdulsamad/Desktop/chordcraft-nugesaf/app/assets/click-voice/four.mp3')
};

// Add a new state variable to track if we're currently playing
let isCurrentlyPlaying = false;

let initializationPromise: Promise<boolean> | null = null;
let initializationTimeout: NodeJS.Timeout | null = null;

// Preload sounds for each instrument
const preloadedSounds: { [key: string]: Audio.Sound } = {};

const getMusicalTimings = (bpm: number) => ({
  '1/32': 1000 / (bpm / 60 * 32), // ms at current bpm
  '1/16': 1000 / (bpm / 60 * 16), // ms at current bpm
  '1/8': 1000 / (bpm / 60 * 8),   // ms at current bpm
});

// Force reload all audio
export const forceReloadAudio = async () => {
  try {
    logDebug('Force reloading all audio...');
    
    // First cleanup existing sounds
    await cleanup();
    
    // Reset state
    soundObjects = {};
    isAudioInitialized = false;
    
    // Reinitialize
    await initAudio();
    
    logDebug('Force reload complete');
    return true;
  } catch (error) {
    console.error('Error during force reload:', error);
    return false;
  }
};

// Initialize audio
export const initAudio = async () => {
  if (isAudioInitialized) {
    return true;
  }

  try {
    // Clean up any existing audio resources
    await cleanup();
    
    // Configure audio mode
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      interruptionModeIOS: 1,
      interruptionModeAndroid: 1,
      playThroughEarpieceAndroid: false,
      allowsRecordingIOS: false,
    });

    // Initialize Tone.js with proper context
    await Tone.start();
    const synth = new Tone.Synth().toDestination();
    await synth.triggerAttackRelease("C4", 0.01); // Tiny sound to initialize audio context
    synth.dispose();

    isAudioInitialized = true;
    return true;

  } catch (error) {
    console.error('Audio initialization failed:', error);
    await cleanup();
    isAudioInitialized = false;
    return false;
  }
};

// Play a note
export const playNote = async (midiNote: number) => {
  try {
    if (!isAudioInitialized) {
      const initialized = await initAudio();
      if (!initialized) {
        throw new Error('Failed to initialize audio');
      }
    }

    // Create a synth for this note
    const synth = new Tone.Synth({
      oscillator: {
        type: "sine"
      },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 1
      }
    }).toDestination();
    
    // Set volume
    synth.volume.value = -12;
    
    // Play the note using MIDI note number directly
    await synth.triggerAttackRelease(midiNote, 0.5);

    // Clean up after 1 second
    setTimeout(() => {
      synth.dispose();
    }, 1000);

  } catch (e) {
    console.error('Error playing note:', e);
    isAudioInitialized = false;
    await initAudio();
  }
};

// Stop a specific note
export const stopNote = async (midiNote: number) => {
  const noteKey = `${currentInstrumentType}_${midiNote}`;
  const noteSound = soundObjects[noteKey];
  
  if (noteSound) {
    // Just remove it from soundObjects - let the timeout handle cleanup
    delete soundObjects[noteKey];
  }
};

// Play a chord
export const playChord = async (midiNotes: number[]) => {
  try {
    if (!isAudioInitialized) {
      const initialized = await initAudio();
      if (!initialized) {
        throw new Error('Failed to initialize audio');
      }
    }

    // Create a polyphonic synth with specific settings
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "sine"
      },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 1
      }
    }).toDestination();

    // Set volume
    synth.volume.value = -12;
    
    // Play the chord using MIDI note numbers directly
    await synth.triggerAttackRelease(midiNotes, 0.5);

    // Clean up after 1 second
    setTimeout(() => {
      synth.dispose();
    }, 1000);

  } catch (e) {
    console.error('Error playing chord:', e);
    isAudioInitialized = false;
    await initAudio();
  }
};

// Keep track of active sounds
const activeSounds: Audio.Sound[] = [];

// Stop all sounds
export const stopAllSounds = async () => {
  const soundsToStop = { ...soundObjects };
  
  // Clear sound objects first
  const baseInstruments = ['balafon', 'piano', 'rhodes', 'pluck', 'pad', 'steel_drum'];
  Object.keys(soundObjects).forEach(key => {
    if (!baseInstruments.includes(key) && !key.startsWith('click')) {
      delete soundObjects[key];
    }
  });
};

// Stop all sounds
export const stopChord = async () => {
  try {
    // Dispose of any existing Tone.js resources
    Tone.context.dispose();
    // Create a new context
    await Tone.start();
    isAudioInitialized = false;
    await initAudio();
  } catch (e) {
    console.error('Error stopping sounds:', e);
  }
};

// Set the instrument type
export const setInstrument = (instrument: InstrumentType) => {
  // This function is now a placeholder as we're simplifying to just use balafon
};

// Get the current instrument
export const getInstrument = () => {
  return currentInstrumentType;
};

// Set the flam value
export const setFlamValue = (flamValue: FlamValue) => {
  logDebug('Setting flam value to:', flamValue);
  currentFlamValue = flamValue;
};

// Get the current flam value
export const getFlamValue = () => {
  return currentFlamValue;
};

// Set the current BPM
export const setBpm = (bpm: number) => {
  currentBpm = bpm;
};

// Get the current BPM
export const getBpm = () => {
  return currentBpm;
};

// Function to get flam delay in milliseconds - DISABLED
function getFlamDelay(flamValue: FlamValue): number {
  return 0; // Always return 0 to disable flam
}

// Play a progression of chords
export const playProgression = async (
  chordNotes: number[][],
  tempo: number = 120,
  onChordChange?: (index: number) => void
) => {
  // Calculate time per chord in milliseconds
  const timePerChord = 60000 / tempo;
  let currentStep = 0;
  let isPlaying = true;
  let timeoutId: NodeJS.Timeout | null = null;
  
  // Initialize audio system if needed
  if (!isAudioInitialized) {
    await initAudio();
  }

  // Function to play the next step
  const playStep = async () => {
    if (!isPlaying) return;

    try {
      // Play click sound with current step number
      logDebug(`Playing step ${currentStep + 1}`);
      await playClick(currentStep + 1);

      // Play chord if we're at a chord change
      if (currentStep % 4 === 0) {
        const chordIndex = Math.floor(currentStep / 4);
        if (chordIndex < chordNotes.length) {
          // Stop previous chord
          await stopChord();
          
          // Play current chord
          await playChord(chordNotes[chordIndex]);
          
          // Call the callback if provided
          if (onChordChange) {
            onChordChange(chordIndex);
          }
        }
      }

      // Schedule next step
      currentStep++;
      timeoutId = setTimeout(playStep, timePerChord / 4); // Quarter of chord duration for 4 clicks per chord
    } catch (error) {
      console.error('Error in playStep:', error);
    }
  };

  // Start playing
  await playStep();

  // Return cleanup function
  return () => {
    isPlaying = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    stopChord();
  };
};

// Convert MIDI note to frequency
const midiToFrequency = (midiNote: number): number => {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
};

// Play click sound
export const playClick = async (step?: number) => {
  try {
    if (!isAudioInitialized) {
      logDebug('Audio not initialized, initializing now...');
      await initAudio();
    }

    logDebug('Attempting to play click sound...');
    logDebug('Current step:', step);
    
    // Determine which click sound to play based on the step
    const clickNumber = step ? ((step - 1) % 4) + 1 : 1;
    logDebug(`Selected click number: ${clickNumber}`);
    
    // Get the sound file
    const soundFile = CLICK_SOUNDS[clickNumber as 1 | 2 | 3 | 4];
    if (!soundFile) {
      throw new Error(`No sound file found for click ${clickNumber}`);
    }
    logDebug('Sound file:', soundFile);

    // Create a new instance for this click
    logDebug('Creating new sound instance...');
    const { sound: newClick } = await Audio.Sound.createAsync(
      soundFile,
      { 
        shouldPlay: false,
        volume: typeof step === 'number' ? (step % 4 === 1 ? 1.0 : 0.7) : 1.0,
        progressUpdateIntervalMillis: 50
      }
    );

    // Verify the sound loaded correctly
    const status = await newClick.getStatusAsync();
    logDebug('New click sound status:', status);
    if (!status.isLoaded) {
      throw new Error('Click sound failed to load properly');
    }

    // Play the click immediately
    logDebug(`Playing voice click ${clickNumber}...`);
    const playResult = await newClick.playAsync();
    logDebug('Play result:', playResult);

    // Clean up this instance after it finishes playing
    setTimeout(async () => {
      try {
        await newClick.unloadAsync();
      } catch (e) {
        console.error('Error cleaning up click sound:', e);
      }
    }, 1000);

  } catch (e) {
    console.error('Error playing voice click:', e);
    if (e instanceof Error) {
      logDebug('Error details:', {
        message: e.message,
        stack: e.stack,
        name: e.name
      });
    }
  }
};

// Clean up resources
export const cleanup = async (): Promise<void> => {
  try {
    await stopChord();
    isAudioInitialized = false;
  } catch (e) {
    console.error('Error during cleanup:', e);
  }
};

// Test click sounds
export const testClickSounds = async () => {
  try {
    logDebug('Testing click sounds...');
    
    // Force reload audio first
    await forceReloadAudio();
    
    // Test each click sound
    for (let i = 1; i <= 4; i++) {
      logDebug(`Testing click sound ${i}...`);
      await playClick(i);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait between clicks
    }
    
    logDebug('Click sound test complete');
    return true;
  } catch (error) {
    console.error('Error testing click sounds:', error);
    return false;
  }
};

// Test a single click sound
export const testSingleClick = async (number: 1 | 2 | 3 | 4) => {
  try {
    logDebug(`Testing click sound ${number}...`);
    
    // Get the sound file
    const soundFile = CLICK_SOUNDS[number];
    if (!soundFile) {
      throw new Error(`No sound file found for click ${number}`);
    }
    
    // Create a new sound instance
    const { sound } = await Audio.Sound.createAsync(
      soundFile,
      { 
        shouldPlay: false,
        volume: 1.0
      }
    );
    
    // Verify it loaded
    const status = await sound.getStatusAsync();
    logDebug('Sound status:', status);
    
    // Play it
    logDebug('Playing sound...');
    await sound.playAsync();
    
    // Clean up after 1 second
    setTimeout(async () => {
      await sound.unloadAsync();
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('Error testing click sound:', error);
    return false;
  }
};