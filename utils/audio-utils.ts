// Audio utilities for playing notes and chords
import { Platform } from 'react-native';
import { FlamValue, InstrumentType } from '../types/music';
import { Audio, AVPlaybackStatus } from 'expo-av';

// Web Audio API context and oscillators
let audioContext: AudioContext | null = null;
let oscillators: { [key: number]: OscillatorNode } = {};
let gainNodes: { [key: number]: GainNode } = {};

// For native platforms - sound objects
let soundObjects: { [key: number]: Audio.Sound } = {};
let isAudioInitialized = false;

// Current instrument type
let currentInstrument: InstrumentType = 'piano';

// Current flam value (for chord arpeggiation)
let currentFlamValue: FlamValue = '1/16';

// Debug flag - set to true to see detailed logs
const DEBUG_AUDIO = true;

// Log function that only logs when debug is enabled
const logDebug = (...args: any[]) => {
  if (DEBUG_AUDIO) {
    console.log('[AudioUtils]', ...args);
  }
};

// Initialize audio
export const initAudio = async () => {
  if (Platform.OS === 'web' && !audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      logDebug('Web Audio API initialized');
    } catch (e) {
      console.error('Web Audio API is not supported in this browser', e);
    }
  } else if (Platform.OS !== 'web' && !isAudioInitialized) {
    try {
      logDebug('Initializing Expo Audio...');
      
      // Initialize Expo Audio with settings optimized for iOS
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        // Use number values instead of enums for compatibility
        interruptionModeIOS: 1, // 1 represents DO_NOT_MIX
        interruptionModeAndroid: 1, // 1 represents DO_NOT_MIX
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
      });
      
      isAudioInitialized = true;
      logDebug('Expo Audio initialized successfully');
      
      // Initialize without requiring a test sound
      try {
        // Create a silent audio buffer instead of loading a file
        const dummySound = new Audio.Sound();
        await dummySound.loadAsync({ uri: '' }, { volume: 0 });
        
        logDebug('Audio system initialized without test sound');
        
        // Clean up the dummy sound
        setTimeout(async () => {
          try {
            await dummySound.unloadAsync();
          } catch (cleanupError) {
            console.error('Error cleaning up dummy sound:', cleanupError);
          }
        }, 100);
      } catch (e) {
        console.error('Failed to initialize audio system:', e);
        // Even if this fails, we'll still mark as initialized
      }
    } catch (e) {
      console.error('Failed to initialize Expo Audio:', e);
    }
  }
};

// Play a note
export const playNote = async (midiNote: number) => {
  // Stop any previous notes first to ensure clean playback
  await stopNote(midiNote);
  
  if (Platform.OS === 'web') {
    playNoteWeb(midiNote);
  } else {
    await playNoteNative(midiNote);
  }
};

// Stop a note
export const stopNote = async (midiNote: number) => {
  if (Platform.OS === 'web') {
    stopNoteWeb(midiNote);
  } else {
    await stopNoteNative(midiNote);
  }
};

// Play a chord (multiple notes at once)
export const playChord = async (midiNotes: number[]) => {
  // Stop any currently playing notes first
  await stopChord();
  
  // Then play the new chord
  if (currentFlamValue === 'off') {
    // Play all notes simultaneously
    for (const note of midiNotes) {
      await playNote(note);
    }
  } else {
    // Play notes with a slight delay between them (arpeggio effect)
    const flamDelay = getFlamDelayMs();
    for (let i = 0; i < midiNotes.length; i++) {
      setTimeout(() => {
        playNote(midiNotes[i]);
      }, i * flamDelay);
    }
  }
};

