import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { colors, fonts, status } from '../theme';
import { useOrders } from '../context/OrdersContext';
import OrderCard from '../components/OrderCard';
import { confirmReject, showError } from '../utils/actions';
import { useTick } from '../utils/orderFormat';

type Segment = 'new' | 'active' | 'history';

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'active', label: 'Active' },
  { key: 'history', label: 'History' },
];

const EMPTY_TEXT: Record<Segment, string> = {
  new: 'No new orders. We’ll alert you the moment one arrives.',
  active: 'No orders in progress.',
  history: 'Nothing here yet.',
};

export default function OrdersScreen({ onOpenOrder }: { onOpenOrder: (id: number) => void }) {
  const { loading, loadError, newOrders, activeOrders, historyOrders, refresh, accept, reject, markPreparing, markOrderReady } = useOrders();
  const [segment, setSegment] = useState<Segment>('new');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  useTick();

  const list = segment === 'new' ? newOrders : segment === 'active' ? activeOrders : historyOrders;

  async function run(id: number, action: () => Promise<void>) {
    setBusyId(id);
    try {
      await action();
    } catch (e) {
      showError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <View style={styles.flex}>
      <View style={styles.segments}>
        {SEGMENTS.map((sg) => {
          const on = sg.key === segment;
          return (
            <Pressable key={sg.key} onPress={() => setSegment(sg.key)} style={[styles.segment, on && styles.segmentOn]}>
              <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{sg.label}</Text>
              {sg.key === 'new' && newOrders.length > 0 && <View style={styles.dot} />}
            </Pressable>
          );
        })}
      </View>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {!!loadError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        )}
        {list.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            busy={busyId === o.id}
            onOpen={() => onOpenOrder(o.id)}
            onAccept={() => run(o.id, () => accept(o.id))}
            onReject={() => confirmReject(() => run(o.id, () => reject(o.id)))}
            onStartPreparing={() => run(o.id, () => markPreparing(o.id))}
            onMarkReady={() => run(o.id, () => markOrderReady(o.id))}
          />
        ))}
        {!loading && list.length === 0 && <Text style={styles.empty}>{EMPTY_TEXT[segment]}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  segments: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  segment: { flex: 1, height: 34, borderRadius: 99, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segmentOn: { backgroundColor: colors.primaryTint },
  segmentText: { fontFamily: fonts.bodyExtraBold, fontSize: 12, color: colors.mutedLight },
  segmentTextOn: { color: colors.primary },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: status.alert },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  empty: { marginTop: 40, textAlign: 'center', fontFamily: fonts.body, fontSize: 13, color: colors.mutedLight },
  errorBanner: { marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: status.newBg, borderWidth: 1, borderColor: '#E3A9A9' },
  errorText: { fontFamily: fonts.bodyExtraBold, fontSize: 12.5, color: status.newText },
});
