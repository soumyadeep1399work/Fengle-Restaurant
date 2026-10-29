import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, status } from '../theme';
import { submitAgreement } from '../api/agreement';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../utils/actions';
import { takeSelfie } from '../utils/photo';
import Button from '../components/Button';

// The Fengle Restaurant Partnership Agreement, as supplied by the client (2026-10-29). Only obvious slips were
// corrected, and none of the meaning: "Cociliation" -> "Conciliation", the Act's year "1896" -> "1996", a missing
// "on" in the commission line, and two missing full stops.
// If this wording ever changes after kitchens have accepted it, bump AGREEMENT_VERSION (api/agreement.ts) together
// with the backend's CURRENT_AGREEMENT_VERSION so they accept the new text.
const AGREEMENT_TITLE = 'Fengle Restaurant Partnership Agreement';

const AGREEMENT_TERMS: string[] = [
  'You are an independent, non-exclusive partner of Fengle, not an employee, agent or joint venture partner, and Fengle does not guarantee order volume.',
  'Customers order item by item by cuisine category, and Fengle routes each order automatically to the nearest available partner restaurant.',
  'Your restaurant name, logo and location are never shown to customers, and you must not reveal that you supply Fengle.',
  'Pack every order in Fengle-specified packaging with no branding, menus, pamphlets or contact details of your own. Fengle may or may not provide packaging material.',
  'You declare Base Prices (not higher than your walk-in prices), and Fengle alone sets customer prices, fees, discounts and offers.',
  'Fengle charges commission on the Item Value of every item sold (GST on the commission, if applicable, is extra), as agreed.',
  'Payouts go to your bank account weekly or daily on the basis of mutual consent. Net commission, refunds, penalties and statutory deductions may be adjusted.',
  'Report any settlement discrepancy within 3 days, or the statement is deemed accepted.',
  'Accept or reject each order within three minutes, prepare it within the stated preparation time, and keep item availability and operating hours updated in the app.',
  'Food must be fresh, safe and the same quality as your own customers get, as required by FSSAI and food safety law.',
  'In case of unforeseen circumstances, order cancellation, an incorrect delivery address, or if the customer is unreachable or fails to answer the delivery partner’s calls, the food order will be returned to the restaurant. The restaurant reserves the right to sell or serve the returned order to another customer, subject to food safety and quality standards.',
  'You bear the cost of refunds and penalties for cancellations, delays, wrong or poor-quality orders and other faults that are yours.',
  'Fengle handles all delivery within 3 km (extendable to 5 km) and handles all customer support.',
  'You must hold and maintain a valid FSSAI licence, GST registration (where applicable) and a trade licence, and follow all applicable laws.',
  'Platform and customer data and the Fengle brand belong to Fengle, and you let Fengle use your menu content and photos without revealing your identity.',
  'You indemnify Fengle for food-safety defects and your breaches, and Fengle’s liability to you is capped at your last 3 months’ payouts, with no liability for platform downtime.',
  'Fengle may suspend or terminate you immediately for serious breaches, and disputes go to arbitration in Kolkata under Indian law and Arbitration and Conciliation Act, 1996 (as amended).',
];

// Shown right above the button: tapping "I Agree" is the act of consent.
const AGREEMENT_ACCEPT_TEXT =
  'By tapping ‘I Agree’, I confirm I am authorised to bind my restaurant and accept the Fengle Restaurant Partnership Agreement, including the terms above.';

type Step = 'terms' | 'selfie';

function DeniedBanner({ reason }: { reason?: string | null }) {
  if (!reason) return null;
  return (
    <View style={bannerStyles.box}>
      <Text style={bannerStyles.title}>Your photo wasn’t approved</Text>
      <Text style={bannerStyles.text}>{reason}. Please read the agreement and take a new photo.</Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  box: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: '#FBE9E7' },
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 13, color: status.alert },
  text: { marginTop: 3, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: colors.body },
});

export default function AgreementScreen({ onAccepted, deniedReason }: { onAccepted: () => void; deniedReason?: string | null }) {
  const { logout } = useAuth();
  const [step, setStep] = useState<Step>('terms');
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [layoutH, setLayoutH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // A tall screen may show every term without any scrolling; otherwise onScroll would never fire and "I Agree"
  // would stay disabled for good.
  useEffect(() => {
    if (layoutH > 0 && contentH > 0 && contentH <= layoutH + 24) setScrolledToEnd(true);
  }, [layoutH, contentH]);

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
        <Text style={styles.title}>{AGREEMENT_TITLE}</Text>
        <DeniedBanner reason={deniedReason} />
        <Text style={styles.subtitle}>Please read the agreement below. This is in addition to the physical copy you signed with Fengle.</Text>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.termsBox}
          onScroll={onScroll}
          scrollEventThrottle={64}
          onLayout={(e) => setLayoutH(e.nativeEvent.layout.height)}
          onContentSizeChange={(_, h) => setContentH(h)}
        >
          {AGREEMENT_TERMS.map((term, i) => (
            <View key={i} style={styles.termRow}>
              <Text style={styles.bullet}>{'\u2022'}</Text>
              <Text style={styles.termText}>{term}</Text>
            </View>
          ))}
          {!scrolledToEnd && <Text style={styles.scrollHint}>Scroll to the end to continue</Text>}
        </ScrollView>
        <Text style={[styles.acceptText, !scrolledToEnd && styles.acceptTextDisabled]}>{AGREEMENT_ACCEPT_TEXT}</Text>
        <Button label="I Agree" height={52} disabled={!scrolledToEnd} onPress={() => setStep('selfie')} style={styles.cta} />
        <Text style={styles.logout} onPress={() => logout()}>
          Not the right account? Log out
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text style={styles.title}>Verify it’s you</Text>
      <DeniedBanner reason={deniedReason} />
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
  termRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  bullet: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 20, color: colors.primaryMid },
  termText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.body },
  scrollHint: { marginTop: 4, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.mutedLight },
  acceptText: { marginTop: 14, fontFamily: fonts.bodyBold, fontSize: 12.5, lineHeight: 18, color: colors.ink },
  acceptTextDisabled: { opacity: 0.45 },
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
