import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/theme';

const { width, height } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.7;

export function QRScannerOverlay() {
  const { colors, spacing } = useTheme();
  const scanLineY = useSharedValue(0);

  useEffect(() => {
    scanLineY.value = withRepeat(
      withSequence(
        withTiming(SCANNER_SIZE, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedLineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: scanLineY.value }],
    };
  });

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* Semi-transparent overlay with a cutout */}
      <View style={styles.overlayRow}>
        <View style={[styles.overlayBg, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
      </View>
      
      <View style={styles.centerRow}>
        <View style={[styles.overlayBg, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        <View style={[styles.cutout, { width: SCANNER_SIZE, height: SCANNER_SIZE }]}>
          {/* Scanning Animation Line */}
          <Animated.View style={[styles.scanLine, { backgroundColor: colors.primary }, animatedLineStyle]} />

          {/* Corner Markers */}
          <View style={[styles.corner, styles.topLeft, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.topRight, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary }]} />
        </View>
        <View style={[styles.overlayBg, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
      </View>

      <View style={styles.overlayRow}>
        <View style={[styles.overlayBg, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRow: {
    flex: 1,
  },
  centerRow: {
    flexDirection: 'row',
  },
  overlayBg: {
    flex: 1,
  },
  cutout: {
    overflow: 'hidden',
    position: 'relative',
  },
  scanLine: {
    height: 2,
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 10,
    shadowColor: '#2EC4B6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 16,
  },
});
