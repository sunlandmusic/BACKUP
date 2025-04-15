import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View, Text, Pressable } from "react-native";
import { ErrorBoundary } from "./error-boundary";
import * as ScreenOrientation from 'expo-screen-orientation';
import { Audio } from 'expo-av';
import { initAudio } from "../utils/audio-utils";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(Platform.OS === 'ios');

  useEffect(() => {
    if (error) {
      console.error(error);
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Initialize audio when user interacts with the app (required for iOS)
  const handleInitAudio = async () => {
    try {
      console.log('Initializing audio after user interaction...');
      const success = await initAudio();
      
      if (success) {
        console.log('Audio system initialized successfully');
        setAudioInitialized(true);
        setShowAudioPrompt(false);
      } else {
        throw new Error('Audio initialization failed');
      }
    } catch (e) {
      console.error('Failed to initialize audio:', e);
      setShowAudioPrompt(false);
      alert('Audio initialization failed. Please restart the app and try again.');
    }
  };

  // Auto-initialize audio on Android (no user interaction required)
  useEffect(() => {
    if (Platform.OS === 'android' && !audioInitialized) {
      handleInitAudio();
    }
  }, [audioInitialized]);

  // Force landscape orientation
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // For native platforms, use expo-screen-orientation
      const lockOrientation = async () => {
        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE_LEFT
          );
        } catch (e) {
          console.warn("Failed to lock orientation:", e);
        }
      };
      
      lockOrientation();
      
      return () => {
        // Unlock when component unmounts
        ScreenOrientation.unlockAsync();
      };
    } else {
      // For web, use CSS
      const style = document.createElement('style');
      style.textContent = `
        html, body, #root {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        @media (orientation: portrait) {
          #root {
            transform: rotate(-90deg);
            transform-origin: left top;
            width: 100vh;
            height: 100vw;
            position: absolute;
            top: 100%;
            left: 0;
          }
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        {showAudioPrompt && (
          <View style={styles.audioPromptOverlay}>
            <View style={styles.audioPromptCard}>
              <Text style={styles.audioPromptTitle}>Enable Audio</Text>
              <Text style={styles.audioPromptText}>
                Tap the button below to enable audio playback.
                This is required for iOS devices to play sounds.
              </Text>
              <Pressable 
                style={styles.audioPromptButton}
                onPress={handleInitAudio}
              >
                <Text style={styles.audioPromptButtonText}>Enable Audio</Text>
              </Pressable>
            </View>
          </View>
        )}
        <RootLayoutNav />
      </View>
    </ErrorBoundary>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ 
      orientation: 'landscape',
      headerShown: false,
      contentStyle: { backgroundColor: '#121212' }
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  audioPromptOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  audioPromptCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
  },
  audioPromptTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  audioPromptText: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  audioPromptButton: {
    backgroundColor: '#6200EE',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  audioPromptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});