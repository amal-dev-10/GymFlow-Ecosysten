import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { X, Camera as CameraIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../../src/theme/theme';
import { IconButton } from '../../../src/components/IconButton';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { useHaptics } from '../../../src/hooks/useHaptics';

export default function ScanMemberScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { successNotification, errorNotification } = useHaptics();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    // Expected format: gymflow://member/<id>
    const prefix = 'gymflow://member/';
    if (data.startsWith(prefix)) {
      setScanned(true);
      successNotification();
      const memberId = data.slice(prefix.length);
      
      // Close scanner and go to profile
      router.replace(`/(app)/(members)/${memberId}`);
    } else {
      // Invalid QR code
      errorNotification();
    }
  };

  if (!permission) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <View style={styles.centerContent}>
          <CameraIcon size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
          <Text style={{ color: colors.text, fontSize: typography.sizes.title.fontSize, textAlign: 'center', marginBottom: spacing.sm }}>
            No access to camera
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.body.fontSize, textAlign: 'center', marginBottom: spacing.xl }}>
            Please enable camera permissions in your device settings to scan member QR codes.
          </Text>
          <PrimaryButton label="Request Permission" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      
      {/* Overlay UI */}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={[styles.header, { padding: spacing.lg }]}>
          <IconButton
            icon={<X size={24} color="#FFF" />}
            onPress={() => router.back()}
            accessibilityLabel="Close scanner"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 24 }}
          />
        </View>
        
        <View style={styles.targetFrame}>
          <View style={[styles.frameCorner, styles.topLeft]} />
          <View style={[styles.frameCorner, styles.topRight]} />
          <View style={[styles.frameCorner, styles.bottomLeft]} />
          <View style={[styles.frameCorner, styles.bottomRight]} />
        </View>

        <View style={[styles.footer, { padding: spacing.xl }]}>
          <Text
            style={{
              color: '#FFF',
              fontSize: typography.sizes.bodyMedium.fontSize,
              fontWeight: '600',
              textAlign: 'center',
              backgroundColor: 'rgba(0,0,0,0.6)',
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              borderRadius: 20,
              overflow: 'hidden',
            }}
          >
            Scan Member QR Code
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'flex-start',
  },
  targetFrame: {
    alignSelf: 'center',
    width: 250,
    height: 250,
    position: 'relative',
  },
  frameCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  footer: {
    alignItems: 'center',
  },
});
