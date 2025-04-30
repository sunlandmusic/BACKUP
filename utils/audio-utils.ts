// Audio utilities for playing notes and chords
import { Platform } from 'react-native';
import { FlamValue, InstrumentType } from '../types/music';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Tone from 'tone';

// Web Audio API context and oscillators
let audioContext: AudioContext | null = null;
let oscillators: { [key: number]: OscillatorNode } = {};
let gainNodes: { [key: number]: GainNode } = {};
let gainNode: GainNode | null = null;
let lowEQ: BiquadFilterNode | null = null;
let midEQ: BiquadFilterNode | null = null;
let highEQ: BiquadFilterNode | null = null;

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

// Sound parameter settings
let currentSampleStart = 0;
let currentSustain = 100;

// Debug flag - set to true to see detailed logs
const DEBUG_AUDIO = false;  // Set to false to disable all audio debug logs

// Log function that only logs when debug is enabled
const logDebug = (...args: any[]) => {
  if (DEBUG_AUDIO) {
    console.log('[AudioUtils]', ...args);
  }
};

// Error handler that silently catches AVFoundation errors
const handleAudioError = (error: any) => {
  // Silently catch AVFoundation errors
  if (!error.toString().includes('AVFoundationErrorDomain')) {
    console.error('Audio error:', error);
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
  1: require('../assets/click-voice/one.mp3'),
  2: require('../assets/click-voice/two.mp3'),
  3: require('../assets/click-voice/three.mp3'),
  4: require('../assets/click-voice/four.mp3')
} as const;

const CLICK7_SOUND = require('../assets/click-voice/CLICK7.mp3');

// Add a new state variable to track if we're currently playing
let isCurrentlyPlaying = false;

let initializationPromise: Promise<boolean> | null = null;

// Add error handling for sound loading
const loadClickSound = async (soundFile: any) => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      soundFile,
      { 
        shouldPlay: false,
        volume: 0.2,
        progressUpdateIntervalMillis: 50
      },
      (status: AVPlaybackStatus) => {
        if ('error' in status) {
          console.error('Error loading sound:', (status as any).error);
        }
      }
    );
    return sound;
  } catch (error) {
    console.error('Error creating sound:', error);
    return null;
  }
};

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

// Initialize audio for mobile
export const initAudio = async () => {
  if (Platform.OS === 'web') {
    try {
      // Create audio context if it doesn't exist
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        logDebug('Web Audio API initialized');
      }

      // Resume audio context if it's suspended (browsers require user interaction)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        logDebug('Audio context resumed');
      }
      
      // Initialize Tone.js
      if (Tone.context.state !== 'running') {
        await Tone.start();
        await Tone.context.resume();
        logDebug('Tone.js initialized and resumed');
      }

      // Sync Tone.js with our audio context
      Tone.setContext(audioContext);
      
      // Create gain node
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      
      // Create EQ nodes
      lowEQ = audioContext.createBiquadFilter();
      lowEQ.type = 'lowshelf';
      lowEQ.frequency.value = 320;
      
      midEQ = audioContext.createBiquadFilter();
      midEQ.type = 'peaking';
      midEQ.frequency.value = 1000;
      midEQ.Q.value = 1;
      
      highEQ = audioContext.createBiquadFilter();
      highEQ.type = 'highshelf';
      highEQ.frequency.value = 3200;
      
      // Connect the nodes
      lowEQ.connect(midEQ);
      midEQ.connect(highEQ);
      highEQ.connect(gainNode);
      
      isAudioInitialized = true;
      return true;
    } catch (e) {
      console.error('Error initializing web audio:', e);
      throw e;
    }
  } else {
    if (isAudioInitialized && Object.keys(soundObjects).length > 0) {
      return true;
    }

    try {
      console.log('Starting audio initialization...');
      
      // Reset state
      await cleanup();
      
      // Initialize all instrument sounds
      const instrumentSoundMap = {
        balafon: BALAFON,
        piano: PIANO,
        rhodes: RHODES,
        pluck: PLUCK,
        pad: PAD,
        steel_drum: STEEL_DRUM
      };

      // Load all instrument sounds
      await Promise.all(
        Object.entries(instrumentSoundMap).map(async ([instrument, soundFile]) => {
          try {
            const { sound } = await Audio.Sound.createAsync(
              soundFile,
              { 
                shouldPlay: false,
                volume: 1.0,
                progressUpdateIntervalMillis: 50
              }
            );
            soundObjects[instrument] = sound;
            logDebug(`Loaded sound for ${instrument}`);
          } catch (e) {
            console.error(`Error loading sound for ${instrument}:`, e);
          }
        })
      );

      // Verify we have at least one instrument loaded
      if (Object.keys(soundObjects).length === 0) {
        throw new Error('Failed to load any instrument sounds');
      }

      isAudioInitialized = true;
      console.log('Audio initialization complete with instruments:', Object.keys(soundObjects));
      return true;

    } catch (error) {
      console.error('Error in audio initialization:', error);
      await cleanup();
      isAudioInitialized = false;
      return false;
    }
  }
};

