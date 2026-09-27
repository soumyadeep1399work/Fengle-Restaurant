import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, status } from '../theme';
import { createItem, fetchRestaurantProfile, updateItem, uploadImage, ItemChanges } from '../api/menu';
import { Category, MenuItem } from '../types';
import { errorMessage } from '../utils/actions';
import { pickPhoto, PhotoSource } from '../utils/photo';
import Button from './Button';
import CategorySheet from './CategorySheet';

interface Props {
  /** The item being edited; omit to add a new one. */
  item?: MenuItem;
  onClose: () => void;
  onSaved: () => void;
}

const PRICE_RE = /^\d{1,6}(\.\d{1,2})?$/;

// Add / edit form. Mounted only while open (so it starts fresh each time), and a
// plain overlay rather than <Modal> — same as the customer app's sheets — so
// Android's window-resize keyboard handling lifts it above the keyboard.
export default function ItemSheet({ item, onClose, onSaved }: Props) {
  const editing = !!item;
  const insets = useSafeAreaInsets();
  // The kitchen's approved categories — the only ones the backend lets it add to.
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [name, setName] = useState(item?.name ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [categoryId, setCategoryId] = useState<number | null>(item?.categoryId ?? null);
  const [isVeg, setIsVeg] = useState<boolean | null>(item ? item.isVeg : null); // new items have no default: a wrong label is worse than a blank
  const [photoUri, setPhotoUri] = useState<string | null>(null); // a newly picked photo, not yet uploaded
  const [existingUrl, setExistingUrl] = useState<string | null>(item?.imageUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);

  // An existing item's category is fixed, so only new items need the list.
  useEffect(() => {
    if (editing) return;
    let cancelled = false;
    fetchRestaurantProfile()
      .then((p) => {
        if (cancelled) return;
        const list = p?.categories ?? [];
        setCategories(list);
        if (list.length === 1) setCategoryId(list[0].id); // a lone category is preselected
      })
      .catch((e) => {
        if (cancelled) return;
        setCategories([]);
        setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [editing]);

  const trimmedName = name.trim();
  const priceValid = PRICE_RE.test(price) && Number(price) > 0;
  const photoChanged = photoUri !== null || (editing && existingUrl !== (item?.imageUrl ?? null));
  const changed = !editing || trimmedName !== item!.name || Number(price) !== item!.price || isVeg !== item!.isVeg || photoChanged;
  const canSave = trimmedName.length > 0 && priceValid && categoryId !== null && isVeg !== null && changed;
  const shownPhoto = photoUri ?? existingUrl;

  async function choosePhoto(source: PhotoSource) {
    try {
      const uri = await pickPhoto(source);
      if (uri) setPhotoUri(uri);
    } catch (e) {
      Alert.alert('Couldn’t add the photo', errorMessage(e));
    }
  }

  function photoMenu() {
    Alert.alert('Item photo', undefined, [
      { text: 'Take photo', onPress: () => choosePhoto('camera') },
      { text: 'Choose from gallery', onPress: () => choosePhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // A category the kitchen just joined or created appears in the list and is selected.
  function onCategoryAdded(category: Category) {
    setCategories((prev) => (prev && prev.some((c) => c.id === category.id) ? prev : [...(prev ?? []), category]));
    setCategoryId(category.id);
    setCategorySheetOpen(false);
  }

  function removePhoto() {
    setPhotoUri(null);
    setExistingUrl(null);
  }

  async function save() {
    if (!canSave || categoryId === null || isVeg === null) return;
    setSaving(true);
    setError('');
    try {
      // Upload first: if it fails nothing has been created or changed yet.
      const uploaded = photoUri ? await uploadImage(photoUri) : undefined;
      if (item) {
        const changes: ItemChanges = {};
        if (trimmedName !== item.name) changes.name = trimmedName;
        if (Number(price) !== item.price) changes.price = Number(price);
        if (isVeg !== item.isVeg) changes.isVeg = isVeg;
        if (uploaded) changes.imageUrl = uploaded;
        else if (existingUrl === null && item.imageUrl !== null) changes.imageUrl = null;
        await updateItem(item.id, changes);
      } else {
        await createItem({ categoryId, name: trimmedName, price: Number(price), isVeg, imageUrl: uploaded });
      }
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.scrim} onPress={saving ? undefined : onClose} />
      <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{editing ? 'Edit menu item' : 'Add menu item'}</Text>
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll} contentContainerStyle={styles.form}>
          {editing && (
            <Text style={styles.sharedNote}>
              This item is shared with other kitchens. Changes show for every kitchen and for customers.
            </Text>
          )}

          <Pressable onPress={photoMenu} style={styles.photoRow}>
            {shownPhoto ? (
              <Image source={{ uri: shownPhoto }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoEmpty]}>
                <Text style={styles.photoPlus}>+</Text>
              </View>
            )}
            <View style={styles.flex}>
              <Text style={styles.photoTitle}>{shownPhoto ? 'Change photo' : 'Add a photo'}</Text>
              <Text style={styles.photoHint}>Optional. A clear, well-lit shot of the dish works best.</Text>
            </View>
          </Pressable>
          {shownPhoto && (
            <Text style={styles.remove} onPress={removePhoto}>
              Remove photo
            </Text>
          )}

          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Chicken Roll"
            placeholderTextColor={colors.faint}
            maxLength={80}
            style={styles.input}
          />

          <Text style={styles.label}>Price (₹)</Text>
          <TextInput
            value={price}
            onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ''))}
            placeholder="120"
            placeholderTextColor={colors.faint}
            keyboardType="decimal-pad"
            maxLength={9}
            style={styles.input}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {editing ? (
              <>
                <Chip label={item!.categoryName} on={false} onPress={() => {}} disabled />
                <Text style={styles.photoHint}>An item’s category can’t be changed.</Text>
              </>
            ) : (
              <>
                {categories === null && <ActivityIndicator color={colors.primary} />}
                {categories?.map((c) => (
                  <Chip key={c.id} label={c.name} on={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
                ))}
                {categories !== null && <Chip label="+ Add category" on={false} onPress={() => setCategorySheetOpen(true)} />}
              </>
            )}
          </View>

          <Text style={styles.label}>Type</Text>
          <View style={styles.chips}>
            <Chip label="Veg" on={isVeg === true} tone="veg" onPress={() => setIsVeg(true)} />
            <Chip label="Non-veg" on={isVeg === false} tone="nonVeg" onPress={() => setIsVeg(false)} />
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
        <Button label={editing ? 'Save changes' : 'Save item'} height={50} loading={saving} disabled={!canSave} onPress={save} style={styles.save} />
      </View>
      {categorySheetOpen && <CategorySheet onClose={() => setCategorySheetOpen(false)} onDone={onCategoryAdded} />}
    </View>
  );
}

function Chip({ label, on, onPress, tone, disabled }: { label: string; on: boolean; onPress: () => void; tone?: 'veg' | 'nonVeg'; disabled?: boolean }) {
  const accent = tone === 'veg' ? colors.veg : tone === 'nonVeg' ? colors.nonVeg : colors.primary;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.chip, on && { borderColor: accent, backgroundColor: tone ? colors.white : colors.primaryTint }, disabled && styles.chipDisabled]}
    >
      <Text style={[styles.chipText, on && { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 24, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(37,28,33,0.55)' },
  sheet: { backgroundColor: colors.sheetBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingHorizontal: 22, maxHeight: '92%' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 99, backgroundColor: colors.border, marginBottom: 12 },
  title: { fontFamily: fonts.heading, fontSize: 19, color: colors.ink },
  form: { paddingBottom: 6 },
  sharedNote: { marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: colors.goldChipBg, fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 17, color: colors.goldChipText },
  photoRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  photo: { width: 76, height: 76, borderRadius: 14 },
  photoEmpty: { backgroundColor: '#F0E8E2', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  photoPlus: { fontFamily: fonts.bodyBold, fontSize: 26, color: colors.mutedLight },
  photoTitle: { fontFamily: fonts.bodyExtraBold, fontSize: 13.5, color: colors.primaryMid },
  photoHint: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.mutedLight },
  remove: { marginTop: 8, fontFamily: fonts.bodyBold, fontSize: 12, color: colors.bodyMuted },
  label: { marginTop: 16, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.mutedLight },
  input: { marginTop: 6, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, backgroundColor: colors.white },
  chips: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 99, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  chipDisabled: { backgroundColor: colors.greyChipBg },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.bodyMuted },
  error: { marginTop: 14, fontFamily: fonts.bodyBold, fontSize: 12.5, color: status.alert },
  save: { marginTop: 14 },
});
