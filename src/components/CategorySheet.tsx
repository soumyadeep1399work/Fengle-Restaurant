import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, status } from '../theme';
import { CategoryOption, CategoryOptions, createCategory, fetchCategoryOptions, joinCategory } from '../api/categories';
import { Category } from '../types';
import { errorMessage } from '../utils/actions';

interface Props {
  onClose: () => void;
  /** Called after a category was added to (or created for) this kitchen. */
  onDone: (category: Category) => void;
}

const SEARCH_DELAY_MS = 300;

// Pick-first: the kitchen sees every existing category and only creates a new
// one as a last resort. Whether a name is a duplicate ("Momos" vs "Momo") is
// decided by the server; this sheet just shows its answer. A plain overlay, not
// <Modal>, so Android lifts it above the keyboard (see ItemSheet).
export default function CategorySheet({ onClose, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<CategoryOptions | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(
      async () => {
        try {
          const result = await fetchCategoryOptions(query);
          if (id === requestId.current) {
            setOptions(result);
            setLoadError('');
          }
        } catch (e) {
          if (id === requestId.current) setLoadError(errorMessage(e));
        }
      },
      query ? SEARCH_DELAY_MS : 0
    );
    return () => clearTimeout(timer);
  }, [query]);

  const trimmed = query.trim();
  const shownIds = new Set<number>();
  if (options?.exact) shownIds.add(options.exact.id);
  const similar = options?.exact ? [] : (options?.similar ?? []);
  similar.forEach((c) => shownIds.add(c.id));
  const rest = (options?.categories ?? []).filter((c) => !shownIds.has(c.id));
  const canCreate = trimmed.length >= 2 && !options?.exact;

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

  function join(option: CategoryOption) {
    if (option.joined || busy) return;
    run(async () => onDone(await joinCategory(option.id)));
  }

  function create() {
    if (busy) return;
    run(async () => {
      const result = await createCategory(trimmed);
      if (result.status === 'created') return onDone(result.category);
      setBusy(false);
      if (result.status === 'exists') {
        // Same category under another spelling — steer to the existing one.
        Alert.alert(
          `“${result.category.name}” already exists`,
          result.category.joined ? 'You already serve it.' : 'Add it to your kitchen instead of creating a duplicate.',
          result.category.joined
            ? [{ text: 'OK' }]
            : [{ text: 'Cancel', style: 'cancel' }, { text: `Add ${result.category.name}`, onPress: () => join(result.category) }]
        );
        return;
      }
      // Close to existing names: offer the likeliest, or let them insist.
      const best = result.similar[0];
      const names = result.similar.map((c) => c.name).join(', ');
      Alert.alert(`Did you mean ${names}?`, 'Fengle shows one category per dish, so a duplicate would split your orders.', [
        { text: 'Cancel', style: 'cancel' },
        ...(best && !best.joined ? [{ text: `Use ${best.name}`, onPress: () => join(best) }] : []),
        {
          text: 'Create anyway',
          onPress: () =>
            run(async () => {
              const forced = await createCategory(trimmed, true);
              if (forced.status === 'created') return onDone(forced.category);
              setBusy(false);
              setError('That category already exists. Pick it from the list.');
            }),
        },
      ]);
    });
  }

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.scrim} onPress={busy ? undefined : onClose} />
      <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Add a category</Text>
        <Text style={styles.sub}>Pick one that already exists. Only create a new one if it isn’t there.</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search, e.g. Momo"
          placeholderTextColor={colors.faint}
          maxLength={40}
          autoFocus
          style={styles.input}
        />

        <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll} contentContainerStyle={styles.list}>
          {options === null && !loadError && <ActivityIndicator style={styles.loader} color={colors.primary} />}
          {!!loadError && <Text style={styles.error}>{loadError}</Text>}

          {options?.exact && (
            <>
              <Text style={styles.section}>Already on Fengle</Text>
              <Row option={options.exact} highlight onPress={() => join(options.exact!)} />
            </>
          )}
          {similar.length > 0 && (
            <>
              <Text style={styles.section}>Did you mean</Text>
              {similar.map((c) => (
                <Row key={c.id} option={c} highlight onPress={() => join(c)} />
              ))}
            </>
          )}
          {rest.length > 0 && (
            <>
              <Text style={styles.section}>{trimmed ? 'Other matches' : 'All categories'}</Text>
              {rest.map((c) => (
                <Row key={c.id} option={c} onPress={() => join(c)} />
              ))}
            </>
          )}
          {options && rest.length === 0 && !options.exact && similar.length === 0 && (
            <Text style={styles.empty}>{trimmed ? 'No category with that name yet.' : 'No categories yet.'}</Text>
          )}

          {canCreate && (
            <Pressable onPress={create} style={styles.createRow}>
              <Text style={styles.createText}>Create new category “{trimmed}”</Text>
            </Pressable>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
        {busy && <ActivityIndicator style={styles.busy} color={colors.primary} />}
      </View>
    </View>
  );
}

function Row({ option, onPress, highlight }: { option: CategoryOption; onPress: () => void; highlight?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.row, highlight && styles.rowHighlight]}>
      <Text style={styles.rowName}>{option.name}</Text>
      {option.joined ? <Text style={styles.added}>Added</Text> : <Text style={styles.add}>Add</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 1100, elevation: 26, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(37,28,33,0.55)' },
  sheet: { backgroundColor: colors.sheetBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingHorizontal: 22, maxHeight: '92%' },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 99, backgroundColor: colors.border, marginBottom: 12 },
  title: { fontFamily: fonts.heading, fontSize: 19, color: colors.ink },
  sub: { marginTop: 4, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: colors.bodyMuted },
  input: { marginTop: 12, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, backgroundColor: colors.white },
  scroll: { flexGrow: 0, flexShrink: 1, marginTop: 6 },
  list: { paddingBottom: 6 },
  loader: { marginTop: 20 },
  section: { marginTop: 14, marginBottom: 2, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.mutedLight },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowHighlight: { backgroundColor: colors.primaryTint, paddingHorizontal: 12, borderRadius: 10, borderBottomWidth: 0, marginTop: 6 },
  rowName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  add: { fontFamily: fonts.bodyExtraBold, fontSize: 12.5, color: colors.primaryMid },
  added: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.veg },
  empty: { marginTop: 18, textAlign: 'center', fontFamily: fonts.body, fontSize: 13, color: colors.mutedLight },
  createRow: { marginTop: 16, height: 46, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  createText: { fontFamily: fonts.bodyExtraBold, fontSize: 13, color: colors.primaryMid },
  error: { marginTop: 14, fontFamily: fonts.bodyBold, fontSize: 12.5, color: status.alert },
  busy: { position: 'absolute', top: 18, right: 22 },
});
