import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { CreditCard, Smartphone, Banknote, Landmark, Wallet } from 'lucide-react-native';
import { useTheme } from '../../theme/theme';
import { useHaptics } from '../../hooks/useHaptics';
import { TransactionDto } from '../../lib/api';

interface TransactionItemProps {
  transaction: TransactionDto;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const methodIcons: Record<string, any> = {
  Cash: Banknote,
  UPI: Smartphone,
  'Credit Card': CreditCard,
  'Debit Card': CreditCard,
  'Bank Transfer': Landmark,
  Wallet: Wallet,
};

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const { colors, spacing, typography, radius, motion } = useTheme();
  const { lightImpact } = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, motion.spring.interactive);
    lightImpact();
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, motion.spring.gentle);
  };

  const Icon = methodIcons[transaction.method] || CreditCard;
  const isRefund = transaction.type?.toLowerCase().includes('refund');

  return (
    <AnimatedPressable
      style={[
        styles.container,
        { 
          padding: spacing.md, 
          borderBottomColor: colors.border,
          backgroundColor: colors.surface
        },
        animatedStyle
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.background, borderRadius: radius.full }]}>
        <Icon size={20} color={isRefund ? colors.error : colors.success} />
      </View>
      <View style={[styles.content, { marginLeft: spacing.md }]}>
        <View style={styles.topRow}>
          <Text style={{ fontSize: typography.sizes.body.fontSize, fontWeight: '700', color: colors.text }}>
            {transaction.memberName}
          </Text>
          <Text style={{ fontSize: typography.sizes.body.fontSize, fontWeight: '800', color: isRefund ? colors.error : colors.text }}>
            {isRefund ? '-' : ''}₹{transaction.amount.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>
            {transaction.type} • {transaction.method}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
            {new Date(transaction.date).toLocaleDateString('en-IN')}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  }
});
