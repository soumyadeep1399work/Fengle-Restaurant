import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, status } from '../theme';
import { NavMenuIcon, NavOrdersIcon, NavProfileIcon, NavSalesIcon } from './Icons';

export type Tab = 'orders' | 'menu' | 'sales' | 'profile';

const TABS: { key: Tab; label: string; Icon: typeof NavOrdersIcon }[] = [
  { key: 'orders', label: 'Orders', Icon: NavOrdersIcon },
  { key: 'menu', label: 'Menu', Icon: NavMenuIcon },
  { key: 'sales', label: 'Sales', Icon: NavSalesIcon },
  { key: 'profile', label: 'Profile', Icon: NavProfileIcon },
];

interface Props {
  tab: Tab;
  onChange: (tab: Tab) => void;
  /** Red dot on Orders while a new order waits and another tab is open. */
  ordersAlert: boolean;
}

export default function BottomNav({ tab, onChange, ordersAlert }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: 74 + insets.bottom, paddingBottom: insets.bottom }]}>
      {TABS.map(({ key, label, Icon }) => {
        const on = key === tab;
        const tint = on ? colors.primary : colors.mutedLight;
        return (
          <Pressable key={key} onPress={() => onChange(key)} style={styles.item}>
            <Icon size={20} color={tint} strokeWidth={on ? 2.4 : 2} />
            <Text style={[styles.label, { color: on ? colors.ink : colors.mutedLight }]}>{label}</Text>
            {key === 'orders' && ordersAlert && !on && <View style={styles.alertDot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.borderAlt },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11 },
  alertDot: { position: 'absolute', top: 10, right: 22, width: 8, height: 8, borderRadius: 4, backgroundColor: status.alert },
});
