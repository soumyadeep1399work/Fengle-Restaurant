import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, status } from '../theme';
import Button from '../components/Button';
import { saveBankAccount } from '../api/menu';
import { BankAccount, RestaurantProfile } from '../types';
import { errorMessage } from '../utils/actions';
import { maskedNumber, normalizeAccountNumber, normalizeIfsc, normalizeUpi, validateBankForm } from '../utils/bank';

interface Props {
  saved: BankAccount | null;
  onSaved: (profile: RestaurantProfile) => void;
  onBack: () => void;
}

/** Where the kitchen's payout is sent. Shows what is saved (masked) and lets them add or replace it. */
export default function BankDetailsScreen({ saved, onSaved, onBack }: Props) {
  const [editing, setEditing] = useState(!saved);
  const [justSaved, setJustSaved] = useState(false);

  const [holderName, setHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmNumber, setConfirmNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function startEditing() {
    // The server only ever returns the last 4 digits, so the number is always re-typed; the rest can be prefilled.
    setHolderName(saved?.accountHolderName ?? '');
    setIfsc(saved?.ifsc ?? '');
    setUpiId(saved?.upiId ?? '');
    setAccountNumber('');
    setConfirmNumber('');
    setError('');
    setJustSaved(false);
    setEditing(true);
  }

  async function save() {
    const problem = validateBankForm({ holderName, accountNumber, confirmNumber, ifsc, upiId });
    if (problem) return setError(problem);
    setBusy(true);
    setError('');
    try {
      onSaved(await saveBankAccount({ accountHolderName: holderName.trim(), accountNumber, ifsc, upiId: upiId || null }));
      setEditing(false);
      setJustSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onBack} hitSlop={10} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Bank details</Text>
        <Text style={styles.subtitle}>Your payouts from Fengle are sent to this account. Please check every number carefully; a wrong digit can send money to someone else.</Text>

        {!editing && saved ? (
          <View style={styles.card}>
            {justSaved && <Text style={styles.savedNote}>Saved. Your payouts will go to this account.</Text>}
            <Text style={styles.label}>Account holder</Text>
            <Text style={styles.value}>{saved.accountHolderName}</Text>
            <Text style={styles.label}>Account number</Text>
            <Text style={styles.value}>{maskedNumber(saved.accountNumberLast4)}</Text>
            <Text style={styles.label}>IFSC</Text>
            <Text style={styles.value}>{saved.ifsc}{saved.bankName ? ` · ${saved.bankName}` : ''}</Text>
            {!!saved.upiId && (
              <>
                <Text style={styles.label}>UPI ID</Text>
                <Text style={styles.value}>{saved.upiId}</Text>
              </>
            )}
            <Button label="Change bank details" variant="outline" height={46} onPress={startEditing} style={styles.changeBtn} />
          </View>
        ) : (
          <View>
            <Text style={styles.label}>Account holder name</Text>
            <TextInput value={holderName} onChangeText={setHolderName} placeholder="Name as on the passbook" placeholderTextColor={colors.faint} autoCapitalize="words" style={styles.input} />

            <Text style={styles.label}>Account number</Text>
            <TextInput
              value={accountNumber}
              onChangeText={(v) => setAccountNumber(normalizeAccountNumber(v))}
              placeholder="Account number"
              placeholderTextColor={colors.faint}
              keyboardType="number-pad"
              // The number is a secret: keep it out of autofill suggestions and screenshots-of-keyboard-history where the OS allows.
              autoComplete="off"
              autoCorrect={false}
              style={styles.input}
            />

            <Text style={styles.label}>Confirm account number</Text>
            <TextInput
              value={confirmNumber}
              onChangeText={(v) => setConfirmNumber(normalizeAccountNumber(v))}
              placeholder="Type it again"
              placeholderTextColor={colors.faint}
              keyboardType="number-pad"
              autoComplete="off"
              autoCorrect={false}
              style={styles.input}
            />

            <Text style={styles.label}>IFSC code</Text>
            <TextInput
              value={ifsc}
              onChangeText={(v) => setIfsc(normalizeIfsc(v))}
              placeholder="e.g. SBIN0001234"
              placeholderTextColor={colors.faint}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
            />
            <Text style={styles.hint}>You can find it on your passbook or cheque book.</Text>

            <Text style={styles.label}>UPI ID (optional)</Text>
            <TextInput
              value={upiId}
              onChangeText={(v) => setUpiId(normalizeUpi(v))}
              placeholder="name@bank"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Button label="Save bank details" height={52} loading={busy} onPress={save} style={styles.saveBtn} />
            {!!saved && <Button label="Cancel" variant="outline" height={46} onPress={() => { setEditing(false); setError(''); }} style={styles.cancelBtn} />}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  back: { alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 6 },
  backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryMid },
  title: { fontFamily: fonts.heading, fontSize: 22, letterSpacing: -0.5, color: colors.ink },
  subtitle: { marginTop: 8, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.bodyMuted },
  card: { marginTop: 18, borderRadius: 14, borderWidth: 1, borderColor: colors.borderAlt, backgroundColor: colors.surfaceAlt, padding: 16 },
  savedNote: { marginBottom: 6, fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.veg },
  label: { marginTop: 18, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.mutedLight },
  value: { marginTop: 4, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  input: {
    marginTop: 6, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14,
    fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink,
  },
  hint: { marginTop: 6, fontFamily: fonts.body, fontSize: 12, color: colors.mutedLight },
  error: { marginTop: 16, fontFamily: fonts.bodyBold, fontSize: 12.5, lineHeight: 18, color: status.alert },
  saveBtn: { marginTop: 22 },
  cancelBtn: { marginTop: 10 },
  changeBtn: { marginTop: 22 },
});
