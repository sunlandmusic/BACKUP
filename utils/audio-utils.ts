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

// Current instrument type
let currentInstrument: InstrumentType = 'balafon';

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
  // If already initialized, return true
  if (isAudioInitialized) {
    return true;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      console.log('Starting audio initialization...');
      
      // First, clean up any existing audio resources
      await cleanup();
      
      // Configure audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        interruptionModeIOS: 1,  // Audio.InterruptionModeIOS.DoNotMix
        interruptionModeAndroid: 1,  // Audio.InterruptionModeAndroid.DoNotMix
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
      });

      // Initialize sound objects with proper error handling
      const soundPromises = Object.entries({
        balafon: BALAFON,
        piano: PIANO,
        rhodes: RHODES,
        pluck: PLUCK,
        pad: PAD,
        steel_drum: STEEL_DRUM,
      }).map(async ([key, asset]) => {
        try {
          const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: false });
          return [key, sound] as [string, Audio.Sound];
        } catch (e) {
          console.error(`Failed to load ${key} sound:`, e);
          return [key, null] as [string, null];
        }
      });

      const results = await Promise.all(soundPromises);
      results.forEach(([key, sound]) => {
        if (sound) {
          soundObjects[key as InstrumentType] = sound;
        }
      });

      // Initialize click sounds with proper error handling
      const clickPromises = Object.entries(CLICK_SOUNDS).map(async ([key, asset]) => {
        try {
          const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: false });
          return [key, sound] as [string, Audio.Sound];
        } catch (e) {
          console.error(`Failed to load click sound ${key}:`, e);
          return [key, null] as [string, null];
        }
      });

      const clickResults = await Promise.all(clickPromises);
      clickResults.forEach(([key, sound]) => {
        if (sound) {
          soundObjects[`click${key}`] = sound;
        }
      });

      // Verify that essential sounds were loaded
      const hasEssentialSounds = soundObjects[currentInstrument] && 
                                soundObjects.click1 && 
                                soundObjects.click2 && 
                                soundObjects.click3 && 
                                soundObjects.click4;

      if (!hasEssentialSounds) {
        throw new Error('Failed to load essential sounds');
      }

      isAudioInitialized = true;
      console.log('Audio initialization complete');
      return true;

    } catch (error) {
      console.error('Error in audio initialization:', error);
      await cleanup();
      isAudioInitialized = false;
      return false;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

// Play a note
export const playNote = async (midiNote: number) => {
  try {
    // Get the base sound for the current instrument
    const baseSound = soundObjects[currentInstrument];
    if (!baseSound) {
      console.error('No base sound loaded for current instrument');
      return;
    }

    // Create a new sound instance for this note
    const { sound: noteSound } = await Audio.Sound.createAsync(
      {
        balafon: BALAFON,
        piano: PIANO,
        rhodes: RHODES,
        pluck: PLUCK,
        pad: PAD,
        steel_drum: STEEL_DRUM,
      }[currentInstrument],
      { 
        shouldPlay: false,
        volume: 1.0,
        rate: Math.pow(2, (midiNote - 60) / 12), // Set pitch shift rate during creation
        shouldCorrectPitch: true,
      }
    );

    // Play the sound immediately
    await noteSound.playAsync();

    // Store for cleanup
    const noteKey = `${currentInstrument}_${midiNote}`;
    soundObjects[noteKey] = noteSound;

    logDebug(`Playing note ${midiNote} with instrument ${currentInstrument}`);
  } catch (e) {
    console.error(`Error playing note ${midiNote}:`, e);
  }
};

// Stop a specific note
export const stopNote = async (midiNote: number) => {
  try {
    const noteKey = `${currentInstrument}_${midiNote}`;
    const noteSound = soundObjects[noteKey];
    
    if (noteSound) {
      const status = await noteSound.getStatusAsync();
      if (status.isLoaded) {
        try {
          await noteSound.stopAsync();
        } catch (stopError) {
          // If stopping fails, proceed to unload
          console.log(`Note ${midiNote} stop failed, proceeding to unload`);
        }
        
        try {
          await noteSound.unloadAsync();
        } catch (unloadError) {
          console.log(`Note ${midiNote} unload failed, removing from sound objects`);
        }
      }
      
      // Remove the sound object regardless of errors
      delete soundObjects[noteKey];
    }
  } catch (e) {
    // Log error but don't throw - this prevents the error popup
    console.log(`Error handling note ${midiNote} cleanup:`, e);
  }
};

// Play a chord (multiple notes at once)
export const playChord = async (midiNotes: number[]) => {
  try {
    // Ensure audio is initialized
    if (!isAudioInitialized) {
      await initAudio();
    }
    
    // Create all note sounds first
    const noteSounds = await Promise.all(
      midiNotes.map(async (midiNote) => {
        const { sound } = await Audio.Sound.createAsync(
          {
            balafon: BALAFON,
            piano: PIANO,
            rhodes: RHODES,
            pluck: PLUCK,
            pad: PAD,
            steel_drum: STEEL_DRUM,
          }[currentInstrument],
          { 
            shouldPlay: false,
            volume: 1.0,
            rate: Math.pow(2, (midiNote - 60) / 12),
            shouldCorrectPitch: true,
          }
        );
        return { midiNote, sound };
      })
    );

    // Play all notes based on flam setting
    if (currentFlamValue === 'off') {
      // Play all notes simultaneously with no delay
      const playPromises = noteSounds.map(async ({ midiNote, sound }) => {
        const noteKey = `${currentInstrument}_${midiNote}`;
        soundObjects[noteKey] = sound;
        await sound.playAsync();
      });
      await Promise.all(playPromises);
    } else {
      // Play with flam delay
      const flamDelay = getFlamDelay(currentFlamValue);
      for (let i = 0; i < noteSounds.length; i++) {
        const { midiNote, sound } = noteSounds[i];
        const noteKey = `${currentInstrument}_${midiNote}`;
        soundObjects[noteKey] = sound;
        if (i > 0) { // Only add delay for notes after the first one
          await new Promise<void>(resolve => {
            setTimeout(async () => {
              await sound.playAsync();
              resolve();
            }, i * flamDelay);
          });
        } else {
          await sound.playAsync(); // Play first note immediately
        }
      }
    }

    // Stop previous sounds after a small delay to ensure new sounds start playing
    setTimeout(async () => {
      const previousSounds = Object.keys(soundObjects).filter(key => 
        key.includes('_') && !noteSounds.some(({ midiNote }) => 
          key === `${currentInstrument}_${midiNote}`
        )
      );
      
      for (const key of previousSounds) {
        const sound = soundObjects[key];
        if (sound) {
          try {
            const status = await sound.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
              await sound.stopAsync();
              await sound.unloadAsync();
            }
          } catch (error) {
            console.error(`Error stopping sound ${key}:`, error);
          }
          delete soundObjects[key];
        }
      }
    }, 50);
  } catch (e) {
    console.error('Error playing chord:', e);
  }
};

