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
let soundObjects: { [key: number]: Audio.Sound } = {};
let isAudioInitialized = false;

// Current instrument type
let currentInstrument: InstrumentType = 'balafon';

// Current flam value (for chord arpeggiation)
let currentFlamValue: FlamValue = '1/16';

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

// Initialize audio
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
    } catch (e) {
      console.error('Error initializing audio:', e);
      throw e;
    }
  } else if (!isAudioInitialized) {
    try {
      logDebug('Initializing Expo Audio...');
      
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
      });
      
      isAudioInitialized = true;
      logDebug('Expo Audio initialized successfully');
    } catch (e) {
      console.error('Failed to initialize Expo Audio:', e);
      throw e;
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
    const flamDelay = getFlamDelayMs(currentFlamValue);
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

// Set the current BPM
export const setBpm = (bpm: number) => {
  currentBpm = bpm;
};

// Get the current BPM
export const getBpm = () => {
  return currentBpm;
};

// Get flam delay in milliseconds based on BPM
export function getFlamDelayMs(flam: string): number {
  const msPerBeat = (60 / currentBpm) * 1000;
  switch (flam) {
    case '1/32': return msPerBeat / 32; // Small flam: 1/32 of a beat
    case '1/16': return msPerBeat / 16; // Medium flam: 1/16 of a beat
    case '1/8': return msPerBeat / 8;   // Large flam: 1/8 of a beat
    case '1/4': return msPerBeat / 4;   // Extra large flam: 1/4 of a beat
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