// Clean up resources
export const cleanup = async (): Promise<void> => {
  try {
    // Stop all playing sounds first
    await stopAllSounds();
    
    if (Platform.OS === 'web') {
      // Clean up web audio resources
      Object.values(oscillators).forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {
          console.error('Error cleaning up oscillator:', e);
        }
      });
      
      Object.values(gainNodes).forEach(gain => {
        try {
          gain.disconnect();
        } catch (e) {
          console.error('Error cleaning up gain node:', e);
        }
      });

      // Reset oscillators and gain nodes
      oscillators = {};
      gainNodes = {};

      // Close and reset audio context if it exists
      if (audioContext) {
        try {
          await audioContext.close();
          audioContext = null;
        } catch (e) {
          console.error('Error closing audio context:', e);
        }
      }
    }
    
    // Unload all sounds with proper error handling
    await Promise.all(
      Object.entries(soundObjects).map(async ([key, sound]) => {
        if (sound) {
          try {
            const status = await sound.getStatusAsync();
            if (status.isLoaded) {
              await sound.stopAsync();
              await sound.unloadAsync();
            }
          } catch (e) {
            console.error(`Error unloading sound ${key}:`, e);
          }
        }
      })
    );
    
    // Reset all state
    soundObjects = {};
    isAudioInitialized = false;
    currentInstrument = 'balafon';
    currentFlamValue = 'off';
    currentBpm = 120;
    isCurrentlyPlaying = false;
    
  } catch (e) {
    console.error('Error during cleanup:', e);
  }
};

// Check audio health and reinitialize if needed
const ensureAudioHealth = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext || audioContext.state === 'closed' || audioContext.state === 'suspended') {
        logDebug('Audio context needs reinitialization');
        await cleanup();
        await initAudio();
        return true;
      }
    } else {
      // For mobile, check if we can still play sounds
      if (!isAudioInitialized) {
        logDebug('Audio not initialized, reinitializing');
        await initAudio();
        return true;
      }
    }
    return true;
  } catch (e) {
    console.error('Error in ensureAudioHealth:', e);
    return false;
  }
};

