import { Audio } from 'expo-av';
import { Sound } from 'expo-av/build/Audio/Sound';
import { AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av/build/AV';
import { InstrumentType, Chord } from '@/types/music';

// Sound instances
let baseSound: Audio.Sound | null = null;
let clickSound: Audio.Sound | null = null;
let noteSounds: (Audio.Sound | null)[] = []; // Array to hold pre-initialized sounds
let activeSounds: Audio.Sound[] = [];
let isPlaying = false;
let currentBeat = 0;
let timeoutId: NodeJS.Timeout | null = null;
let bpm = 120;
let isAudioInitialized = false;

const NUM_NOTE_SOUNDS = 8; // Number of pre-initialized sounds for chords

const createSound = async (asset: any): Promise<Audio.Sound | null> => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      asset,
      { shouldPlay: false, volume: 1.0 }
    );
    return sound;
  } catch (error) {
    console.error('Error creating sound:', error);
    return null;
  }
};

export const initAudio = async () => {
  if (isAudioInitialized) {
    return true;
  }

  try {
    console.log('Starting audio initialization...');
    
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    // Reset state
    await cleanup();
    
    // Initialize multiple sound instances for notes
    noteSounds = await Promise.all(
      Array(NUM_NOTE_SOUNDS).fill(null).map(() => createSound(require('../../assets/sounds/PIANO.mp3')))
    );
    
    if (noteSounds.some(sound => sound === null)) {
      throw new Error('Failed to load all note sounds');
    }

    // Load click sound
    clickSound = await createSound(require('../../assets/sounds/CLICK.mp3'));
    if (!clickSound) {
      throw new Error('Failed to load click sound');
    }

    isAudioInitialized = true;
    console.log('Audio initialization complete');
    return true;

  } catch (error) {
    console.error('Error in audio initialization:', error);
    await cleanup();
    isAudioInitialized = false;
    return false;
  }
};

const cleanup = async () => {
  try {
    for (const sound of noteSounds) {
      if (sound) await sound.unloadAsync();
    }
    noteSounds = [];
    if (clickSound) {
      await clickSound.unloadAsync();
      clickSound = null;
    }
    for (const sound of activeSounds) {
      await sound.unloadAsync();
    }
    activeSounds = [];
    isAudioInitialized = false;
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

export const playNote = async (note: number) => {
  if (!baseSound) {
    console.error('No base sound loaded for current instrument');
    return;
  }

  try {
    await baseSound.setPositionAsync(0);
    await baseSound.setVolumeAsync(0.8);
    await baseSound.setRateAsync(
      Math.pow(2, (note - 60) / 12),
      true,
      Audio.PitchCorrectionQuality.High
    );
    await baseSound.playAsync();
  } catch (error) {
    console.error('Error playing note:', error);
  }
};

export const playChord = async (chord: Chord) => {
  if (!isAudioInitialized) {
    await initAudio();
  }

  try {
    // Create all sounds first
    const soundPromises = chord.notes.map(() => 
      Audio.Sound.createAsync(
        require('../../assets/sounds/PIANO.mp3'),
        { shouldPlay: false, volume: 0.8 }
      )
    );

    const soundResults = await Promise.all(soundPromises);
    
    // Set up all sounds
    await Promise.all(
      soundResults.map(({ sound }, index) => 
        sound.setRateAsync(
          Math.pow(2, (chord.notes[index] - 60) / 12),
          true,
          Audio.PitchCorrectionQuality.High
        )
      )
    );

    // Play all sounds simultaneously
    await Promise.all(soundResults.map(({ sound }) => sound.playAsync()));

    // Clean up
    soundResults.forEach(({ sound }) => {
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if ('isLoaded' in status && !status.isPlaying) {
          sound.unloadAsync();
        }
      });
    });

  } catch (error) {
    console.error('Error playing chord:', error);
  }
};

const playNextBeat = async () => {
  if (!isPlaying) return;

  try {
    // Create a new click sound instance for each beat
    const beatSound = await createSound(require('../../assets/sounds/CLICK.mp3'));
    if (beatSound) {
      await beatSound.setVolumeAsync(currentBeat === 0 ? 1.0 : 0.8);
      await beatSound.playAsync();
      // Clean up the sound after it plays
      beatSound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.isPlaying === false) {
          await beatSound.unloadAsync();
        }
      });
    }
    
    currentBeat = (currentBeat + 1) % 4;
    const msPerBeat = (60 / bpm) * 1000;
    timeoutId = setTimeout(playNextBeat, msPerBeat);
  } catch (error) {
    console.error('Error playing beat:', error);
    isPlaying = false;
  }
};

export const playClick = async () => {
  if (!isAudioInitialized) {
    await initAudio();
  }

  try {
    isPlaying = true;
    currentBeat = 0;
    await playNextBeat();
  } catch (error) {
    console.error('Error starting metronome:', error);
    isPlaying = false;
  }
};

export const stopClick = async () => {
  isPlaying = false;
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  if (clickSound) {
    try {
      await clickSound.stopAsync();
      await clickSound.setPositionAsync(0);
    } catch (error) {
      console.error('Error stopping click:', error);
    }
  }
};

export const setBpm = (newBpm: number) => {
  bpm = newBpm;
};

export const stopAllSounds = async () => {
  await stopClick();
  
  try {
    for (const sound of activeSounds) {
      if (sound) {
        await sound.stopAsync();
        await sound.setPositionAsync(0);
      }
    }
    activeSounds = [];
  } catch (error) {
    console.error('Error stopping all sounds:', error);
  }
};

export const testClickSound = async () => {
  if (!clickSound) {
    console.log('Click sound not loaded, attempting to initialize audio...');
    await initAudio();
  }
  
  if (clickSound) {
    try {
      console.log('Testing click sound...');
      await clickSound.setPositionAsync(0);
      await clickSound.setVolumeAsync(1.0);
      await clickSound.playAsync();
      console.log('Click sound test successful');
    } catch (error) {
      console.error('Error testing click sound:', error);
    }
  } else {
    console.error('Failed to load click sound');
  }
};

// ... rest of your audio utility functions ... 