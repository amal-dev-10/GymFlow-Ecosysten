import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../theme/theme';
import { Card } from '../Card';

interface Props {
  value: string;
  size?: number;
  label?: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
}

export const QRCodeView: React.FC<Props> = ({
  value,
  size = 200,
  label,
  description,
  style,
}) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <Card style={[styles.container, style]}>
      <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF', padding: spacing.lg, borderRadius: 12 }]}>
        <QRCode
          value={value}
          size={size}
          color="#000000"
          backgroundColor="#FFFFFF"
        />
      </View>
      
      {label && (
        <Text
          style={{
            color: colors.text,
            fontSize: typography.sizes.subtitle.fontSize,
            fontWeight: '600',
            marginTop: spacing.lg,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      )}
      
      {description && (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.sizes.body.fontSize,
            marginTop: spacing.xs,
            textAlign: 'center',
          }}
        >
          {description}
        </Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // QR codes need white background for scanner reliability
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
