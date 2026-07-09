import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/theme';
import { Card } from '../Card';
import { SectionHeader } from '../SectionHeader';

export interface InfoRow {
  label: string;
  value: string | React.ReactNode;
}

interface Props {
  title: string;
  rows: InfoRow[];
  actionLabel?: string;
  onActionPress?: () => void;
  emptyText?: string;
}

/** Reusable section card for the member profile tabs — renders key-value info rows. */
export const MemberInfoSection: React.FC<Props> = ({
  title,
  rows,
  actionLabel,
  onActionPress,
  emptyText,
}) => {
  const { colors, typography, spacing } = useTheme();

  const visibleRows = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== '—' && r.value !== '');

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <SectionHeader
        title={title}
        actionLabel={actionLabel}
        onActionPress={onActionPress}
        style={{ paddingHorizontal: spacing.lg }}
      />
      <Card style={{ marginHorizontal: spacing.lg }}>
        {visibleRows.length === 0 && (
          <Text style={{ color: colors.textMuted, fontSize: typography.sizes.body.fontSize }}>
            {emptyText || 'No information available.'}
          </Text>
        )}
        {visibleRows.map((row, i) => (
          <View
            key={row.label}
            style={[
              styles.row,
              i < visibleRows.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                paddingBottom: spacing.sm,
                marginBottom: spacing.sm,
              },
            ]}
          >
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: '500',
                flex: 1,
              }}
            >
              {row.label}
            </Text>
            {typeof row.value === 'string' ? (
              <Text
                numberOfLines={2}
                style={{
                  color: colors.text,
                  fontSize: typography.sizes.body.fontSize,
                  fontWeight: '500',
                  flex: 2,
                  textAlign: 'right',
                }}
              >
                {row.value}
              </Text>
            ) : (
              <View style={{ flex: 2, alignItems: 'flex-end' }}>{row.value}</View>
            )}
          </View>
        ))}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