// Play a note (mobile optimized)
export const playNote = async (midiNote: number) => {
  try {
    await ensureAudioHealth();
    
    if (Platform.OS === 'web') {
      try {
        // Initialize audio context if needed
        if (!audioContext || audioContext.state === 'closed') {
          await initAudio();
        }
        
        if (!audioContext) {
          throw new Error('Failed to initialize audio context');
        }

        // Ensure audio context is running
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        // Stop any existing note
        await stopNote(midiNote);

        // Cache current time to avoid multiple property access
        const currentTime = audioContext.currentTime;

        // Create oscillator and gain node
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Set oscillator type based on instrument
        switch (currentInstrument) {
          case 'piano':
            oscillator.type = 'triangle';
            break;
          case 'rhodes':
            oscillator.type = 'sine';
            break;
          case 'pluck':
            oscillator.type = 'sawtooth';
            break;
          case 'pad':
            oscillator.type = 'sine';
            break;
          case 'steel_drum':
            oscillator.type = 'triangle';
            break;
          case 'balafon':
          default:
            oscillator.type = 'sine';
            break;
        }

        // Set frequency from MIDI note
        const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
        oscillator.frequency.setValueAtTime(frequency, currentTime);

        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Set initial gain with no attack time
        const initialGain = 0.5;
        const attackTime = 0; // No attack time
        gainNode.gain.value = initialGain;
        gainNode.gain.setValueAtTime(initialGain, currentTime);

        // Store references
        oscillators[midiNote] = oscillator;
        gainNodes[midiNote] = gainNode;

        // Start oscillator
        oscillator.start(currentTime);

        // Schedule cleanup
        setTimeout(() => {
          stopNote(midiNote);
        }, 500);

      } catch (e) {
        console.error('Error playing note on web:', e);
        await cleanup();
        throw e;
      }
    } else {
      try {
        if (!isAudioInitialized) {
          await initAudio();
        }

        // If the current instrument sound isn't loaded, try to load it
        if (!soundObjects[currentInstrument]) {
          const soundFile = {
            balafon: BALAFON,
            piano: PIANO,
            rhodes: RHODES,
            pluck: PLUCK,
            pad: PAD,
            steel_drum: STEEL_DRUM
          }[currentInstrument];

          if (soundFile) {
            const { sound } = await Audio.Sound.createAsync(
              soundFile,
              { 
                shouldPlay: false,
                volume: 1.0,
                progressUpdateIntervalMillis: 50
              }
            );
            soundObjects[currentInstrument] = sound;
          }
        }

        // Get the base sound for the current instrument
        const baseSound = soundObjects[currentInstrument];
        if (!baseSound) {
          console.warn(`No sound loaded for ${currentInstrument}, falling back to piano`);
          // Fall back to piano if current instrument isn't available
          currentInstrument = 'piano';
          await initAudio(); // Reinitialize to load piano sound
        }

        // Create a new sound instance with optimized settings
        const { sound: noteSound } = await Audio.Sound.createAsync(
          {
            balafon: BALAFON,
            piano: PIANO,
            rhodes: RHODES,
            pluck: PLUCK,
            pad: PAD,
            steel_drum: STEEL_DRUM
          }[currentInstrument],
          { 
            shouldPlay: false,
            volume: 1.0,
            rate: Math.pow(2, (midiNote - 60) / 12),
            shouldCorrectPitch: true,
            progressUpdateIntervalMillis: 50,
            positionMillis: 0
          }
        );

        // Store for cleanup with unique key
        const noteKey = `${currentInstrument}_${midiNote}_${Date.now()}`;
        soundObjects[noteKey] = noteSound;

        // Play the sound
        await noteSound.playAsync();

        // Immediate volume increase with no delay
        const steps = 1;
        const stepTime = 0;
        const targetVolume = 1.0;
        
        for (let i = 0; i <= steps; i++) {
          await new Promise(resolve => setTimeout(resolve, stepTime));
          await noteSound.setVolumeAsync((i / steps) * targetVolume);
        }

        // Cleanup after sound finishes
        setTimeout(async () => {
          try {
            if (soundObjects[noteKey]) {
              await soundObjects[noteKey]?.unloadAsync();
              delete soundObjects[noteKey];
            }
          } catch (e) {
            console.warn(`Cleanup error for note ${midiNote}:`, e);
          }
        }, currentSustain * 100);

        logDebug(`Playing note ${midiNote} with instrument ${currentInstrument}`);
      } catch (e) {
        console.error(`Error playing note ${midiNote}:`, e);
      }
    }
  } catch (e) {
    console.error('Error in playNote:', e);
    await cleanup();  // Clean up on error
    throw e;
  }
};

