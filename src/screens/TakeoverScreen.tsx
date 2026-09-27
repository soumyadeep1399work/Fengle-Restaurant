import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, status } from '../theme';
import { useOrders } from '../context/OrdersContext';
import { Order } from '../types';
import { formatMoney } from '../utils/money';
import { confirmReject, errorMessage } from '../utils/actions';
import { itemsSummary, orderTitle, paymentLabel } from '../utils/orderFormat';
import Button from '../components/Button';

// Full-screen "respond now" alert. There's no push yet, so it appears when the
// poll finds a new order while the app is open; it buzzes until answered.
export default function TakeoverScreen({ order }: { order: Order }) {
  const { accept, reject } = useOrders();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Vibration.vibrate([0, 700, 500], true);
    return () => Vibration.cancel();
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>New order — respond now</Text>
        </View>
        <Text style={styles.title}>{orderTitle(order)}</Text>
        {order.isClubbed && <Text style={styles.club}>Clubbed: {order.categoriesLabel} — one delivery</Text>}
        <Text style={styles.summary}>{itemsSummary(order.items)}</Text>
        <Text style={styles.total}>
          {formatMoney(order.itemTotal)} · {paymentLabel(order.paymentMethod)}
        </Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
      <View style={styles.actions}>
        <Button
          label="Reject"
          variant="outline"
          color="rgba(255,248,244,0.9)"
          height={52}
          disabled={busy}
          style={[styles.flex, styles.rejectBtn]}
          onPress={() => confirmReject(() => run(() => reject(order.id)))}
        />
        <Button label="Accept" variant="gold" height={52} loading={busy} style={styles.flex} onPress={() => run(() => accept(order.id))} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: status.takeoverBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 30 },
  badge: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 99, backgroundColor: status.alert },
  badgeText: { fontFamily: fonts.bodyExtraBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.surfaceCream },
  title: { fontFamily: fonts.heading, fontSize: 24, letterSpacing: -0.5, color: colors.surfaceCream, textAlign: 'center' },
  club: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.gold, textAlign: 'center' },
  summary: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, color: 'rgba(255,248,244,0.8)', textAlign: 'center' },
  total: { fontFamily: fonts.bodyExtraBold, fontSize: 20, color: colors.surfaceCream },
  error: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: '#F2A3A3', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  rejectBtn: { borderColor: 'rgba(255,248,244,0.3)' },
});
