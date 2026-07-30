import React, { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { theme } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  size?: number;
  strokeWidth?: number;
  segments: number;
  completed: number;
  /**
   * 0..1 fill of the segment currently in progress (the one after
   * `completed`). While set, that segment animates smoothly toward each
   * new value; when undefined the ring renders statically.
   */
  activeProgress?: number;
};

const DEG_TO_RAD = Math.PI / 180;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg - 90) * DEG_TO_RAD;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const sweep = endDeg - startDeg;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function ProgressRing({
  size = 28,
  strokeWidth = 2.5,
  segments,
  completed,
  activeProgress,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  const gapDeg = 10;
  const segmentSpan =
    segments > 1 ? (360 - gapDeg * segments) / segments : 360;
  const segmentArcLength = (segmentSpan / 360) * circumference;

  const progress = useSharedValue(activeProgress ?? 0);

  useEffect(() => {
    if (activeProgress === undefined) return;
    if (activeProgress < progress.value) {
      // Progress moved backward (new segment or a reset) — snap, don't rewind
      cancelAnimation(progress);
      progress.value = activeProgress;
    } else {
      // Each timer tick targets the end of the current second, so a linear
      // 1s animation tracks real elapsed time continuously.
      progress.value = withTiming(activeProgress, {
        duration: 1000,
        easing: Easing.linear,
      });
    }
  }, [activeProgress, progress]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const animatedSegmentProps = useAnimatedProps(() => ({
    strokeDashoffset: segmentArcLength * (1 - progress.value),
  }));

  if (segments <= 1) {
    if (activeProgress !== undefined && completed < 1) {
      return (
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={theme.colors.ringTrack}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={cx}
            cy={cy}
            r={r}
            stroke={theme.colors.accent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={animatedCircleProps}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </Svg>
      );
    }

    const isComplete = completed >= 1;
    return (
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={isComplete ? theme.colors.accent : theme.colors.ringTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
      </Svg>
    );
  }

  const activeIndex =
    activeProgress !== undefined && completed < segments ? completed : -1;

  return (
    <Svg width={size} height={size}>
      {Array.from({ length: segments }, (_, i) => {
        const start = i * (segmentSpan + gapDeg) + gapDeg / 2;
        const end = start + segmentSpan;
        const d = arcPath(cx, cy, r, start, end);

        if (i === activeIndex) {
          return (
            <React.Fragment key={i}>
              <Path
                d={d}
                stroke={theme.colors.ringTrack}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
              />
              <AnimatedPath
                d={d}
                stroke={theme.colors.accent}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${segmentArcLength} ${segmentArcLength}`}
                animatedProps={animatedSegmentProps}
              />
            </React.Fragment>
          );
        }

        const filled = i < completed;
        return (
          <Path
            key={i}
            d={d}
            stroke={filled ? theme.colors.accent : theme.colors.ringTrack}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        );
      })}
    </Svg>
  );
}
