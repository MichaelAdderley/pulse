import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
};

export function PlayIcon({ size = 14, color = '#000000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Path d="M3 2 L11 7 L3 12 Z" fill={color} />
    </Svg>
  );
}

export function PauseIcon({ size = 14, color = '#000000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Rect x="3" y="2.5" width="2.6" height="9" fill={color} rx="0.6" />
      <Rect x="8.4" y="2.5" width="2.6" height="9" fill={color} rx="0.6" />
    </Svg>
  );
}

export function ResetIcon({ size = 16, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path
        d="M3.5 8 A4.5 4.5 0 0 1 11.5 5.2"
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
      />
      <Path d="M11.5 2.5 L12.7 5.6 L9.4 5.6 Z" fill={color} />
      <Path
        d="M12.5 8 A4.5 4.5 0 0 1 4.5 10.8"
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
      />
      <Path d="M4.5 13.5 L3.3 10.4 L6.6 10.4 Z" fill={color} />
    </Svg>
  );
}

export function PlusIcon({ size = 16, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path
        d="M8 3 V13 M3 8 H13"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function XIcon({ size = 16, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path
        d="M4 4 L12 12 M12 4 L4 12"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ActiveBarsIcon({ size = 14, color = '#707070' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Rect x="1" y="8" width="2" height="5" fill={color} rx="1" />
      <Rect x="5" y="4" width="2" height="9" fill={color} rx="1" />
      <Rect x="9" y="6" width="2" height="7" fill={color} rx="1" />
    </Svg>
  );
}
