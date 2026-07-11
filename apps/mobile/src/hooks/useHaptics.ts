import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const useHaptics = () => {
  const selection = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const notification = (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(type).catch(() => {});
    }
  };

  const impact = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style).catch(() => {});
    }
  };

  return {
    selection,
    notification,
    impact,
    lightImpact: () => impact(Haptics.ImpactFeedbackStyle.Light),
    mediumImpact: () => impact(Haptics.ImpactFeedbackStyle.Medium),
    heavyImpact: () => impact(Haptics.ImpactFeedbackStyle.Heavy),
    rigidImpact: () => impact(Haptics.ImpactFeedbackStyle.Rigid),
    softImpact: () => impact(Haptics.ImpactFeedbackStyle.Soft),
    successNotification: () => notification(Haptics.NotificationFeedbackType.Success),
    warningNotification: () => notification(Haptics.NotificationFeedbackType.Warning),
    errorNotification: () => notification(Haptics.NotificationFeedbackType.Error),
    // Short aliases used throughout the screens (collect payment, check-in, etc.).
    success: () => notification(Haptics.NotificationFeedbackType.Success),
    warning: () => notification(Haptics.NotificationFeedbackType.Warning),
    error: () => notification(Haptics.NotificationFeedbackType.Error),
  };
};
