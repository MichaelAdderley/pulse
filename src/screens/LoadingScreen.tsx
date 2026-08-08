import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../theme';

const avatarSource = require('../../assets/avatar.png');

const RING_SIZE = 104;
const STROKE_WIDTH = 3;
const AVATAR_SIZE = 68;

const RING_R = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;
// A quarter arc sweeps around the track, matching the ring style used on
// exercise rows (round caps, same track color underneath).
const ARC_LENGTH = CIRCUMFERENCE * 0.25;

type Props = {
  /** Once true the screen plays its exit animation, then calls onDone. */
  dismiss: boolean;
  onDone: () => void;
};

export function LoadingScreen({ dismiss, onDone }: Props) {
  const overlayOpacity = useSharedValue(1);
  const contentScale = useSharedValue(0.92);
  const contentOpacity = useSharedValue(0);
  const wordmarkOpacity = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    contentOpacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
    contentScale.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    wordmarkOpacity.value = withDelay(
      250,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }),
    );
    spin.value = withRepeat(
      withTiming(360, { duration: 1100, easing: Easing.linear }),
      -1,
    );
  }, [contentOpacity, contentScale, wordmarkOpacity, spin]);

  useEffect(() => {
    if (!dismiss) return;
    contentScale.value = withTiming(1.06, {
      duration: 450,
      easing: Easing.in(Easing.cubic),
    });
    overlayOpacity.value = withTiming(
      0,
      { duration: 420, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) runOnJS(onDone)();
      },
    );
  }, [dismiss, contentScale, overlayOpacity, onDone]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }));
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
  }));

  return (
    <Animated.View
      style={[styles.overlay, overlayStyle]}
      pointerEvents={dismiss ? 'none' : 'auto'}
      // The native splash hands off once this first frame is on screen
      onLayout={() => {
        SplashScreen.hideAsync().catch(() => {});
      }}
    >
      <Animated.View style={[styles.content, contentStyle]}>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={theme.colors.ringTrack}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
          </Svg>
          <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_R}
                stroke={theme.colors.accent}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE - ARC_LENGTH}`}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
          </Animated.View>
          <Image source={avatarSource} style={styles.avatar} />
        </View>
        <Animated.View style={wordmarkStyle}>
          <Text style={styles.wordmark}>Pulse</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: theme.spacing.xl,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: theme.radius.pill,
  },
  wordmark: {
    ...theme.typography.headline,
    color: theme.colors.textPrimary,
  },
});
