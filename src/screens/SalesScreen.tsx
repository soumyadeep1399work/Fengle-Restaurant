import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';
import { useOrders } from '../context/OrdersContext';
import { formatMoney } from '../utils/money';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// There's no sales endpoint, so revenue is worked out from the kitchen's own
// delivered orders (food value after any dropped items, before GST and delivery).
export default function SalesScreen() {
  const { orders } = useOrders();

  const { today, weekRows } = useMemo(() => {
    const totals = new Map<string, { count: number; amount: number }>();
    for (const o of orders) {
      if (o.status !== 'delivered' || !o.deliveredAt) continue;
      const k = dayKey(new Date(o.deliveredAt));
      const t = totals.get(k) ?? { count: 0, amount: 0 };
      t.count += 1;
      t.amount += o.itemTotal;
      totals.set(k, t);
    }

    const now = new Date();
    const mondayOffset = (now.getDay() + 6) % 7; // Monday-based week
    const rows: { day: string; count: number; amount: number }[] = [];
    for (let i = mondayOffset; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const t = totals.get(dayKey(d)) ?? { count: 0, amount: 0 };
      rows.push({ day: i === 0 ? 'Today' : DAYS[d.getDay()], ...t });
    }
    return { today: totals.get(dayKey(now)) ?? { count: 0, amount: 0 }, weekRows: rows };
  }, [orders]);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <LinearGradient colors={[colors.primary, '#2F0F6B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroLabel}>Today’s revenue</Text>
        <Text style={styles.heroValue}>{formatMoney(today.amount)}</Text>
        <Text style={styles.heroSub}>
          {today.count} {today.count === 1 ? 'order' : 'orders'} completed
        </Text>
      </LinearGradient>

      <Text style={styles.sectionLabel}>This week</Text>
      {weekRows.map((w, i) => (
        <View key={i} style={styles.row}>
          <View>
            <Text style={styles.day}>{w.day}</Text>
            <Text style={styles.count}>
              {w.count} {w.count === 1 ? 'order' : 'orders'}
            </Text>
          </View>
          <Text style={styles.amount}>{formatMoney(w.amount)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  hero: { borderRadius: 16, padding: 20 },
  heroLabel: { fontFamily: fonts.bodyBold, fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,248,244,0.75)' },
  heroValue: { marginTop: 6, fontFamily: fonts.heading, fontSize: 30, letterSpacing: -0.8, color: colors.surfaceCream },
  heroSub: { marginTop: 6, fontFamily: fonts.body, fontSize: 11.5, color: 'rgba(255,248,244,0.75)' },
  sectionLabel: { marginTop: 20, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.mutedLight },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  day: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  count: { marginTop: 2, fontFamily: fonts.body, fontSize: 11, color: colors.mutedLight },
  amount: { fontFamily: fonts.bodyExtraBold, fontSize: 13.5, color: colors.ink },
});
