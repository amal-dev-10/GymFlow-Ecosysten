import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/theme';
import { SkeletonLoader } from '../SkeletonLoader';

interface Props {
  count?: number;
}

/** Skeleton loading state that matches the MemberCard layout. */
export const MemberListSkeleton: React.FC<Props> = ({ count = 6 }) => {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              padding: spacing.lg,
              marginBottom: spacing.md,
              marginHorizontal: spacing.lg,
              borderRadius: radius.lg,
            },
          ]}
        >
          <View style={styles.row}>
            {/* Avatar */}
            <SkeletonLoader width={56} height={56} borderRadius={28} />

            <View style={[styles.info, { marginLeft: spacing.md }]}>
              {/* Name row */}
              <View style={styles.nameRow}>
                <SkeletonLoader width={140} height={20} />
                <SkeletonLoader width={56} height={24} borderRadius={12} />
              </View>
              {/* Meta line */}
              <SkeletonLoader width={180} height={14} style={{ marginTop: spacing.xs }} />
              {/* Stats row */}
              <View style={[styles.statsRow, { marginTop: spacing.sm }]}>
                <SkeletonLoader width={70} height={12} />
                <SkeletonLoader width={90} height={12} />
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  card: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
