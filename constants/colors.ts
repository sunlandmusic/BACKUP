// Color palette for the app
export const colors = {
  // Base colors
  background: '#121212', // Dark background
  surface: '#1E1E1E', // Slightly lighter surface
  surfaceLight: '#2C2C2C', // Even lighter surface for buttons, etc.
  primary: '#6200EE', // Primary accent color
  secondary: '#03DAC6', // Secondary accent color
  error: '#CF6679', // Error color
  
  // Text colors
  text: '#FFFFFF', // Primary text color (white)
  textOffWhite: '#F5F5F5', // Slightly off-white text
  textSecondary: '#B0B0B0', // Secondary text color (light gray)
  textMuted: '#757575', // Muted text color (darker gray)
  
  // Border colors
  border: '#333333', // Border color
  
  // Button colors
  buttonGrey: '#2C2C2C', // Gray button background
  buttonPressed: '#1A1A1A', // Darker gray for pressed state
  buttonActive: '#3C3C3C', // Lighter gray for active state
  
  // Piano colors
  piano: {
    white: '#FFFFFF', // White keys
    black: '#333333', // Black keys
    highlight: '#6A1B9A', // Highlighted keys (dark purple)
  },
  
  // Chord type colors - UPDATED to match the image
  chord: {
    // Top row (green except for yellow 7)
    major: '#007E33', // Darker Green
    major7: '#007E33', // Darker Green
    major9: '#007E33', // Darker Green
    '7': '#FFC107', // Yellow
    
    // Second row (purple except for yellow 9)
    minor: '#9C27B0', // Purple
    minor7: '#9C27B0', // Purple
    minor9: '#9C27B0', // Purple
    '9': '#FFC107', // Yellow
    
    // Third row
    sus2: '#00BCD4', // Teal
    sus4: '#00BCD4', // Teal
    dim: '#2196F3', // Blue
    dim7: '#2196F3', // Blue
    
    // Fourth row
    m11: '#4A148C', // Dark purple
    m7b5: '#FF9800', // Orange
    add9: '#FF9800', // Orange
    user: '#4A148C', // Dark purple
    
    // Other chord types
    augmented: '#E91E63', // Pink
    '11': '#2196F3', // Blue - same as dim/dim7
  }
};