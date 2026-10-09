/**
 * RootLayout Component
 *
 * App-wide navigation shell:
 * - ThemeProvider: light/dark system color scheme synchronization
 * - Stack Navigator: headerless screen transitions
 * - AgentProvider: customizable agent profile persisted on device
 * - Nunito rounded font loading (splash stays up until fonts are ready)
 * - StatusBar: dark icons on warm cream surface
 */

SplashScreen.preventAutoHideAsync().catch(() => {});

import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { ToastProvider } from '@/context/ToastContext';
import { AgentProvider } from '@/context/AgentContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AgentProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="home" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="dark" />
        </ToastProvider>
      </AgentProvider>
    </ThemeProvider>
  );
}

