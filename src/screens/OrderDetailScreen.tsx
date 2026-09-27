import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { fetchOrderDetail } from '../api/orders';
import { useOrders } from '../context/OrdersContext';
import { Order, OrderLine } from '../types';
import { formatMoney } from '../utils/money';
import { confirmReject, errorMessage, showError } from '../utils/actions';
import { orderTitle, paymentLabel, statusStyle } from '../utils/orderFormat';
import Button from '../components/Button';

export default function OrderDetailScreen({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const { orders, accept, reject, markPreparing, markOrderReady } = useOrders();
  const [detail, setDetail] = useState<{ order: Order; lines: OrderLine[] } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  // Lines the kitchen can't make; sent as unavailable_item_ids when accepting.
  const [unavailable, setUnavailable] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      setDetail(await fetchOrderDetail(orderId));
      setLoadError('');
    } catch (e) {
      setLoadError(errorMessage(e));
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  // The polled list is the live source for status; the detail fetch supplies the priced lines.
  const live = orders.find((o) => o.id === orderId) ?? detail?.order ?? null;

  async function run(action: () => Promise<void>, closeAfter = false) {
    setBusy(true);
    try {
      await action();
      if (closeAfter) onClose();
      else await load();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  function toggleUnavailable(itemId: number) {
    setUnavailable((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  const chip = live ? statusStyle(live) : null;
  const lines = detail?.lines ?? [];
  const isNew = live?.status === 'placed';
  const accepted = live?.status === 'accepted';
  const canStartPreparing = accepted && !live?.preparationStartedAt;
  const canMarkReady = accepted && !!live?.preparationStartedAt && !live?.readyAt;

  const keptLines = lines.filter((l) => !l.dropped);
  const willDrop = keptLines.filter((l) => unavailable.has(l.itemId));
  const allDropped = keptLines.length > 0 && willDrop.length === keptLines.length;
  const total = keptLines.reduce((s, l) => s + (unavailable.has(l.itemId) ? 0 : l.subtotal), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.back} hitSlop={8}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.4}>
            <Path d="M15 5l-7 7 7 7" />
          </Svg>
        </Pressable>
        <Text style={styles.headerTitle}>{live ? orderTitle(live) : 'Order'}</Text>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        {!detail && !loadError && <ActivityIndicator style={styles.loader} color={colors.primary} />}
        {!!loadError && <Text style={styles.error}>{loadError}</Text>}

        {live && chip && (
          <>
            <View style={[styles.chip, { backgroundColor: chip.bg }]}>
              <Text style={[styles.chipText, { color: chip.color }]}>{chip.label}</Text>
            </View>
            {live.isClubbed && <Text style={styles.club}>Clubbed: {live.categoriesLabel} — one delivery</Text>}

            <View style={styles.deliverCard}>
              <Text style={styles.sectionLabel}>Deliver to</Text>
              <Text style={styles.address}>{live.deliveryAddress}</Text>
            </View>
          </>
        )}

        {lines.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, styles.itemsLabel]}>Items</Text>
            {lines.map((l) => {
              const off = l.dropped || unavailable.has(l.itemId);
              return (
                <View key={l.itemId} style={styles.line}>
                  <View style={styles.flex}>
                    <Text style={[styles.lineName, off && styles.struck]}>
                      {l.name} × {l.quantity}
                    </Text>
                    {l.dropped && <Text style={styles.droppedNote}>Dropped — refunded to the customer</Text>}
                    {isNew && !l.dropped && (
                      <Text style={styles.cantMake} onPress={() => toggleUnavailable(l.itemId)}>
                        {unavailable.has(l.itemId) ? 'Undo — I can make this' : 'Can’t make this'}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.linePrice, off && styles.struck]}>{formatMoney(l.subtotal)}</Text>
                </View>
              );
            })}
            <View style={styles.totalRow}>
              <Text style={styles.totalText}>Total</Text>
              <Text style={styles.totalText}>
                {formatMoney(total)} · {live ? paymentLabel(live.paymentMethod) : ''}
              </Text>
            </View>
            {isNew && willDrop.length > 0 && (
              <Text style={styles.hint}>
                The customer is refunded for the {willDrop.length === 1 ? 'item' : 'items'} you can’t make and the bill is adjusted.
              </Text>
            )}
            {isNew && allDropped && <Text style={styles.hint}>You can’t make anything in this order — reject it instead.</Text>}
          </>
        )}
      </ScrollView>

      {isNew && (
        <View style={styles.bar}>
          <Button
            label="Reject"
            variant="outline"
            height={48}
            disabled={busy}
            style={styles.flex}
            onPress={() => confirmReject(() => run(() => reject(orderId), true))}
          />
          <Button
            label={willDrop.length ? `Accept without ${willDrop.length}` : 'Accept'}
            height={50}
            loading={busy}
            disabled={!detail || allDropped}
            style={styles.flex}
            onPress={() => run(() => accept(orderId, willDrop.map((l) => l.itemId)), true)}
          />
        </View>
      )}
      {canStartPreparing && (
        <View style={styles.bar}>
          <Button label="Start preparing" variant="gold" height={50} loading={busy} style={styles.flex} onPress={() => run(() => markPreparing(orderId))} />
        </View>
      )}
      {canMarkReady && (
        <View style={styles.bar}>
          <Button label="Mark ready" variant="gold" height={50} loading={busy} style={styles.flex} onPress={() => run(() => markOrderReady(orderId))} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.surfaceAlt },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderAlt },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(37,28,33,0.06)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: 19, color: colors.ink },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20 },
  loader: { marginTop: 30 },
  error: { textAlign: 'center', marginTop: 20, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.conflictRed },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 99 },
  chipText: { fontFamily: fonts.bodyExtraBold, fontSize: 11 },
  club: { marginTop: 8, fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.primaryMid },
  deliverCard: { marginTop: 16, padding: 15, borderRadius: 14, borderWidth: 1, borderColor: colors.borderAlt, backgroundColor: colors.surface },
  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.mutedLight },
  address: { marginTop: 5, fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: colors.ink },
  itemsLabel: { marginTop: 16 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  lineName: { fontFamily: fonts.body, fontSize: 13.5, color: colors.ink },
  linePrice: { fontFamily: fonts.body, fontSize: 13.5, color: colors.bodyMuted },
  struck: { textDecorationLine: 'line-through', color: colors.mutedLight },
  droppedNote: { marginTop: 2, fontFamily: fonts.body, fontSize: 11, color: colors.mutedLight },
  cantMake: { marginTop: 3, fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.primaryMid },
  totalRow: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between' },
  totalText: { fontFamily: fonts.bodyExtraBold, fontSize: 13.5, color: colors.ink },
  hint: { marginTop: 10, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.bodyMuted },
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.borderAlt, backgroundColor: colors.surface },
});
