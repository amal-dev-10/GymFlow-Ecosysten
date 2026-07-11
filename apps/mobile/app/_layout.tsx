import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

import { queryClient } from '../src/lib/queryClient';
import { ThemeProvider, useTheme } from '../src/theme/theme';
import { useAuthStore } from '../src/store/auth.store';
import { WorkspaceProvider, useWorkspace } from '../src/providers/WorkspaceProvider';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { platformPublicApi } from '../src/lib/api';
import { MaintenanceBlocker, UpdateBlocker } from '../src/components/BlockerScreens';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppStateNavigator() {
  const { isAuthenticated } = useAuthStore();
  const { isWorkspaceSelected, isRestoring } = useWorkspace();
  const segments = useSegments();
  const router = useRouter();
  const [isMounted, setIsMounted] = React.useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Splash -> Auth -> Load Organizations -> Org/Gym Selection -> Workspace.
    // Wait for the restored-workspace revalidation before redirecting anywhere,
    // so a valid restored session isn't briefly bounced through the selector.
    if (isRestoring || !isMounted) return;

    const group = segments[0];
    const inAppGroup = group === '(app)';
    const inLobbyGroup = group === '(lobby)';

    const timeout = setTimeout(() => {
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
    }, 0);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, isWorkspaceSelected, isRestoring, segments, router, isMounted]);

  return <Slot />;
}

function isVersionOlder(current: string, target: string): boolean {
  const parse = (v: string) => v.replace(/[^0-9.]/g, '').split('.').map(Number);
  const [currMajor = 0, currMinor = 0, currPatch = 0] = parse(current);
  const [tgtMajor = 0, tgtMinor = 0, tgtPatch = 0] = parse(target);
  
  if (currMajor !== tgtMajor) return currMajor < tgtMajor;
  if (currMinor !== tgtMinor) return currMinor < tgtMinor;
  return currPatch < tgtPatch;
}

interface VersionStatus {
  loading: boolean;
  maintenance: boolean;
  maintenanceMessage?: string;
  updateRequired: boolean;
  latestVersion?: string;
  releaseNotes?: string;
  storeUrl?: string;
}

function MainLayoutContent() {
  const { isDark, colors } = useTheme();
  const { isRestoring } = useWorkspace();

  const [versionStatus, setVersionStatus] = React.useState<VersionStatus>({
    loading: true,
    maintenance: false,
    updateRequired: false,
  });

  const checkVersion = React.useCallback(async () => {
    setVersionStatus((prev) => ({ ...prev, loading: true }));
    try {
      const config = await platformPublicApi.getMobileVersionCheck();
      const currentVersion = process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0';

      if (config.maintenanceMode) {
        setVersionStatus({
          loading: false,
          maintenance: true,
          maintenanceMessage: config.maintenanceMessage,
          updateRequired: false,
        });
        return;
      }

      const isOlder = isVersionOlder(currentVersion, config.minimumSupportedVersion);
      const isLatestOlder = isVersionOlder(currentVersion, Platform.OS === 'android' ? config.androidLatestVersion : config.iosLatestVersion);
      const updateRequired = isOlder || (config.forceUpdate && isLatestOlder);

      setVersionStatus({
        loading: false,
        maintenance: false,
        updateRequired,
        latestVersion: Platform.OS === 'android' ? config.androidLatestVersion : config.iosLatestVersion,
        releaseNotes: config.releaseNotes,
        storeUrl: Platform.OS === 'android' ? config.playStoreUrl : config.appStoreUrl,
      });
    } catch (err) {
      console.warn('Failed to load mobile version check:', err);
      // Fallback: don't block user if check fails (e.g. offline/no connection) unless already blocked
      setVersionStatus((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

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
    // Hold the splash screen until BOTH the workspace restoration AND version checks resolve
    if (!isRestoring && !versionStatus.loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isRestoring, versionStatus.loading]);

  const renderContent = () => {
    if (versionStatus.loading && isRestoring) {
      // Still holding splash screen, render nothing visible
      return null;
    }

    if (versionStatus.maintenance) {
      return (
        <MaintenanceBlocker
          message={versionStatus.maintenanceMessage}
          onRetry={checkVersion}
          isRetrying={versionStatus.loading}
        />
      );
    }

    if (versionStatus.updateRequired) {
      return (
        <UpdateBlocker
          currentVersion={process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0'}
          latestVersion={versionStatus.latestVersion || '1.0.0'}
          releaseNotes={versionStatus.releaseNotes}
          storeUrl={versionStatus.storeUrl || ''}
        />
      );
    }

    return <AppStateNavigator />;
  };

  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OfflineBanner />
      {renderContent()}
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