// Stop a specific note
export const stopNote = async (midiNote: number) => {
  if (Platform.OS === 'web') {
    try {
      // Check if oscillator and gain node exist for this note
      const oscillator = oscillators[midiNote];
      const gainNode = gainNodes[midiNote];
      
      if (!oscillator || !gainNode) {
        // No oscillator/gain node found for this note, just return
        return;
      }

      if (!audioContext) {
        console.warn('No audio context available');
        return;
      }

      // Safely stop the oscillator with proper cleanup
      const now = audioContext.currentTime;
      try {
        // Immediate full volume, no attack time
        gainNode.gain.setValueAtTime(0.7, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        // Schedule oscillator stop after fade out
        setTimeout(() => {
          try {
            oscillator.stop(now + 0.00015);
            oscillator.disconnect();
            gainNode.disconnect();
          } catch (e) {
            console.warn('Error stopping oscillator:', e);
          } finally {
            // Clean up references
            delete oscillators[midiNote];
            delete gainNodes[midiNote];
          }
        }, 25);
      } catch (e) {
        console.warn('Error during note cleanup:', e);
        // Force cleanup even if error occurs
        delete oscillators[midiNote];
        delete gainNodes[midiNote];
      }
    } catch (e) {
      console.error('Error in stopNote:', e);
    }
  } else {
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
  }
};

// Play a chord (multiple notes simultaneously)
export const playChord = async (midiNotes: number[], instrument?: InstrumentType) => {
  try {
    console.log('playChord called with notes:', midiNotes);
    
    // First ensure audio is properly initialized
    if (!isAudioInitialized) {
      await initAudio();
    }

    // Set instrument if provided
    if (instrument) {
      await setInstrument(instrument);
    }

    // Stop any currently playing sounds
    await stopAllSounds();

    if (Platform.OS === 'web') {
      console.log('Playing on web platform');
      if (!audioContext || !gainNode || !lowEQ || !midEQ || !highEQ) {
        await initAudio();
        if (!audioContext || !gainNode || !lowEQ || !midEQ || !highEQ) {
          throw new Error('Audio nodes not initialized');
        }
      }

      // Create and connect oscillators for each note
      midiNotes.forEach((midiNote, index) => {
        console.log(`Setting up note ${midiNote} at index ${index}`);
        const osc = audioContext!.createOscillator();
        const noteGain = audioContext!.createGain();

        // Connect through EQ chain
        osc.connect(noteGain);
        noteGain.connect(lowEQ!);

        osc.frequency.value = midiToFrequency(midiNote);
        console.log(`Frequency for note ${midiNote}:`, midiToFrequency(midiNote));
        
        // Start immediately with no delay
        const startTime = audioContext!.currentTime;
        
        // Set initial gain with no attack time
        const initialGain = 0.5;
        const attackTime = 0; // No attack time
        noteGain.gain.value = initialGain;
        noteGain.gain.setValueAtTime(initialGain, startTime);
        noteGain.gain.exponentialRampToValueAtTime(
          initialGain * (currentSustain / 100),
          startTime + 2.0
        );

        // Store references for cleanup
        oscillators[midiNote] = osc;
        gainNodes[midiNote] = noteGain;

        // Apply flam if enabled
        const flamDelay = getFlamDelay(currentFlamValue, currentBpm);
        const noteDelay = index * flamDelay;
        
        osc.start(startTime + (noteDelay / 1000));
      });

      isCurrentlyPlaying = true;
      return true;
    } else {
      // For mobile platforms, play each note individually
      const playPromises = midiNotes.map(async (midiNote, index) => {
        try {
          // Create a new sound instance for each note
          const soundFile = {
            balafon: BALAFON,
            piano: PIANO,
            rhodes: RHODES,
            pluck: PLUCK,
            pad: PAD,
            steel_drum: STEEL_DRUM
          }[currentInstrument];

          if (!soundFile) {
            throw new Error(`No sound file for instrument: ${currentInstrument}`);
          }

          const { sound: noteSound } = await Audio.Sound.createAsync(
            soundFile,
            {
              shouldPlay: false,
              volume: 0, // Start with volume at 0
              rate: Math.pow(2, (midiNote - 60) / 12),
              shouldCorrectPitch: true,
              progressUpdateIntervalMillis: 50
            }
          );

          // Store for cleanup
          const noteKey = `${currentInstrument}_${midiNote}_${Date.now()}`;
          soundObjects[noteKey] = noteSound;

          // Apply flam delay if enabled
          const flamDelay = getFlamDelay(currentFlamValue, currentBpm);
          await new Promise(resolve => setTimeout(resolve, index * flamDelay));

          // Play the note with volume ramp
          await noteSound.playAsync();
          
          // Immediate volume increase with no delay
          const steps = 1;
          const stepTime = 0;
          const targetVolume = 1.0;
          
          for (let i = 0; i <= steps; i++) {
            await new Promise(resolve => setTimeout(resolve, stepTime));
            await noteSound.setVolumeAsync((i / steps) * targetVolume);
          }

          // Cleanup after sound finishes
          setTimeout(async () => {
            try {
              if (soundObjects[noteKey]) {
                await soundObjects[noteKey]?.unloadAsync();
                delete soundObjects[noteKey];
              }
            } catch (e) {
              console.warn(`Cleanup error for note ${midiNote}:`, e);
            }
          }, currentSustain * 100);

        } catch (error) {
          console.error(`Error playing note ${midiNote}:`, error);
        }
      });

      await Promise.all(playPromises);
      return true;
    }
  } catch (error: any) {
    console.error('Error in playChord:', error);
    // Try to reinitialize audio system
    await cleanup();
    await initAudio();
    throw error;
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

// Utility function to ensure sounds are loaded
const ensureSoundsLoaded = async () => {
  try {
    if (!isAudioInitialized || Object.keys(soundObjects).length === 0) {
      logDebug('Sounds not initialized, initializing now...');
      await initAudio();
    }
    return true;
  } catch (e) {
    console.error('Error ensuring sounds are loaded:', e);
    return false;
  }
};

// Set the instrument type with validation
export const setInstrument = async (instrument: InstrumentType) => {
  try {
    await ensureSoundsLoaded();
    currentInstrument = instrument;
    
    // If the instrument sound isn't loaded, load it
    if (!soundObjects[instrument]) {
      const soundFile = {
        balafon: BALAFON,
        piano: PIANO,
        rhodes: RHODES,
        pluck: PLUCK,
        pad: PAD,
        steel_drum: STEEL_DRUM
      }[instrument];

      if (soundFile) {
        const { sound } = await Audio.Sound.createAsync(
          soundFile,
          { 
            shouldPlay: false,
            volume: 1.0,
            progressUpdateIntervalMillis: 50
          }
        );
        soundObjects[instrument] = sound;
      }
    }
  } catch (e) {
    console.error('Error setting instrument:', e);
    // Fall back to piano if there's an error
    currentInstrument = 'piano';
  }
};

// Get the current instrument with validation
export const getInstrument = async () => {
  await ensureSoundsLoaded();
  return currentInstrument;
};

// Set the flam value with validation
export const setFlamValue = async (flamValue: FlamValue) => {
  try {
    await ensureSoundsLoaded();
    logDebug('Setting flam value to:', flamValue);
    currentFlamValue = flamValue;
  } catch (e) {
    console.error('Error setting flam value:', e);
    currentFlamValue = 'off'; // Fall back to off if there's an error
  }
};

// Get the current flam value with validation
export const getFlamValue = async () => {
  await ensureSoundsLoaded();
  return currentFlamValue;
};

// Set the current BPM with validation
export const setBpm = async (bpm: number) => {
  try {
    await ensureSoundsLoaded();
    currentBpm = bpm;
  } catch (e) {
    console.error('Error setting BPM:', e);
    currentBpm = 120; // Fall back to default BPM if there's an error
  }
};

// Get the current BPM with validation
export const getBpm = async () => {
  await ensureSoundsLoaded();
  return currentBpm;
};

// Function to get flam delay in milliseconds, now linked to BPM
function getFlamDelay(flamValue: FlamValue, bpm: number): number {
  // 1 quarter note = 60000 / bpm ms
  // 1 whole note = 4 * quarter note
  const quarterMs = 60000 / bpm;
  const wholeMs = quarterMs * 4;
  switch (flamValue) {
    case '1/48': return (wholeMs / 48) * 2;   // half-time
    case '1/32': return (wholeMs / 32) * 2;   // half-time
    case '1/24': return (wholeMs / 24) * 2;   // half-time
    case '1/16': return (wholeMs / 16) * 2;   // half-time
    case 'off':
    default: return 0;
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

    logDebug('Attempting to play click sounds...');
    logDebug('Current step:', step);
    
    // Use the exact step number provided
    const clickNumber = step || 1;
    logDebug(`Selected click number: ${clickNumber}`);
    
    // Get the voice sound file
    const voiceSoundFile = CLICK_SOUNDS[clickNumber as 1 | 2 | 3 | 4];
    if (!voiceSoundFile) {
      throw new Error(`No sound file found for click ${clickNumber}`);
    }
    logDebug('Voice sound file:', voiceSoundFile);

    // Create instances for both clicks with error handling
    logDebug('Creating new sound instances...');
    const [voiceClick, click7] = await Promise.all([
      loadClickSound(voiceSoundFile),
      loadClickSound(CLICK7_SOUND)
    ]);

    if (!voiceClick || !click7) {
      throw new Error('Failed to load one or both click sounds');
    }

    // Set the start position for "four" sample
    if (clickNumber === 4) {
      await voiceClick.setPositionAsync(0.5);
    }

    // Play both clicks simultaneously
    logDebug(`Playing voice click ${clickNumber} and CLICK7...`);
    await Promise.all([
      voiceClick.playAsync().catch(e => console.error('Error playing voice click:', e)),
      click7.playAsync().catch(e => console.error('Error playing CLICK7:', e))
    ]);

    // Clean up both instances after they finish playing
    setTimeout(async () => {
      try {
        await Promise.all([
          voiceClick.unloadAsync().catch(() => {}),
          click7.unloadAsync().catch(() => {})
        ]);
      } catch (e) {
        console.error('Error cleaning up click sounds:', e);
      }
    }, 1000);

  } catch (e) {
    console.error('Error playing click sounds:', e);
    if (e instanceof Error) {
      logDebug('Error details:', {
        message: e.message,
        stack: e.stack,
        name: e.name
      });
    }
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

// Set EQ band levels
export const setEqBand = async (band: 'low' | 'mid' | 'high', value: number) => {
  try {
    if (!audioContext) await initAudio();
    
    const gain = Math.max(-12, Math.min(12, value)); // Ensure gain is within bounds
    logDebug(`Setting ${band} EQ to ${gain}dB`);

    if (Platform.OS === 'web') {
      switch (band) {
        case 'low':
          if (lowEQ) {
            lowEQ.gain.value = gain;
            logDebug('Low EQ updated');
          }
          break;
        case 'mid':
          if (midEQ) {
            midEQ.gain.value = gain;
            logDebug('Mid EQ updated');
          }
          break;
        case 'high':
          if (highEQ) {
            highEQ.gain.value = gain;
            logDebug('High EQ updated');
          }
          break;
      }
    } else {
      // For mobile, we'll apply EQ changes when playing sounds
      logDebug('EQ changes will be applied on next playback');
    }
  } catch (error) {
    console.error(`Error setting ${band} EQ:`, error);
  }
};

// Set sample start time
export const setSampleStart = async (value: number) => {
  currentSampleStart = Math.max(0, Math.min(500, value));
  logDebug(`Sample start set to ${currentSampleStart}ms`);
};

// Set sustain level
export const setSustain = async (value: number) => {
  currentSustain = Math.max(10, Math.min(200, value));
  logDebug(`Sustain set to ${currentSustain}%`);
};