import { Audio } from 'expo-av';
import { Sound } from 'expo-av/build/Audio/Sound';
import { InstrumentType, Chord } from '@/types/music';

// Types
export type FlamValue = '1/4' | '1/8' | '1/16' | '1/32' | 'off';

// Sound instances
let clickSound: Audio.Sound | null = null;
let pianoSound: Audio.Sound | null = null;
let activeSounds: Audio.Sound[] = [];
let isPlaying = false;
let currentBeat = 0;
let timeoutId: NodeJS.Timeout | null = null;
let bpm = 120;

// Attack settings
const ATTACK_TIME_MS = 50; // Increased from 10ms to 50ms for smoother attack
const ATTACK_STEPS = 10; // Increased steps for smoother ramping
const INITIAL_VOLUME = 0.1; // Lower initial volume for softer attack

const loadSound = async (path: any): Promise<Audio.Sound | null> => {
  try {
    console.log('Loading sound from path:', path);
    const { sound } = await Audio.Sound.createAsync(path, { 
      shouldPlay: false,
      volume: INITIAL_VOLUME, // Start with lower volume
      progressUpdateIntervalMillis: 50 // More frequent updates
    });
    console.log('Sound loaded successfully');
    return sound;
  } catch (error) {
    console.error('Error loading sound:', path, error);
    return null;
  }
};

// Function to create a smooth attack
const smoothAttack = async (sound: Audio.Sound) => {
  try {
    const volumeStep = (1.0 - INITIAL_VOLUME) / ATTACK_STEPS;
    const timeStep = ATTACK_TIME_MS / ATTACK_STEPS;

    for (let i = 0; i <= ATTACK_STEPS; i++) {
      const volume = INITIAL_VOLUME + (volumeStep * i);
      await sound.setVolumeAsync(volume);
      await new Promise(resolve => setTimeout(resolve, timeStep));
    }
  } catch (error) {
    console.error('Error in smooth attack:', error);
  }
};

export const initAudio = async () => {
  try {
    console.log('Starting audio initialization...');
    
    // Configure audio mode first
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    console.log('Audio mode configured');

    // Load the piano sound
    console.log('Loading piano sound...');
    const piano = await loadSound(require('../../assets/sounds/PIANO.mp3'));
    if (piano) {
      pianoSound = piano;
      console.log('Piano sound loaded successfully');
    }

    // Load the click sound
    console.log('Loading click sound...');
    try {
      const { sound: click } = await Audio.Sound.createAsync(
        require('../../assets/sounds/CLICK.mp3'),
        { 
          shouldPlay: false,
          volume: INITIAL_VOLUME,
          progressUpdateIntervalMillis: 50
        }
      );
      clickSound = click;
      console.log('Click sound loaded successfully');
      
      // Test play the click sound once
      await click.playAsync();
      await click.stopAsync();
      await click.setPositionAsync(0);
      console.log('Click sound test play successful');
    } catch (error) {
      console.error('Error loading click sound:', error);
    }

    // Log initialization status
    console.log('Audio initialization complete:', {
      pianoLoaded: pianoSound !== null,
      clickLoaded: clickSound !== null
    });

    return true;
  } catch (error) {
    console.error('Error in audio initialization:', error);
    return false;
  }
};

export const setBpm = (newBpm: number) => {
  bpm = newBpm;
};

const playNextBeat = async () => {
  if (!isPlaying || !clickSound) {
    console.log('Cannot play beat:', { isPlaying, hasClickSound: clickSound !== null });
    return;
  }

  try {
    console.log('Playing beat:', currentBeat);
    
    // Create a new click sound instance for this beat
    const { sound: newClick } = await Audio.Sound.createAsync(
      require('../../assets/sounds/CLICK.mp3'),
      { 
        shouldPlay: false,
        volume: INITIAL_VOLUME,
        progressUpdateIntervalMillis: 50
      }
    );
    
    await newClick.playAsync();
    await smoothAttack(newClick);
    
    // Add to active sounds for cleanup
    activeSounds.push(newClick);

    // Calculate time to next beat
    const msPerBeat = (60 / bpm) * 1000;

    // Increment beat counter
    currentBeat = (currentBeat + 1) % 4;

    // Schedule next beat
    timeoutId = setTimeout(playNextBeat, msPerBeat - ATTACK_TIME_MS); // Compensate for attack time
  } catch (error) {
    console.error('Error playing beat:', error);
    isPlaying = false;
  }
};

export const playClick = async () => {
  if (!clickSound) {
    console.error('Click sound not loaded');
    return;
  }

  try {
    console.log('Starting click playback');
    isPlaying = true;
    currentBeat = 0;
    await playNextBeat();
  } catch (error) {
    console.error('Error starting metronome:', error);
    isPlaying = false;
  }
};

export const stopClick = async () => {
  try {
    console.log('Stopping click playback');
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
        console.error('Error stopping click sound:', error);
      }
    }
  } catch (error) {
    console.error('Error stopping metronome:', error);
  }
};

// Function to get flam delay in milliseconds
function getFlamDelay(flamValue: FlamValue): number {
  switch (flamValue) {
    case '1/4':
      return 125;
    case '1/8':
      return 62.5;
    case '1/16':
      return 31.25;
    case '1/32':
      return 15.625;
    default:
      return 0;
  }
}

export const playChord = async (chord: Chord, flam: FlamValue = 'off') => {
  if (!pianoSound) {
    console.error('Piano sound not loaded');
    return;
  }

  try {
    // Stop any currently playing sounds
    await stopAllSounds();

    // Create and play sounds for each note
    for (let i = 0; i < chord.notes.length; i++) {
      const note = chord.notes[i];
      try {
        const sound = await loadSound(require('../../assets/sounds/PIANO.mp3'));
        if (!sound) continue;

        // Configure the sound
        await sound.setRateAsync(
          Math.pow(2, (note - 60) / 12),
          true, // Should correct pitch
          Audio.PitchCorrectionQuality.High
        );
        
        // Add to active sounds for cleanup
        activeSounds.push(sound);
        
        // Add delay for flam effect - using the new faster timing
        const flamDelay = getFlamDelay(flam);
        if (flamDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, i * flamDelay));
        }
        
        // Play with smooth attack
        await sound.setVolumeAsync(INITIAL_VOLUME);
        await sound.playAsync();
        await smoothAttack(sound);
      } catch (error) {
        console.error('Error playing note:', error);
      }
    }
  } catch (error) {
    console.error('Error playing chord:', error);
  }
};

export const stopAllSounds = async () => {
  try {
    // Stop metronome
    await stopClick();
    
    // Stop and unload all active sounds
    for (const sound of activeSounds) {
      if (sound) {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch (error) {
          console.error('Error stopping sound:', error);
        }
      }
    }
    
    // Clear the active sounds array
    activeSounds = [];
  } catch (error) {
    console.error('Error stopping all sounds:', error);
  }
};

// ... rest of your audio utility functions ... 