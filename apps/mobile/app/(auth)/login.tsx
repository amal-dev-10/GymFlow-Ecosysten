import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ShieldCheck, Phone, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../src/theme/theme';
import { useAuthStore } from '../../src/store/auth.store';
import { authApi, ApiError } from '../../src/lib/api';
import { PrimaryButton } from '../../src/components/PrimaryButton';

const logoImg = require('../../assets/logo.png');

const RESEND_SECONDS = 60;
// No SMS gateway is configured in this environment — the backend logs and
// accepts a fixed OTP (see apps/api/.../auth.service.ts). Surfacing it here
// keeps the flow testable without server console access.
const DEV_OTP_HINT = '123456';

export default function LoginScreen() {
  const { colors, typography, radius, spacing, elevation } = useTheme();
  const login = useAuthStore((state) => state.login);

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const otpInputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (step === 'otp' && countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, countdown]);

  useEffect(() => {
    const backAction = () => {
      if (step === 'otp') {
        setStep('phone');
        setErrorMsg('');
        return true;
      }
      BackHandler.exitApp();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [step]);

  const isValidPhone = /^\+?[1-9]\d{7,14}$/.test(phone.trim());

  const handleSendOtp = async () => {
    if (!isValidPhone) {
      setErrorMsg('Enter a valid phone number, e.g. +1 234 567 8900');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await authApi.sendOtp(phone.trim(), 'login');
      setStep('otp');
      setCountdown(RESEND_SECONDS);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Could not send verification code. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setErrorMsg('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await authApi.verifyOtp(phone.trim(), code, undefined, 'login');
      login(data.user, data.accessToken, data.refreshToken);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Verification failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStep('phone');
    setErrorMsg('');
    setOtp(['', '', '', '', '', '']);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        {/* Hero band: gives the flat form real presence instead of floating
            in a wall of empty background — a soft color blob behind the
            mark, top-anchored rather than vertically centered. */}
        <View style={[styles.hero, { backgroundColor: colors.primaryLight }]}>
          <View style={[styles.heroBlob, { backgroundColor: colors.primary, opacity: 0.08 }]} />
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <View style={[styles.logoIcon, elevation.sm, { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }]}>
              <Image source={logoImg} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            </View>
            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                  fontSize: typography.sizes.headline.fontSize,
                  lineHeight: typography.sizes.headline.lineHeight,
                  fontWeight: typography.sizes.headline.fontWeight,
                  marginTop: spacing.md,
                },
              ]}
            >
              GymFlow Staff
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: colors.textSecondary, fontSize: typography.sizes.body.fontSize, marginTop: spacing.xs },
              ]}
            >
              {step === 'phone' ? 'Sign in with your work phone number' : `Enter the code sent to ${phone}`}
            </Text>
          </Animated.View>
        </View>

        <View style={[styles.innerContainer, { paddingHorizontal: spacing.xxl }]}>
          <Animated.View
            entering={FadeInDown.duration(600).delay(200)}
            style={[
              styles.card,
              elevation.sm,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                borderColor: colors.border,
                padding: spacing.xl,
                marginTop: -spacing.xxl,
              },
            ]}
          >
            {step === 'phone' ? (
              <>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.textSecondary, fontSize: typography.sizes.label.fontSize, marginBottom: spacing.xs },
                  ]}
                >
                  Phone Number
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { borderColor: colors.border, borderRadius: radius.md, marginBottom: spacing.lg },
                  ]}
                >
                  <Phone size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    value={phone}
                    onChangeText={(v) => { setPhone(v); setErrorMsg(''); }}
                    keyboardType="phone-pad"
                    autoFocus
                    placeholder="+1 234 567 8900"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { color: colors.text, fontSize: typography.sizes.body.fontSize }]}
                    onSubmitEditing={handleSendOtp}
                  />
                </View>

                {!!errorMsg && (
                  <Text style={[styles.errorText, { color: colors.error, marginBottom: spacing.md }]}>{errorMsg}</Text>
                )}

                <PrimaryButton label="Send Code" onPress={handleSendOtp} loading={loading} disabled={!phone.trim()} />
              </>
            ) : (
              <>
                <View style={[styles.otpRow, { marginBottom: spacing.lg }]}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { otpInputRefs.current[index] = ref; }}
                      value={digit}
                      onChangeText={(v) => handleOtpChange(v, index)}
                      onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      style={[
                        styles.otpBox,
                        {
                          borderColor: digit ? colors.primary : colors.border,
                          borderRadius: radius.sm,
                          color: colors.text,
                          fontSize: typography.sizes.title.fontSize,
                        },
                      ]}
                    />
                  ))}
                </View>

                {!!errorMsg && (
                  <Text style={[styles.errorText, { color: colors.error, marginBottom: spacing.md }]}>{errorMsg}</Text>
                )}

                <PrimaryButton label="Verify & Sign In" onPress={handleVerify} loading={loading} disabled={otp.join('').length < 6} />

                <View style={[styles.footerRow, { marginTop: spacing.lg }]}>
                  <Pressable onPress={handleChangeNumber} style={styles.footerLink} hitSlop={8}>
                    <ArrowLeft size={14} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.caption.fontSize, marginLeft: 4 }}>
                      Change number
                    </Text>
                  </Pressable>

                  {countdown > 0 ? (
                    <Text style={{ color: colors.textMuted, fontSize: typography.sizes.caption.fontSize }}>
                      Resend in {countdown}s
                    </Text>
                  ) : (
                    <Pressable onPress={handleSendOtp} hitSlop={8}>
                      <Text style={{ color: colors.primary, fontSize: typography.sizes.caption.fontSize, fontWeight: '600' }}>
                        Resend Code
                      </Text>
                    </Pressable>
                  )}
                </View>

                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: typography.sizes.caption.fontSize,
                    marginTop: spacing.lg,
                    textAlign: 'center',
                  }}
                >
                  No SMS gateway configured in this environment — dev code: {DEV_OTP_HINT}
                </Text>
              </>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
      <Text style={{
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: typography.sizes.overline.fontSize,
        paddingBottom: spacing.md,
        fontWeight: '600',
        letterSpacing: 0.5,
        backgroundColor: colors.background,
      }}>
        v{process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0'}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  hero: {
    paddingTop: 56,
    paddingBottom: 64,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroBlob: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -140,
    right: -80,
  },
  innerContainer: {
    paddingHorizontal: 0,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoIcon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    width: '100%',
  },
  inputLabel: {
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    textAlign: 'center',
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
