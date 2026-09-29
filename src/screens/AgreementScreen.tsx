import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, status } from '../theme';
import { submitAgreement } from '../api/agreement';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../utils/actions';
import { takeSelfie } from '../utils/photo';
import Button from '../components/Button';

// TODO(client): placeholder terms — the client must supply the real legal
// text before launch (same status as the invoice issuer fields).
const AGREEMENT_TEXT = `This Partner Agreement (the "Agreement") is entered into between Fengle and the restaurant partner named on this account ("Partner").

1. Scope. Partner agrees to fulfil orders routed to it through the Fengle platform in line with the menu, pricing and availability it maintains in the Fengle Restaurant app, and with the commission rate and delivery radius set out in Partner's physical onboarding agreement with Fengle.

2. Order handling. Partner will accept or reject each order promptly, mark items unavailable honestly rather than accepting and later failing to deliver them, and hand completed orders to the assigned rider in the condition and packaging expected of a food business.

3. Menu accuracy. Partner is responsible for the accuracy of prices, descriptions and photos it adds to the shared Fengle catalog, and for keeping stock status up to date so customers are not sold items Partner cannot fulfil.

4. Compliance. Partner confirms it holds all licenses required to prepare and sell food at the address on file, including any applicable FSSAI registration, and will keep these current for the life of this Agreement.

5. Payments. Settlement follows the commission and payout terms of Partner's physical onboarding agreement with Fengle; this in-app Agreement does not change those commercial terms.

6. Acceptance. By ticking the box below and completing photo verification, the person completing this step confirms they are the owner or an authorised signatory of Partner, and that they are personally accepting this Agreement on Partner's behalf.

This in-app Agreement is additional to, and does not replace, the physical onboarding agreement signed with Fengle.`;

type Step = 'terms' | 'selfie';

export default function AgreementScreen({ onAccepted }: { onAccepted: () => void }) {
  const { logout } = useAuth();
  const [step, setStep] = useState<Step>('terms');
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (scrolledToEnd) return;
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 24) setScrolledToEnd(true);
  }

  async function openCamera() {
    setError('');
    try {
      const uri = await takeSelfie();
      if (uri) setSelfieUri(uri);
    } catch (e) {
      Alert.alert('Couldn’t open the camera', errorMessage(e));
    }
  }

  async function submit() {
    if (!selfieUri) return;
    setBusy(true);
    setError('');
    try {
      await submitAgreement(selfieUri);
      onAccepted();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  if (step === 'terms') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Text style={styles.title}>Partner agreement</Text>
        <Text style={styles.subtitle}>Please read the agreement below. This is in addition to the physical copy you signed with Fengle.</Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.termsBox} onScroll={onScroll} scrollEventThrottle={64}>
          <Text style={styles.termsText}>{AGREEMENT_TEXT}</Text>
          {!scrolledToEnd && <Text style={styles.scrollHint}>Scroll to the end to continue</Text>}
        </ScrollView>
        <Pressable
          onPress={() => scrolledToEnd && setConfirmed((c) => !c)}
          style={[styles.checkboxRow, !scrolledToEnd && styles.checkboxRowDisabled]}
        >
          <View style={[styles.checkbox, confirmed && styles.checkboxOn]}>{confirmed && <Text style={styles.checkboxTick}>✓</Text>}</View>
          <Text style={styles.checkboxLabel}>
            I am the owner or an authorised signatory of this business, and I agree to these terms.
          </Text>
        </Pressable>
        <Button label="Continue to verification" height={52} disabled={!confirmed} onPress={() => setStep('selfie')} style={styles.cta} />
        <Text style={styles.logout} onPress={() => logout()}>
          Not the right account? Log out
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text style={styles.title}>Verify it’s you</Text>
      <Text style={styles.subtitle}>
        Take a live photo to confirm you personally accepted this agreement. Photos from your gallery can’t be used — the camera opens
        directly.
      </Text>
      <View style={styles.selfieArea}>
        {selfieUri ? (
          <Image source={{ uri: selfieUri }} style={styles.selfiePreview} />
        ) : (
          <Pressable onPress={openCamera} style={styles.cameraBtn}>
            <Text style={styles.cameraBtnText}>Open camera</Text>
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {selfieUri && (
        <View style={styles.selfieActions}>
          <Button label="Retake" variant="outline" height={50} disabled={busy} onPress={openCamera} style={styles.flex} />
          <Button label="Confirm & submit" height={52} loading={busy} onPress={submit} style={styles.flex} />
        </View>
      )}
      <Pressable onPress={() => setStep('terms')} disabled={busy}>
        <Text style={styles.back}>Back to agreement</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 22 },
  title: { marginTop: 14, fontFamily: fonts.heading, fontSize: 22, letterSpacing: -0.5, color: colors.ink },
  subtitle: { marginTop: 8, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.bodyMuted },
  scroll: { flex: 1, marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.borderAlt },
  termsBox: { padding: 16 },
  termsText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.body },
  scrollHint: { marginTop: 16, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.mutedLight },
  checkboxRow: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkboxRowDisabled: { opacity: 0.4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: colors.surfaceCream, fontSize: 13, fontFamily: fonts.bodyExtraBold },
  checkboxLabel: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 19, color: colors.ink },
  cta: { marginTop: 16 },
  logout: { marginTop: 14, marginBottom: 10, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.mutedLight },
  selfieArea: { marginTop: 24, alignItems: 'center' },
  cameraBtn: { width: '100%', height: 220, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0E8E2' },
  cameraBtnText: { fontFamily: fonts.bodyExtraBold, fontSize: 14, color: colors.primaryMid },
  selfiePreview: { width: '100%', height: 320, borderRadius: 16 },
  error: { marginTop: 14, fontFamily: fonts.bodyBold, fontSize: 12.5, color: status.alert, textAlign: 'center' },
  selfieActions: { marginTop: 18, flexDirection: 'row', gap: 10 },
  back: { marginTop: 18, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.mutedLight },
});
