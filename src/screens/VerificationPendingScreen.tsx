import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

const POLL_MS = 15000;

/**
 * Shown after the selfie is submitted, until an admin approves it. The backend
 * refuses every other request in the meantime (403 verification_required), so
 * there is nothing else to show. Re-checks on its own so approval needs no tap.
 */
export default function VerificationPendingScreen({ onCheck }: { onCheck: () => Promise<void> | void }) {
  const { logout } = useAuth();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      Promise.resolve(onCheck()).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(t);
  }, [onCheck]);

  async function checkNow() {
    setChecking(true);
    try {
      await onCheck();
    } finally {
      setChecking(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Text style={styles.title}>Under review</Text>
        <Text style={styles.text}>
          Thanks — we’ve received your photo. The Fengle team is checking it, and you’ll be able to start as soon as it’s approved. This
          screen updates by itself.
        </Text>
        <Button label="Check status" height={52} loading={checking} onPress={checkNow} style={styles.cta} />
      </View>
      <Text style={styles.logout} onPress={() => logout()}>
        Not the right account? Log out
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 22 },
  body: { flex: 1, justifyContent: 'center' },
  title: { fontFamily: fonts.heading, fontSize: 24, letterSpacing: -0.5, color: colors.ink },
  text: { marginTop: 10, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.bodyMuted },
  cta: { marginTop: 26 },
  logout: { marginBottom: 12, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.mutedLight },
});
