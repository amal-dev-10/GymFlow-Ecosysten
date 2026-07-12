import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet, View, Pressable, Dimensions, Keyboard, Modal, Text } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useTheme } from '../theme/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const dismissKeyboard = () => Keyboard.dismiss();

export interface BottomSheetRef {
  show: () => void;
  hide: () => void;
}

interface BottomSheetProps {
  children: React.ReactNode;
  snapPoints?: number[]; // [minHeight, maxHeight] defaults to [300, SCREEN_HEIGHT * 0.75]
  onDismiss?: () => void;
  title?: string;
}

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ children, snapPoints, onDismiss, title }, ref) => {
    const { colors, radius } = useTheme();
    const [visible, setVisible] = useState(false);

    const maxHeight = snapPoints?.[1] ?? SCREEN_HEIGHT * 0.75;

    const show = () => {
      setVisible(true);
    };

    const hide = () => {
      dismissKeyboard();
      setVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    };

    useImperativeHandle(ref, () => ({
      show,
      hide,
    }));

    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={hide}
      >
        <View style={styles.modalContainer}>
          {/* Backdrop */}
          {visible && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={[
                styles.backdrop,
                { backgroundColor: colors.overlay },
              ]}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={hide} />
            </Animated.View>
          )}

          {/* Sheet */}
          {visible && (
            <Animated.View
              entering={SlideInDown.duration(250)}
              exiting={SlideOutDown.duration(200)}
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.surface,
                  borderTopLeftRadius: radius.xxl,
                  borderTopRightRadius: radius.xxl,
                  height: maxHeight,
                },
              ]}
            >
              <Pressable style={{ flex: 1 }} onPress={() => {}}>
                {/* Grab Handle */}
                <View style={styles.handleContainer}>
                  <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
                </View>
                
                {title && (
                  <View style={styles.headerContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                  </View>
                )}

                <View style={styles.content}>{children}</View>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </Modal>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    width: '100%',
    zIndex: 2,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});
