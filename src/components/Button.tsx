import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, fonts } from '../theme';

type Variant = 'primary' | 'gold' | 'outline';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  height?: number;
  radius?: number;
  fontSize?: number;
  loading?: boolean;
  disabled?: boolean;
  /** Overrides the label colour (e.g. for an outline button on a dark screen). */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const BG: Record<Variant, string> = { primary: colors.primary, gold: colors.gold, outline: 'transparent' };
const FG: Record<Variant, string> = { primary: colors.surfaceCream, gold: colors.ink, outline: colors.bodyMuted };

export default function Button({
  label, onPress, variant = 'primary', height = 48, radius = 14, fontSize = 14, loading, disabled, color, style,
}: Props) {
  const inactive = disabled || loading;
  const fg = color ?? FG[variant];
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          borderRadius: radius,
          backgroundColor: BG[variant],
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize, color: fg }}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
