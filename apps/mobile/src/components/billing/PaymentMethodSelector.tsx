import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';

interface PaymentMethodSelectorProps {
  selected: string;
  onSelect: (method: string) => void;
}

const methods = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Wallet'];

export function PaymentMethodSelector({ selected, onSelect }: PaymentMethodSelectorProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={styles.grid}>
      {methods.map((m) => {
        const isSelected = selected === m;
        return (
          <TouchableOpacity
            key={m}
            style={[
              styles.item,
              { 
                backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
                borderRadius: radius.md,
                padding: spacing.md
              }
            ]}
            onPress={() => onSelect(m)}
          >
            <Text style={{ 
              fontWeight: isSelected ? '600' : '500', 
              color: isSelected ? colors.primary : colors.text 
            }}>
              {m}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  item: {
    width: '31%', // 3 columns approx
    alignItems: 'center',
    borderWidth: 1,
  }
});