// Stop all sounds
export const stopAllSounds = async () => {
  try {
    const stopPromises = Object.entries(soundObjects).map(async ([key, sound]) => {
      if (sound) {
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            try {
              await sound.stopAsync();
            } catch (stopError) {
              console.log(`Sound ${key} stop failed, proceeding to unload`);
            }
            
            try {
              await sound.unloadAsync();
            } catch (unloadError) {
              console.log(`Sound ${key} unload failed`);
            }
          }
        } catch (e) {
          console.log(`Error handling sound ${key} cleanup:`, e);
        }
      }
    });
    
    await Promise.all(stopPromises);
    
    // Clear all sound objects except the base instrument sounds
    const baseInstruments = ['balafon', 'piano', 'rhodes', 'pluck', 'pad', 'steel_drum'];
    Object.keys(soundObjects).forEach(key => {
      if (!baseInstruments.includes(key) && !key.startsWith('click')) {
        delete soundObjects[key];
      }
    });
    
  } catch (e) {
    // Log error but don't throw
    console.log('Error in stopAllSounds:', e);
  }
};

// Stop a chord
export const stopChord = async () => {
  try {
    await stopAllSounds();
  } catch (e) {
    // Log error but don't throw
    console.log('Error in stopChord:', e);
  }
};

// Set the instrument type
export const setInstrument = (instrument: InstrumentType) => {
  currentInstrument = instrument;
};

// Get the current instrument
export const getInstrument = () => {
  return currentInstrument;
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

// Function to get flam delay in milliseconds
function getFlamDelay(flamValue: FlamValue): number {
  switch (flamValue) {
    case '1/8':
      return 62.5; // Medium flam
    case '1/16':
      return 31.25; // Fast flam
    case '1/32':
      return 15.625; // Fastest flam
    case 'off':
      return 0; // No flam at all
    default:
      return 0; // Default to no flam
  }
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
    // Stop all playing sounds first
    await stopAllSounds();
    
    // Unload all sounds with proper error handling
    await Promise.all(
      Object.entries(soundObjects).map(async ([key, sound]) => {
        if (sound) {
          try {
            await sound.unloadAsync();
          } catch (e) {
            console.error(`Error unloading sound ${key}:`, e);
          }
        }
      })
    );
    
    // Reset state
    soundObjects = {};
    isAudioInitialized = false;
    currentInstrument = 'balafon';
    currentFlamValue = 'off';
    currentBpm = 120;
    
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