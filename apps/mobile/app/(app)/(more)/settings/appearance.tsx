import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Sun, Moon, Sparkles, Sliders } from 'lucide-react-native';

import { useTheme } from '../../../../src/theme/theme';
import { useHaptics } from '../../../../src/hooks/useHaptics';
import { Card } from '../../../../src/components/Card';
import { SectionHeader } from '../../../../src/components/SectionHeader';

export default function AppearanceSettings() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { lightImpact } = useHaptics();

  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const [accentColor, setAccentColor] = useState('#6366F1');

  const modes = [
    { id: 'system', label: 'System Default', icon: Sliders },
    { id: 'light', label: 'Light Mode', icon: Sun },
    { id: 'dark', label: 'Dark Mode', icon: Moon },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Appearance</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <SectionHeader title="Color Theme Mode" />
        <Card padded={false} style={{ marginBottom: spacing.lg }}>
          {modes.map((mode, idx, arr) => {
            const isSelected = mode.id === themeMode;
            return (
              <Pressable
                key={mode.id}
                onPress={() => { lightImpact(); setThemeMode(mode.id as any); }}
                style={({ pressed }) => [
                  styles.modeRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: idx === arr.length - 1 ? 0 : 1,
                    padding: spacing.md,
                    opacity: pressed ? 0.95 : 1
                  }
                ]}
              >
                <mode.icon size={18} color={isSelected ? colors.primary : colors.textSecondary} />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: isSelected ? '800' : '600', color: isSelected ? colors.primary : colors.text, marginLeft: spacing.md }}>
                  {mode.label}
                </Text>
                <View style={[styles.radioCircle, { borderColor: isSelected ? colors.primary : colors.border }]}>
                  {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
              </Pressable>
            );
          })}
        </Card>

        {/* Future Ready Accent Colors */}
        <SectionHeader title="Accent Swatches" />
        <Card style={{ padding: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EC4899'].map(c => {
              const isSelected = c === accentColor;
              return (
                <Pressable
                  key={c}
                  onPress={() => { lightImpact(); setAccentColor(c); }}
                  style={[
                    styles.accentSwatch,
                    { 
                      backgroundColor: c,
                      borderColor: isSelected ? colors.text : 'transparent',
                      borderWidth: isSelected ? 2 : 0
                    }
                  ]}
                />
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  accentSwatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
  }
});
