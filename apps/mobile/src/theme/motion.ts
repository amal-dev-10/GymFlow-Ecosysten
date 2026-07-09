import { WithSpringConfig, WithTimingConfig, Easing } from 'react-native-reanimated';

export const duration = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 600,
};

export const spring = {
  gentle: {
    damping: 15,
    mass: 1,
    stiffness: 120,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  } as WithSpringConfig,
  interactive: {
    damping: 20,
    mass: 0.8,
    stiffness: 150,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  } as WithSpringConfig,
  stiff: {
    damping: 10,
    mass: 0.5,
    stiffness: 180,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  } as WithSpringConfig,
  bouncy: {
    damping: 12,
    mass: 1,
    stiffness: 150,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  } as WithSpringConfig,
};

export const ease = {
  standard: {
    duration: duration.normal,
    easing: Easing.bezier(0.4, 0.0, 0.2, 1),
  } as WithTimingConfig,
  decelerate: {
    duration: duration.fast,
    easing: Easing.bezier(0.0, 0.0, 0.2, 1),
  } as WithTimingConfig,
  accelerate: {
    duration: duration.fast,
    easing: Easing.bezier(0.4, 0.0, 1, 1),
  } as WithTimingConfig,
  sharp: {
    duration: duration.normal,
    easing: Easing.bezier(0.4, 0.0, 0.6, 1),
  } as WithTimingConfig,
};

export const motion = {
  duration,
  spring,
  ease,
};

export type MotionType = typeof motion;
