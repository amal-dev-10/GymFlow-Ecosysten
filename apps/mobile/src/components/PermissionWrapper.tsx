import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { useWorkspaceStore } from '../store/workspace.store';
import { normalizeRole, NormalizedRole } from '../lib/permissions';
import { useTheme } from '../theme/theme';

export interface PermissionWrapperProps {
  allowedRoles: NormalizedRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  allowedRoles,
  children,
  fallback,
}) => {
  const { colors, typography, spacing } = useTheme();
  // Deliberately reads the *workspace's* role, not the auth session's — a
  // user can hold a different role in each organization they belong to, and
  // what matters here is their role in the currently active workspace.
  const workspaceRole = useWorkspaceStore((state) => state.role);
  const hasPermission = allowedRoles.includes(normalizeRole(workspaceRole));

  if (hasPermission) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <View style={[styles.container, { padding: spacing.xxl }]}>
      <ShieldAlert size={40} color={colors.error} style={{ marginBottom: spacing.md }} />
      <Text
        style={[
          styles.title,
          {
            color: colors.text,
            fontSize: typography.sizes.title.fontSize,
            lineHeight: typography.sizes.title.lineHeight,
            fontWeight: typography.sizes.title.fontWeight,
            marginBottom: spacing.xs,
          },
        ]}
      >
        Access Denied
      </Text>
      <Text
        style={[
          styles.description,
          {
            color: colors.textSecondary,
            fontSize: typography.sizes.body.fontSize,
            lineHeight: typography.sizes.body.lineHeight,
          },
        ]}
      >
        You do not have the required permissions to view this content.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
  },
});
