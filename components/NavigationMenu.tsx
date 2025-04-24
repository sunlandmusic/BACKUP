import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { colors } from '@/constants/colors';
import { router } from 'expo-router';

interface NavigationMenuProps {
  visible: boolean;
  onClose: () => void;
  currentRoute: string;
}

// Custom icon components to match the image
const PianoIcon = () => (
  <View style={styles.customIcon}>
    <Text style={styles.iconText}>🎹</Text>
  </View>
);

const HeadphoneIcon = () => (
  <View style={styles.customIcon}>
    <Text style={styles.iconText}>🎧</Text>
  </View>
);

// Equalizer fader icon for User
const UserIcon = () => (
  <View style={styles.customIcon}>
    <View style={styles.equalizerContainer}>
      <View style={styles.equalizerBar}>
        <View style={[styles.equalizerFader, { height: '60%' }]} />
      </View>
      <View style={styles.equalizerBar}>
        <View style={[styles.equalizerFader, { height: '40%' }]} />
      </View>
      <View style={styles.equalizerBar}>
        <View style={[styles.equalizerFader, { height: '80%' }]} />
      </View>
    </View>
  </View>
);

const ProgressionIcon = () => (
  <View style={styles.customIcon}>
    <Text style={[styles.iconText, { color: 'white' }]}>🎵</Text>
  </View>
);

const GridIcon = () => (
  <View style={styles.customIcon}>
    <Text style={styles.iconText}>📊</Text>
  </View>
);

export const NavigationMenu: React.FC<NavigationMenuProps> = ({ 
  visible, 
  onClose,
  currentRoute
}) => {
  // Animation value for sliding in/out
  const slideAnim = React.useRef(new Animated.Value(-300)).current;
  
  // Screen dimensions
  const { width } = Dimensions.get('window');
  
  // Update animation when visibility changes
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);
  
  // Navigation items with their routes as a const to ensure type safety
  const routes = {
    chord: '/(tabs)',
    sounds: '/(tabs)/sounds',
    prog: '/(tabs)/progressions',
    user: '/(tabs)/user-chord',
    cordinate: '/(tabs)/cordinate',
    pianoxl: '/(tabs)/pianoxl'
  } as const;

  // Navigation items
  const navItems = [
    { 
      label: 'CHORD', 
      icon: <PianoIcon />,
      route: routes.chord
    },
    { 
      label: 'CORDINATE', 
      icon: <GridIcon />,
      route: routes.cordinate
    },
    {
      label: 'PIANO XL',
      icon: <PianoIcon />,
      route: routes.pianoxl
    }
  ];
  
  // Handle navigation with type-safe routes
  const handleNavigation = (route: typeof routes[keyof typeof routes]) => {
    router.push(route);
    onClose();
  };
  
  // Check if a route is active
  const isRouteActive = (route: string) => {
    return currentRoute === route;
  };
  
  return (
    <>
      {/* Backdrop - only visible when menu is open */}
      {visible && (
        <Pressable 
          style={styles.backdrop} 
          onPress={onClose}
        />
      )}
      
      {/* Menu panel */}
      <Animated.View 
        style={[
          styles.container,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        {/* Navigation items */}
        <View style={styles.navItems}>
          {navItems.map((item, index) => (
            <Pressable
              key={index}
              style={[
                styles.navItem,
                isRouteActive(item.route) && styles.activeNavItem
              ]}
              onPress={() => handleNavigation(item.route)}
            >
              <View style={styles.iconContainer}>
                {item.icon}
              </View>
              <Text style={styles.navLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9,
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 175,
    backgroundColor: colors.surface,
    zIndex: 10,
    paddingTop: 50,
    paddingHorizontal: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  navItems: {
    marginTop: -47,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
  },
  activeNavItem: {
    backgroundColor: colors.primary,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  navLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  customIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  equalizerContainer: {
    flexDirection: 'row',
    height: 20,
    width: 20,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  equalizerBar: {
    width: 4,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  equalizerFader: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
});