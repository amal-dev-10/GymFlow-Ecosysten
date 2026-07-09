import React from 'react';
import { StyleSheet, Text, View, Modal, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useTheme } from '../theme/theme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

export interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const { colors, typography, radius, spacing } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.container}>
        {/* Backdrop overlay */}
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} disabled={loading} />
        </Animated.View>

        {/* Dialog Content */}
        <Animated.View
          entering={ZoomIn.duration(200)}
          exiting={ZoomOut.duration(150)}
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.xl,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: typography.sizes.title.fontSize,
                lineHeight: typography.sizes.title.lineHeight,
                fontWeight: typography.sizes.title.fontWeight,
              },
            ]}
          >
            {title}
          </Text>

          <Text
            style={[
              styles.message,
              {
                color: colors.textSecondary,
                fontSize: typography.sizes.body.fontSize,
                lineHeight: typography.sizes.body.lineHeight,
                marginVertical: spacing.md,
              },
            ]}
          >
            {message}
          </Text>

          <View style={[styles.actions, { gap: spacing.md }]}>
            <SecondaryButton
              label={cancelLabel}
              onPress={onCancel}
              disabled={loading}
              variant="ghost"
              style={styles.actionBtn}
            />
            <PrimaryButton
              label={confirmLabel}
              onPress={onConfirm}
              loading={loading}
              style={styles.actionBtn}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    zIndex: 10,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  actionBtn: {
    flex: 1,
  },
});
