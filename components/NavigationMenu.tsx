import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { colors } from '@/constants/colors';
import { router } from 'expo-router';

interface NavigationMenuProps {
  visible: boolean;
  onClose: () => void;
  currentRoute: string;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({ 
  visible, 
  onClose,
  currentRoute
}) => {
  // Animation value for sliding in/out
  const slideAnim = React.useRef(new Animated.Value(-300)).current;
  
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
    pianoxl: '/(tabs)/pianoxl',
    mix: '/(tabs)/mix'
  } as const;

  // Navigation items
  const navItems = [
    { 
      label: 'CHORD\nCOMPOSE', 
      route: routes.chord
    },
    { 
      label: 'CHORD\n- INATE', 
      route: routes.cordinate
    },
    {
      label: 'PIANO\nXL',
      route: routes.pianoxl
    },
    {
      label: 'MIX',
      route: routes.mix
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
    zIndex: 999,
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 205,
    backgroundColor: '#000000',
    zIndex: 1000,
    paddingTop: 88,
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
    justifyContent: 'center',
  },
  activeNavItem: {
    backgroundColor: colors.primary,
  },
  navLabel: {
    color: colors.text,
    fontSize: 18.4,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 23,
  },
});