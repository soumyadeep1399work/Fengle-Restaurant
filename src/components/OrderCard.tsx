import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { Order } from '../types';
import { formatMoney } from '../utils/money';
import { itemsSummary, orderTitle, paymentLabel, placedAgo, statusStyle } from '../utils/orderFormat';
import Button from './Button';

interface Props {
  order: Order;
  busy: boolean;
  onOpen: () => void;
  onAccept: () => void;
  onReject: () => void;
  onStartPreparing: () => void;
  onMarkReady: () => void;
}

export default function OrderCard({ order, busy, onOpen, onAccept, onReject, onStartPreparing, onMarkReady }: Props) {
  const isNew = order.status === 'placed';
  const accepted = order.status === 'accepted';
  const canStartPreparing = accepted && !order.preparationStartedAt;
  const canMarkReady = accepted && !!order.preparationStartedAt && !order.readyAt;
  const chip = statusStyle(order);
  // A new order is decided with buttons and a fresh acceptance with "Start preparing";
  // everything else shows where the food is instead.
  const showChip = !isNew && !canStartPreparing;

  return (
    <View style={styles.card}>
      <Pressable onPress={onOpen} style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.title}>{orderTitle(order)}</Text>
          <Text style={styles.ago}>{placedAgo(order.createdAt)}</Text>
        </View>
        {order.isClubbed && <Text style={styles.club}>Clubbed: {order.categoriesLabel} — one delivery</Text>}
        <Text style={styles.summary}>{itemsSummary(order.items)}</Text>
        <View style={styles.footerRow}>
          <Text style={styles.total}>
            {formatMoney(order.itemTotal)} · {paymentLabel(order.paymentMethod)}
          </Text>
          {showChip && (
            <View style={[styles.chip, { backgroundColor: chip.bg }]}>
              <Text style={[styles.chipText, { color: chip.color }]}>{chip.label}</Text>
            </View>
          )}
        </View>
      </Pressable>
      {isNew && (
        <View style={styles.actions}>
          <Button label="Reject" variant="outline" height={38} radius={10} fontSize={12.5} disabled={busy} onPress={onReject} style={styles.flex} />
          <Button label="Accept" height={38} radius={10} fontSize={12.5} loading={busy} onPress={onAccept} style={styles.flex} />
        </View>
      )}
      {canStartPreparing && (
        <View style={styles.actionSingle}>
          <Button label="Start preparing" variant="gold" height={38} radius={10} fontSize={12.5} loading={busy} onPress={onStartPreparing} />
        </View>
      )}
      {canMarkReady && (
        <View style={styles.actionSingle}>
          <Button label="Mark ready" variant="gold" height={38} radius={10} fontSize={12.5} loading={busy} onPress={onMarkReady} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, borderColor: colors.borderAlt, marginBottom: 12, overflow: 'hidden', backgroundColor: colors.surface },
  body: { padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 13.5, color: colors.ink },
  ago: { fontFamily: fonts.body, fontSize: 11.5, color: colors.mutedLight },
  club: { marginTop: 4, fontFamily: fonts.bodyExtraBold, fontSize: 10.5, color: colors.primaryMid },
  summary: { marginTop: 4, fontFamily: fonts.body, fontSize: 12.5, color: colors.bodyMuted },
  footerRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  total: { fontFamily: fonts.bodyExtraBold, fontSize: 13.5, color: colors.ink },
  chip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  chipText: { fontFamily: fonts.bodyExtraBold, fontSize: 10.5 },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  actionSingle: { paddingHorizontal: 14, paddingBottom: 14 },
  flex: { flex: 1 },
});
