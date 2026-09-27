import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, status } from '../theme';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { requestOtp, verifyOtp } from '../api/auth';
import { errorMessage } from '../utils/actions';

const RESEND_SECONDS = 30;

// The flatboard shows phone + password, but restaurants sign in with an SMS
// code (the backend has no password login), so the second step is the code.
export default function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function sendCode() {
    setBusy(true);
    setError('');
    try {
      await requestOtp(phone);
      setStep('otp');
      setOtp('');
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError('');
    try {
      const { token, user } = await verifyOtp(phone, otp);
      await login(token, user);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const phoneValid = /^\d{10}$/.test(phone);
  const otpValid = otp.length === 6;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -24}>
        <View style={styles.form}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>Fengle for Business</Text>
          <Text style={styles.subtitle}>
            {step === 'phone' ? 'Log in to manage orders and your menu.' : `Enter the 6-digit code sent to +91 ${phone}.`}
          </Text>

          {step === 'phone' ? (
            <>
              <Text style={styles.label}>Business phone</Text>
              <TextInput
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.faint}
                keyboardType="number-pad"
                maxLength={10}
                style={styles.input}
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>Code</Text>
              <TextInput
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                placeholderTextColor={colors.faint}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                style={[styles.input, styles.otpInput]}
              />
              <View style={styles.linkRow}>
                <Text style={styles.link} onPress={() => { setStep('phone'); setError(''); }}>
                  Change number
                </Text>
                <Text style={[styles.link, cooldown > 0 && styles.linkOff]} onPress={cooldown > 0 || busy ? undefined : sendCode}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </Text>
              </View>
            </>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.footer}>
          {step === 'phone' ? (
            <Button label="Send code" height={52} loading={busy} disabled={!phoneValid} onPress={sendCode} />
          ) : (
            <Button label="Log in" height={52} loading={busy} disabled={!otpValid} onPress={verify} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  form: { flex: 1, paddingTop: 30, paddingHorizontal: 26 },
  logo: { width: 44, height: 44, borderRadius: 11 },
  title: { marginTop: 20, fontFamily: fonts.heading, fontSize: 24, letterSpacing: -0.6, color: colors.ink },
  subtitle: { marginTop: 8, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, color: colors.bodyMuted },
  label: { marginTop: 30, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.mutedLight },
  input: {
    marginTop: 6, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14,
    fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink,
  },
  otpInput: { letterSpacing: 8, fontSize: 18 },
  linkRow: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between' },
  link: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.primaryMid },
  linkOff: { color: colors.mutedLight },
  error: { marginTop: 14, fontFamily: fonts.bodyBold, fontSize: 12.5, color: status.alert },
  footer: { paddingHorizontal: 26, paddingBottom: 26 },
});
