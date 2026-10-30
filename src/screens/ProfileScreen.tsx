import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { fetchRestaurantProfile } from '../api/menu';
import { useAuth } from '../context/AuthContext';
import { RestaurantProfile } from '../types';
import { maskedNumber } from '../utils/bank';
import BankDetailsScreen from './BankDetailsScreen';
import { usePullRefresh } from '../utils/usePullRefresh';

const ACCOUNT_DELETION_URL = 'https://fengle.in/data-deletion.html';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [bankOpen, setBankOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setProfile(await fetchRestaurantProfile());
    } catch {
      // the session's name is a good enough fallback
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const pullRefresh = usePullRefresh(loadProfile);

  if (bankOpen) {
    return <BankDetailsScreen saved={profile?.bankAccount ?? null} onSaved={setProfile} onBack={() => setBankOpen(false)} />;
  }

  const bank = profile?.bankAccount ?? null;
  const name = profile?.name ?? user?.name ?? 'Your kitchen';
  const address = profile?.address ?? (user?.phone ? `+91 ${user.phone}` : '');

  const rows: { label: string; hint?: string; hintColor?: string; danger?: boolean; onPress: () => void }[] = [
    {
      label: 'Bank details',
      hint: bank ? maskedNumber(bank.accountNumberLast4) : 'Add to get paid',
      hintColor: bank ? undefined : colors.gold,
      onPress: () => setBankOpen(true),
    },
    {
      label: 'Support',
      onPress: () => Alert.alert('Support', 'Reach the Fengle team for help with orders or your menu.'),
    },
    {
      // Google Play requires a way to request account deletion from inside the app.
      label: 'Delete account',
      onPress: () => Linking.openURL(ACCOUNT_DELETION_URL).catch(() => {}),
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
    <ScrollView style={styles.flex} contentContainerStyle={styles.content} refreshControl={pullRefresh}>
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
          <View style={styles.rowEnd}>
            {!!r.hint && <Text style={[styles.rowHint, r.hintColor ? { color: r.hintColor } : null]}>{r.hint}</Text>}
            <Text style={styles.chevron}>›</Text>
          </View>
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
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowHint: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.mutedLight },
  chevron: { fontSize: 17, color: colors.faint },
});
