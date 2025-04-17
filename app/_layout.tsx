import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View, Text, Pressable, ActivityIndicator } from "react-native";
import { ErrorBoundary } from "./error-boundary";
import * as ScreenOrientation from 'expo-screen-orientation';
import { Audio } from 'expo-av';
import { initAudio, cleanup } from "../utils/audio-utils";

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
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Initialize audio when user interacts with the app
  const handleInitAudio = async () => {
    if (isInitializing) return;
    
    try {
      setIsInitializing(true);
      setInitError(null);
      console.log('Initializing audio after user interaction...');
      
      // First cleanup any existing audio resources
      await cleanup();
      
      // Initialize audio system
      const success = await initAudio();
      
      if (success) {
        console.log('Audio system initialized successfully');
        setAudioInitialized(true);
        setShowAudioPrompt(false);
      } else {
        throw new Error('Audio initialization returned false');
      }
    } catch (e) {
      console.error('Failed to initialize audio:', e);
      setInitError(e instanceof Error ? e.message : 'Unknown error occurred');
      // Don't hide the prompt on error so user can try again
    } finally {
      setIsInitializing(false);
    }
  };

  // Auto-initialize audio on Android
  useEffect(() => {
    if (Platform.OS === 'android' && !audioInitialized && !isInitializing) {
      handleInitAudio();
    }
  }, [audioInitialized, isInitializing]);

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
                {Platform.OS === 'ios' ? ' This is required for iOS devices to play sounds.' : ''}
              </Text>
              {initError && (
                <Text style={styles.errorText}>{initError}</Text>
              )}
              <Pressable 
                style={[
                  styles.audioPromptButton,
                  isInitializing && styles.audioPromptButtonDisabled
                ]}
                onPress={handleInitAudio}
                disabled={isInitializing}
              >
                {isInitializing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.audioPromptButtonText}>
                    {initError ? 'Retry' : 'Enable Audio'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </View>
    </ErrorBoundary>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  audioPromptCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
  },
  audioPromptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  audioPromptText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  errorText: {
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  audioPromptButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  audioPromptButtonDisabled: {
    backgroundColor: '#999',
  },
  audioPromptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});