import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { X, Zap, ZapOff } from 'lucide-react-native';
import { useHaptics } from '../../../src/hooks/useHaptics';
import { useTheme } from '../../../src/theme/theme';
import { useCheckIn, useCheckOut } from '../../../src/hooks/useAttendance';
import { useWorkspaceStore } from '../../../src/store/workspace.store';

import { QRScannerOverlay } from '../../../src/components/attendance/QRScannerOverlay';
import { ValidationOverlay, ValidationState } from '../../../src/components/attendance/ValidationOverlay';
import { IconButton } from '../../../src/components/IconButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { typography } from '../../../src/theme/typography';

export default function QRScannerScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { success: hapticSuccess, error: hapticError, mediumImpact } = useHaptics();
  const { activeGymId } = useWorkspaceStore();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [scanned, setScanned] = useState(false);
  
  const [validationState, setValidationState] = useState<ValidationState>(null);
  const [validationData, setValidationData] = useState<{ title?: string; subtitle?: string; memberName?: string }>({});
  const [mode, setMode] = useState<'check-in' | 'check-out'>('check-in');

  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  useEffect(() => {
    if (validationState) {
      // Auto-hide validation state after 3 seconds if not success
      const timer = setTimeout(() => {
        if (validationState === 'success') {
          router.back();
        } else {
          setValidationState(null);
          setScanned(false);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [validationState]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ textAlign: 'center', marginBottom: 20, color: colors.text, fontSize: typography.sizes.body.fontSize }}>
          We need your permission to show the camera
        </Text>
        <TouchableOpacity onPress={requestPermission} style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 8 }}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    mediumImpact();

    // In GymFlow, QR codes should be in format `gymflow://member/{memberId}` or just `{memberId}`
    // For demo purposes, we'll try to extract memberId
    let memberId = data;
    if (data.startsWith('gymflow://member/')) {
      memberId = data.split('gymflow://member/')[1];
    } else {
      // If it's a random QR, we might just fail it unless it matches uuid format
      if (data.length < 10) {
        hapticError();
        setValidationState('error');
        setValidationData({ subtitle: 'Invalid QR Code format' });
        return;
      }
    }

    const mutation = mode === 'check-in' ? checkInMutation : checkOutMutation;

    mutation.mutate(
      { memberId, gymId: activeGymId || '' },
      {
        onSuccess: (res: any) => {
          hapticSuccess();
          setValidationState('success');
          setValidationData({ 
            title: mode === 'check-in' ? 'Check-in Successful' : 'Check-out Successful',
            memberName: `Member ${memberId.slice(0,4)}` 
          });
        },
        onError: (err: any) => {
          hapticError();
          // Based on error message, map to frozen/expired.
          const msg = err.message || 'Unknown Error';
          if (msg.toLowerCase().includes('frozen')) {
            setValidationState('frozen');
          } else if (msg.toLowerCase().includes('expire')) {
            setValidationState('expired');
          } else {
            setValidationState('error');
          }
          setValidationData({ subtitle: msg });
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={StyleSheet.absoluteFillObject} 
        facing="back"
        enableTorch={isFlashOn}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      
      <QRScannerOverlay />

      <SafeAreaView edges={['top']} style={styles.topBar}>
        <IconButton
          icon={<X size={24} color="#FFF" />}
          onPress={() => router.back()}
          style={styles.actionBtn}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 4 }}>
            <TouchableOpacity 
              onPress={() => setMode('check-in')}
              style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: mode === 'check-in' ? colors.primary : 'transparent' }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Check-In</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setMode('check-out')}
              style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: mode === 'check-out' ? colors.primary : 'transparent' }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Check-Out</Text>
            </TouchableOpacity>
          </View>
        </View>
        <IconButton
          icon={isFlashOn ? <Zap size={24} color="#FFF" /> : <ZapOff size={24} color="#FFF" />}
          onPress={() => setIsFlashOn(!isFlashOn)}
          style={styles.actionBtn}
        />
      </SafeAreaView>

      <ValidationOverlay 
        state={validationState}
        title={validationData.title}
        subtitle={validationData.subtitle}
        memberName={validationData.memberName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  actionBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  }
});
