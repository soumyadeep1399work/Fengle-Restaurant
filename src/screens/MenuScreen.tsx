import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, status } from '../theme';
import { ApiError } from '../api/client';
import { fetchMenu, fetchRestaurantProfile, setItemAvailability } from '../api/menu';
import { useAuth } from '../context/AuthContext';
import { Category, MenuItem } from '../types';
import { formatMoney } from '../utils/money';
import { errorMessage, showError } from '../utils/actions';

interface Props {
  onAddItem: () => void;
  onEditItem: (item: MenuItem) => void;
  onAddCategory: () => void;
  /** Bumped by the shell after an item or category is created or edited, to reload the list. */
  refreshKey: number;
}

export default function MenuScreen({ onAddItem, onEditItem, onAddCategory, refreshKey }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      // The profile lists every category the kitchen serves, so a category with no items yet still gets a heading.
      const [menu, profile] = await Promise.all([fetchMenu(), fetchRestaurantProfile().catch(() => null)]);
      setItems(menu);
      setCategories(profile?.categories ?? []);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? 'Your menu isn’t available yet. Please try again shortly.' : errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function setLocal(id: number, isAvailable: boolean) {
    setItems((prev) => prev && prev.map((m) => (m.id === id ? { ...m, isAvailable } : m)));
  }

  async function toggle(item: MenuItem) {
    if (!user || pending.has(item.id)) return;
    const next = !item.isAvailable;
    setLocal(item.id, next); // optimistic — roll back if the server says no
    setPending((p) => new Set(p).add(item.id));
    try {
      await setItemAvailability(user.id, item.id, next);
    } catch (e) {
      setLocal(item.id, !next);
      showError(e);
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(item.id);
        return n;
      });
    }
  }

  // One section per category: the kitchen's own categories first (by name), then any category only seen on items.
  const sections = useMemo(() => {
    const list = items ?? [];
    const byId = new Map<number, { id: number; name: string; items: MenuItem[] }>();
    for (const c of categories) byId.set(c.id, { id: c.id, name: c.name, items: [] });
    for (const m of list) {
      if (!byId.has(m.categoryId)) byId.set(m.categoryId, { id: m.categoryId, name: m.categoryName, items: [] });
      byId.get(m.categoryId)!.items.push(m);
    }
    return [...byId.values()];
  }, [items, categories]);

  if (items === null && !error) {
    return <ActivityIndicator style={styles.loader} color={colors.primary} />;
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      <View style={styles.actions}>
        <Pressable onPress={onAddItem} style={[styles.addBtn, styles.addItem]}>
          <Text style={styles.addBtnText}>+ Add menu item</Text>
        </Pressable>
        <Pressable onPress={onAddCategory} style={[styles.addBtn, styles.addCategory]}>
          <Text style={styles.addCategoryText}>+ Category</Text>
        </Pressable>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {items && items.length === 0 && sections.length === 0 && (
        <Text style={styles.empty}>No menu items yet. Tap “Add menu item” to create your first.</Text>
      )}
      {sections.map((sec) => (
        <View key={sec.id}>
          <Text style={styles.sectionTitle}>{sec.name}</Text>
          {sec.items.length === 0 && <Text style={styles.sectionEmpty}>No items yet.</Text>}
          {sec.items.map((m) => (
            <View key={m.id} style={styles.row}>
              {m.imageUrl ? <Image source={{ uri: m.imageUrl }} style={styles.photo} /> : <View style={[styles.photo, styles.photoEmpty]} />}
              <View style={styles.flex}>
                <Text style={[styles.name, !m.isAvailable && styles.nameOff]}>{m.name}</Text>
                <Text style={styles.meta}>{formatMoney(m.price)}</Text>
              </View>
              <Pressable onPress={() => onEditItem(m)} hitSlop={8}>
                <Text style={styles.edit}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => toggle(m)} hitSlop={8} style={[styles.track, { backgroundColor: m.isAvailable ? colors.veg : status.trackOff }]}>
                <View style={[styles.thumb, { marginLeft: m.isAvailable ? 22 : 0 }]} />
              </Pressable>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 40 },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  error: { marginTop: 20, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 13, color: status.newText },
  empty: { marginTop: 40, textAlign: 'center', fontFamily: fonts.body, fontSize: 13, color: colors.mutedLight },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  nameOff: { color: colors.mutedLight },
  meta: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, color: colors.mutedLight },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  addBtn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addItem: { flex: 3, backgroundColor: colors.primary },
  addCategory: { flex: 2, borderWidth: 1.5, borderColor: colors.border },
  addBtnText: { fontFamily: fonts.bodyExtraBold, fontSize: 13, color: colors.surfaceCream },
  addCategoryText: { fontFamily: fonts.bodyExtraBold, fontSize: 13, color: colors.primaryMid },
  sectionTitle: { marginTop: 18, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.mutedLight },
  sectionEmpty: { marginTop: 8, fontFamily: fonts.body, fontSize: 12.5, color: colors.mutedLight },
  edit: { fontFamily: fonts.bodyExtraBold, fontSize: 12.5, color: colors.primaryMid },
  photo: { width: 40, height: 40, borderRadius: 10 },
  photoEmpty: { backgroundColor: '#F0E8E2' },
  // The flatboard's 26px track can't fit a sliding 20px thumb, so it's widened to a normal switch.
  track: { width: 46, height: 24, borderRadius: 99, flexDirection: 'row', alignItems: 'center', padding: 2 },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white },
});
