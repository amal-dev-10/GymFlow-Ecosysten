import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { queryClient } from '../src/lib/queryClient';
import { ThemeProvider, useTheme } from '../src/theme/theme';
import { useAuthStore } from '../src/store/auth.store';
import { WorkspaceProvider, useWorkspace } from '../src/providers/WorkspaceProvider';
import { OfflineBanner } from '../src/components/OfflineBanner';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppStateNavigator() {
  const { isAuthenticated } = useAuthStore();
  const { isWorkspaceSelected, isRestoring } = useWorkspace();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Splash -> Auth -> Load Organizations -> Org/Gym Selection -> Workspace.
    // Wait for the restored-workspace revalidation before redirecting anywhere,
    // so a valid restored session isn't briefly bounced through the selector.
    if (isRestoring) return;

    const group = segments[0];
    const inAppGroup = group === '(app)';
    const inLobbyGroup = group === '(lobby)';

    if (!isAuthenticated) {
      // Signed out: only the auth group is reachable
      if (inAppGroup || inLobbyGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (!isWorkspaceSelected) {
      // Signed in, but hasn't picked which gym they're working from yet
      if (!inLobbyGroup) {
        router.replace('/(lobby)/organizations');
      }
      return;
    }

    // Signed in with an active gym context — land in the workspace
    if (!inAppGroup) {
      router.replace('/(app)/(dashboard)');
    }
  }, [isAuthenticated, isWorkspaceSelected, isRestoring, segments, router]);

  return <Slot />;
}

function MainLayoutContent() {
  const { isDark, colors } = useTheme();
  const { isRestoring } = useWorkspace();

  // Create themed wrapper for Material Design 3 React Native Paper
  const paperTheme = isDark
    ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: colors.primary,
          background: colors.background,
          surface: colors.surface,
          outline: colors.border,
        },
      }
    : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: colors.primary,
          background: colors.background,
          surface: colors.surface,
          outline: colors.border,
        },
      };

  useEffect(() => {
    // Hold the splash screen until the workspace restoration check resolves
    if (!isRestoring) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isRestoring]);

  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OfflineBanner />
      <AppStateNavigator />
    </PaperProvider>
  );
}

import { ErrorBoundary } from '../src/components/ErrorBoundary';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // We can list custom fonts here if we place them in assets/fonts/
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <WorkspaceProvider>
              <ErrorBoundary>
                <MainLayoutContent />
              </ErrorBoundary>
            </WorkspaceProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
