import React from 'react';
import { View, StyleSheet, Text, ScrollView, Platform, Linking, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wrench, ArrowUpCircle, RefreshCw, LogOut } from 'lucide-react-native';
import { useTheme } from '../theme/theme';
import { PrimaryButton } from './PrimaryButton';

interface MaintenanceBlockerProps {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function MaintenanceBlocker({ message, onRetry, isRetrying = false }: MaintenanceBlockerProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const handleExit = () => {
    BackHandler.exitApp();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { paddingHorizontal: spacing.xl }]}>
        {/* Glow behind icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.warningLight, borderRadius: radius.full }]}>
          <Wrench size={48} color={colors.warning} />
        </View>

        <Text style={[styles.title, { color: colors.text, fontSize: typography.sizes.headline.fontSize, fontWeight: '800' }]}>
          System Maintenance
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sizes.body.fontSize }]}>
          {message || 'We are upgrading our systems to improve your experience. Please check back shortly.'}
        </Text>

        <View style={[styles.buttonContainer, { gap: spacing.md }]}>
          <PrimaryButton
            label="Check Again"
            onPress={onRetry}
            loading={isRetrying}
            icon={<RefreshCw size={18} color="#FFF" style={{ marginRight: 8 }} />}
          />

          {Platform.OS === 'android' && (
            <PrimaryButton
              label="Exit App"
              onPress={handleExit}
              style={{ borderColor: colors.border, backgroundColor: 'transparent' }}
              labelStyle={{ color: colors.text }}
              icon={<LogOut size={18} color={colors.text} style={{ marginRight: 8 }} />}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

interface UpdateBlockerProps {
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
  storeUrl: string;
}

export function UpdateBlocker({ currentVersion, latestVersion, releaseNotes, storeUrl }: UpdateBlockerProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const handleUpdate = () => {
    if (storeUrl) {
      Linking.openURL(storeUrl).catch((err) => {
        console.error('Failed to open store URL:', err);
      });
    } else {
      // Default fallback
      Linking.openURL('https://gymflow.io');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { paddingHorizontal: spacing.xl, justifyContent: 'flex-start', paddingTop: spacing.xxl * 1.5 }]}>
        
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15', borderRadius: radius.full, marginBottom: spacing.md }]}>
          <ArrowUpCircle size={48} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text, fontSize: typography.sizes.headline.fontSize, fontWeight: '800', textAlign: 'center' }]}>
          Update Required
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sizes.body.fontSize, textAlign: 'center', marginBottom: spacing.lg }]}>
          A newer and more secure version of GymFlow Staff is available. Please update to version {latestVersion} (you are currently on {currentVersion}).
        </Text>

        {!!releaseNotes && (
          <View style={[styles.notesContainer, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xl }]}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: typography.sizes.caption.fontSize, marginBottom: spacing.xs }}>
              WHAT'S NEW IN THIS VERSION:
            </Text>
            <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={true}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                {releaseNotes}
              </Text>
            </ScrollView>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <PrimaryButton
            label="Update Now"
            onPress={handleUpdate}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
  },
  notesContainer: {
    width: '100%',
    borderWidth: 1,
  },
});
