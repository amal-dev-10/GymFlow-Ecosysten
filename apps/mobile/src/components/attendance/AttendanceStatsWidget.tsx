import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../theme/theme';
import { Users, CheckCircle2, XCircle } from 'lucide-react-native';
import { typography } from '../../theme/typography';
import { SkeletonLoader } from '../SkeletonLoader';

interface AttendanceStatsWidgetProps {
  activeInside?: number;
  totalCheckInsToday?: number;
  totalDenied?: number;
  isLoading?: boolean;
}

export function AttendanceStatsWidget({ activeInside = 0, totalCheckInsToday = 0, totalDenied = 0, isLoading }: AttendanceStatsWidgetProps) {
  const { colors, spacing, radius } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg }}>
        <SkeletonLoader width="48%" height={100} borderRadius={radius.lg} />
        <SkeletonLoader width="48%" height={100} borderRadius={radius.lg} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { gap: spacing.md }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
            <Users size={16} color={colors.primary} />
          </View>
          <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary, marginLeft: spacing.xs, fontWeight: '500' }}>
            Active Inside
          </Text>
        </View>
        <Text style={{ fontSize: typography.sizes.display.fontSize, color: colors.text, fontWeight: '800' }}>
          {activeInside}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <View style={[styles.iconBox, { backgroundColor: colors.success + '20' }]}>
            <CheckCircle2 size={16} color={colors.success} />
          </View>
          <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary, marginLeft: spacing.xs, fontWeight: '500' }}>
            Today Check-ins
          </Text>
        </View>
        <Text style={{ fontSize: typography.sizes.display.fontSize, color: colors.text, fontWeight: '800' }}>
          {totalCheckInsToday}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  card: {
    flex: 1,
    padding: 16,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
