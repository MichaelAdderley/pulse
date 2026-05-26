import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { theme } from '../theme';

type Props = {
  size?: number;
  strokeWidth?: number;
  segments: number;
  completed: number;
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
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;

  if (segments <= 1) {
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

  const gapDeg = 10;
  const segmentSpan = (360 - gapDeg * segments) / segments;

  return (
    <Svg width={size} height={size}>
      {Array.from({ length: segments }, (_, i) => {
        const start = i * (segmentSpan + gapDeg) + gapDeg / 2;
        const end = start + segmentSpan;
        const filled = i < completed;
        return (
          <Path
            key={i}
            d={arcPath(cx, cy, r, start, end)}
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
