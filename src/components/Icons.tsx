import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function NavOrdersIcon({ size = 20, color = '#9B8D93', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Rect x={5} y={4} width={14} height={16} rx={2} />
      <Path d="M8.5 9h7M8.5 13h7M8.5 17h4" />
    </Svg>
  );
}

export function NavMenuIcon({ size = 20, color = '#9B8D93', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M7 2v7a2 2 0 002 2v11M12 2v7a2 2 0 01-2 2" />
      <Path d="M17 2c-1.2 1.2-2 3-2 5s1 4 2 5v9" />
    </Svg>
  );
}

export function NavSalesIcon({ size = 20, color = '#9B8D93', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M4 20V10M11 20V4M18 20v-7" strokeLinecap="round" />
    </Svg>
  );
}

export function NavProfileIcon({ size = 20, color = '#9B8D93', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Circle cx={12} cy={8.2} r={3.2} />
      <Path d="M5 20c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2" />
    </Svg>
  );
}
