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

// Sound file mapping - using direct require statements
const BALAFON = require('../assets/sounds/BALAFON.mp3');
const PIANO = require('../assets/sounds/PIANO.mp3');
const RHODES = require('../assets/sounds/SYNTH.mp3');  // Using SYNTH for RHODES
const PLUCK = require('../assets/sounds/GUITAR.mp3');  // Using GUITAR for PLUCK
const PAD = require('../assets/sounds/STRINGS.mp3');   // Using STRINGS for PAD
const STEEL_DRUM = require('../assets/sounds/BRASS.mp3'); // Using BRASS for STEEL_DRUM
const CLICK = require('../assets/sounds/CLICK.mp3');

// Initialize audio
export const initAudio = async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      interruptionModeIOS: 1,
      interruptionModeAndroid: 1,
      playThroughEarpieceAndroid: false,
      allowsRecordingIOS: false,
    });

    try {
      // Load base sound for current instrument
      const { sound } = await Audio.Sound.createAsync(
        {
          balafon: BALAFON,
          piano: PIANO,
          rhodes: RHODES,
          pluck: PLUCK,
          pad: PAD,
          steel_drum: STEEL_DRUM,
        }[currentInstrument],
        { shouldPlay: false }
      );

      // Load click sound
      const { sound: click } = await Audio.Sound.createAsync(
        CLICK,
        { shouldPlay: false }
      );
      clickSound = click;

      // Store the base sound
      soundObjects[currentInstrument] = sound;
      logDebug('Base sound and click loaded successfully');
      isAudioInitialized = true;
    } catch (loadError) {
      console.error('Failed to load sounds:', loadError);
      throw loadError;
    }
  } catch (e) {
    console.error('Failed to initialize audio:', e);
    isAudioInitialized = false;
    throw e;
  }
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

// Stop a note
export const stopNote = async (midiNote: number) => {
  try {
    const noteSound = soundObjects[`${currentInstrument}_${midiNote}`];
    if (noteSound) {
      const status = await noteSound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await noteSound.stopAsync();
        await noteSound.unloadAsync();
      }
      delete soundObjects[`${currentInstrument}_${midiNote}`];
    }
  } catch (e) {
    console.error(`Error stopping note ${midiNote}:`, e);
  }
};

// Play a chord (multiple notes at once)
export const playChord = async (midiNotes: number[]) => {
  try {
    // Stop any currently playing notes first
    await stopChord();
    
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

    // Then play them based on flam setting
    if (currentFlamValue === 'off') {
      // Play all notes simultaneously
      await Promise.all(
        noteSounds.map(async ({ midiNote, sound }) => {
          const noteKey = `${currentInstrument}_${midiNote}`;
          soundObjects[noteKey] = sound;
          await sound.playAsync();
        })
      );
    } else {
      // Play with flam delay
      const flamDelay = getFlamDelayMs(currentFlamValue);
      for (let i = 0; i < noteSounds.length; i++) {
        const { midiNote, sound } = noteSounds[i];
        const noteKey = `${currentInstrument}_${midiNote}`;
        soundObjects[noteKey] = sound;
        await new Promise<void>(resolve => {
          setTimeout(async () => {
            await sound.playAsync();
            resolve();
          }, i * flamDelay);
        });
      }
    }
  } catch (e) {
    console.error('Error playing chord:', e);
  }
};

// Stop a chord - IMMEDIATELY stop all sounds
export const stopChord = async () => {
  try {
    // Stop all playing notes
    const playingNotes = Object.keys(soundObjects).filter(key => key.includes('_'));
    const stopPromises = playingNotes.map(async (key) => {
      const sound = soundObjects[key];
      if (sound) {
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            if (status.isPlaying) {
              await sound.stopAsync();
            }
            await sound.unloadAsync();
          }
        } catch (error) {
          console.error(`Error stopping sound ${key}:`, error);
        }
        delete soundObjects[key];
      }
    });
    await Promise.all(stopPromises);
  } catch (e) {
    console.error('Error stopping chord:', e);
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

// Play click sound
export const playClick = async (step?: number) => {
  try {
    if (clickSound) {
      // If step is provided, adjust volume based on whether it's an accented beat
      if (typeof step === 'number') {
        const isAccentedBeat = step % 8 === 0;
        await clickSound.setVolumeAsync(isAccentedBeat ? 1.0 : 0.7);
      } else {
        await clickSound.setVolumeAsync(1.0);
      }
      await clickSound.setPositionAsync(0);
      await clickSound.playAsync();
    } else {
      // Try to load click sound if it's not loaded
      const { sound: click } = await Audio.Sound.createAsync(
        CLICK,
        { shouldPlay: false }
      );
      clickSound = click;
      await clickSound.playAsync();
    }
  } catch (e) {
    console.error('Error playing click:', e);
  }
};

// Stop all sounds (including click)
export const stopAllSounds = async (): Promise<void> => {
  try {
    // Stop all playing notes
    await stopChord();
    
    // Stop click sound
    if (clickSound) {
      const status = await clickSound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await clickSound.stopAsync();
      }
    }
  } catch (e) {
    console.error('Error stopping all sounds:', e);
  }
};

// Clean up resources
export const cleanup = async (): Promise<void> => {
  try {
    await stopAllSounds();
    
    // Unload click sound
    if (clickSound) {
      await clickSound.unloadAsync();
      clickSound = null;
    }
    
    // Unload all other sounds
    const unloadPromises = Object.values(soundObjects).map(async (sound) => {
      if (sound) {
        await sound.unloadAsync();
      }
    });
    await Promise.all(unloadPromises);
    soundObjects = {};
    
    isAudioInitialized = false;
  } catch (e) {
    console.error('Error during cleanup:', e);
  }
};