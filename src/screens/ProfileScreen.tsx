import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { fetchRestaurantProfile } from '../api/menu';
import { useAuth } from '../context/AuthContext';
import { RestaurantProfile } from '../types';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRestaurantProfile()
      .then((p) => !cancelled && setProfile(p))
      .catch(() => {}); // the session's name is a good enough fallback
    return () => {
      cancelled = true;
    };
  }, []);

  const name = profile?.name ?? user?.name ?? 'Your kitchen';
  const address = profile?.address ?? (user?.phone ? `+91 ${user.phone}` : '');

  const rows: { label: string; danger?: boolean; onPress: () => void }[] = [
    {
      label: 'Payout details',
      onPress: () => Alert.alert('Payout details', 'Payouts are handled by the Fengle team. Contact them to update your bank details.'),
    },
    {
      label: 'Support',
      onPress: () => Alert.alert('Support', 'Reach the Fengle team for help with orders or your menu.'),
    },
    {
      label: 'Log out',
      danger: true,
      onPress: () =>
        Alert.alert('Log out?', 'You will stop receiving new orders on this device.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log out', style: 'destructive', onPress: () => logout() },
        ]),
    },
  ];

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.name}>{name}</Text>
          {!!address && <Text style={styles.address}>{address}</Text>}
        </View>
      </View>
      {rows.map((r) => (
        <Pressable key={r.label} onPress={r.onPress} style={styles.row}>
          <Text style={[styles.rowLabel, r.danger && styles.danger]}>{r.label}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 10, paddingBottom: 18 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bodyExtraBold, fontSize: 19, color: colors.primaryMid },
  name: { fontFamily: fonts.bodyExtraBold, fontSize: 15.5, color: colors.ink },
  address: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, color: colors.mutedLight },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  danger: { color: colors.primaryMid },
  chevron: { fontSize: 17, color: colors.faint },
});
