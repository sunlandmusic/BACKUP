import React from "react";
import { Tabs } from "expo-router";
import { colors } from "@/constants/colors";
import { Piano, Volume2, Sliders, Music, BookOpen, Settings } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          display: 'none', // Hide the tab bar as per the design
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          color: colors.text,
          fontWeight: 'bold',
        },
        headerTintColor: colors.primary,
        headerShown: false, // Hide the header as per the design
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "CHORD",
          tabBarIcon: ({ color }) => <Piano size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sounds"
        options={{
          title: "SOUNDS",
          tabBarIcon: ({ color }) => <Volume2 size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="user-chord"
        options={{
          title: "USER",
          tabBarIcon: ({ color }) => <Sliders size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progressions"
        options={{
          title: "PROG",
          tabBarIcon: ({ color }) => <Music size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="songs"
        options={{
          title: "SONG",
          tabBarIcon: ({ color }) => <BookOpen size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="utility"
        options={{
          title: "UTILITY",
          tabBarIcon: ({ color }) => <Settings size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="16keys"
        options={{
          title: '16 KEYS',
          tabBarLabel: '16 KEYS',
        }}
      />
    </Tabs>
  );
}