// Stop a chord - IMMEDIATELY stop all sounds
export const stopChord = async () => {
  if (Platform.OS === 'web') {
    // Stop all oscillators
    Object.keys(oscillators).forEach(key => {
      stopNoteWeb(parseInt(key));
    });
    // Clear oscillators and gain nodes
    oscillators = {};
    gainNodes = {};
  } else {
    // Stop all sound objects
    for (const key of Object.keys(soundObjects)) {
      await stopNoteNative(parseInt(key));
    }
    // Clear sound objects
    soundObjects = {};
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
  currentFlamValue = flamValue;
};

// Get the current flam value
export const getFlamValue = () => {
  return currentFlamValue;
};

// Get flam delay in milliseconds
const getFlamDelayMs = (): number => {
  switch (currentFlamValue) {
    case '1/4': return 250;
    case '1/8': return 125;
    case '1/16': return 62.5;
    case '1/32': return 31.25;
    case 'off': return 0;
    default: return 62.5; // Default to 1/16
  }
};

// Play a progression of chords
export const playProgression = async (
  chordNotes: number[][],
  tempo: number = 120,
  onChordChange?: (index: number) => void
) => {
  // Calculate time per chord in milliseconds
  const timePerChord = 60000 / tempo;
  
  // Stop any currently playing notes
  await stopChord();
  
  // Play each chord in sequence
  chordNotes.forEach((notes, index) => {
    setTimeout(() => {
      // Stop previous chord
      stopChord();
      
      // Play current chord
      playChord(notes);
      
      // Call the callback if provided
      if (onChordChange) {
        onChordChange(index);
      }
    }, timePerChord * index);
  });
  
  // Stop the last chord after its duration
  setTimeout(() => {
    stopChord();
  }, timePerChord * chordNotes.length);
};

// Convert MIDI note to frequency
const midiToFrequency = (midiNote: number): number => {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
};

// Web implementation of playNote using Web Audio API
const playNoteWeb = (midiNote: number) => {
  if (!audioContext) {
    initAudio();
    if (!audioContext) return; // Still null after init attempt
  }

  // If this note is already playing, stop it first
  if (oscillators[midiNote]) {
    stopNoteWeb(midiNote);
  }

  try {
    // Create oscillator
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Set oscillator type based on instrument
    switch (currentInstrument) {
      case 'piano':
        oscillator.type = 'triangle';
        break;
      case 'organ':
        oscillator.type = 'sawtooth';
        break;
      case 'synth':
        oscillator.type = 'square';
        break;
      case 'balafon': // Added balafon instrument with a unique sound profile
        oscillator.type = 'sine';
        // For balafon, we could add a short attack and decay to simulate the wooden mallet hit
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.8, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.3);
        break;
      case 'guitar':
      case 'bass':
      case 'strings':
      case 'brass':
      case 'woodwind':
      case 'percussion':
        oscillator.type = 'triangle'; // Default for other instruments
        break;
      default:
        oscillator.type = 'sine';
    }

    // Set frequency from MIDI note
    oscillator.frequency.value = midiToFrequency(midiNote);

    // Connect oscillator to gain node and gain node to destination
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Apply envelope - IMMEDIATE ATTACK with no ramp (except for balafon which has its own envelope)
    if (currentInstrument !== 'balafon') {
      gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);
    }
    
    // Start oscillator
    oscillator.start();

    // Store oscillator and gain node for later stopping
    oscillators[midiNote] = oscillator;
    gainNodes[midiNote] = gainNode;
  } catch (e) {
    console.error('Error playing note on web:', e);
  }
};

// Web implementation of stopNote - IMMEDIATE STOP with no release envelope
const stopNoteWeb = (midiNote: number) => {
  if (oscillators[midiNote] && gainNodes[midiNote] && audioContext) {
    try {
      // Immediately stop the oscillator
      oscillators[midiNote].stop(audioContext.currentTime);
      
      // Immediately disconnect
      gainNodes[midiNote].disconnect();
      oscillators[midiNote].disconnect();
      
      // Remove references
      delete oscillators[midiNote];
      delete gainNodes[midiNote];
    } catch (e) {
      console.error('Error stopping note:', e);
      // Force cleanup if there was an error
      delete oscillators[midiNote];
      delete gainNodes[midiNote];
    }
  }
};

// Native implementation of playNote using Expo Audio
const playNoteNative = async (midiNote: number) => {
  try {
    logDebug(`Playing note: ${midiNote}`);
    
    // Create a sound object
    const sound = new Audio.Sound();
    await sound.loadAsync({
      uri: `data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAFbgBtbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1t//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAABbYw1sJXAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZB8P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZD4P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZF8P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZH4P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV`
    });
    
    // Play the sound
    await sound.playAsync();
    
    // Store for cleanup
    soundObjects[midiNote] = sound;
    
    // Clean up after 100ms
    setTimeout(async () => {
      try {
        if (soundObjects[midiNote]) {
          await soundObjects[midiNote].unloadAsync();
          delete soundObjects[midiNote];
        }
      } catch (e) {
        console.error('Error unloading sound:', e);
      }
    }, 100);
    
    logDebug(`Note ${midiNote} playing successfully`);
  } catch (e) {
    console.error(`Error playing note ${midiNote} on native:`, e);
  }
};

// Native implementation of stopNote
const stopNoteNative = async (midiNote: number) => {
  if (soundObjects[midiNote]) {
    try {
      const sound = soundObjects[midiNote];
      await sound.stopAsync();
      await sound.unloadAsync();
      delete soundObjects[midiNote];
    } catch (e) {
      console.error('Error stopping note on native:', e);
      // Force cleanup if there was an error
      delete soundObjects[midiNote];
    }
  }
};