import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, status } from '../theme';
import { fetchRestaurantProfile } from '../api/menu';
import { PartnerDocuments } from '../types';
import { formatFullDate } from '../utils/time';

const DEFAULT_PORTAL = 'https://partner.fengle.in';
const PORTAL_LABEL = 'partner.fengle.in';

const DOC_LABEL: Record<string, string> = {
  aadhaar: 'Aadhaar',
  fssai: 'FSSAI licence',
  trade_license: 'Trade licence',
};

const listDocs = (types: string[]) => types.map((t) => DOC_LABEL[t] ?? t).join(', ');

interface Message {
  title: string;
  body: string;
  /** 'alert' = something the kitchen must do now; 'notice' = informational. */
  tone: 'alert' | 'notice';
}

function messageFor(docs: PartnerDocuments): Message | null {
  switch (docs.status) {
    case 'complete':
      return null;
    case 'missing':
      return {
        tone: 'alert',
        title: 'Upload your documents',
        body: docs.missing.length
          ? `Add your ${listDocs(docs.missing)} at ${PORTAL_LABEL}.`
          : `Add your Aadhaar, FSSAI licence and trade licence at ${PORTAL_LABEL}.`,
      };
    case 'pending':
      return {
        tone: 'notice',
        title: 'Your documents are being reviewed',
        body: docs.missing.length
          ? `Fengle is reviewing what you sent. Still to upload: ${listDocs(docs.missing)} at ${PORTAL_LABEL}.`
          : 'Fengle is reviewing what you sent. We’ll notify you once they’re approved.',
      };
    case 'rejected':
      return { tone: 'alert', title: 'A document was rejected', body: `Open ${PORTAL_LABEL} to see why and upload it again.` };
    case 'expired':
      return { tone: 'alert', title: 'A document has expired', body: `Upload a renewed copy at ${PORTAL_LABEL}.` };
    case 'expiring': {
      const on = docs.validUntil ? formatFullDate(docs.validUntil) : '';
      return {
        tone: 'notice',
        title: 'A document expires soon',
        body: `${on ? `Valid until ${on}. ` : ''}Upload a renewed copy at ${PORTAL_LABEL}.`,
      };
    }
    default:
      return null;
  }
}

// Advisory only: a failed load just hides the banner. Reloads when the kitchen comes
// back to the app (they upload on a website, then return), and whenever it is remounted.
export default function DocumentsBanner() {
  const [docs, setDocs] = useState<PartnerDocuments | null>(null);
  const [portalUrl, setPortalUrl] = useState(DEFAULT_PORTAL);

  const load = useCallback(async () => {
    try {
      const profile = await fetchRestaurantProfile();
      setDocs(profile?.documents ?? null);
      if (profile?.documentsPortalUrl) setPortalUrl(profile.documentsPortalUrl);
    } catch {
      /* keep whatever was showing */
    }
  }, []);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  const message = docs ? messageFor(docs) : null;
  if (!message) return null;

  const alert = message.tone === 'alert';
  return (
    <Pressable
      onPress={() => Linking.openURL(portalUrl).catch(() => {})}
      style={[styles.banner, alert ? styles.bannerAlert : styles.bannerNotice]}
      accessibilityRole="link"
    >
      <View style={[styles.bar, { backgroundColor: alert ? status.alert : colors.gold }]} />
      <View style={styles.flex}>
        <Text style={[styles.title, { color: alert ? status.newText : colors.goldChipText }]}>{message.title}</Text>
        <Text style={styles.body}>{message.body}</Text>
        <Text style={[styles.link, { color: alert ? status.newText : colors.goldChipText }]}>Open {PORTAL_LABEL} ›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: { marginHorizontal: 20, marginBottom: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  bannerAlert: { backgroundColor: status.newBg, borderColor: '#E3A9A9' },
  bannerNotice: { backgroundColor: colors.goldChipBg, borderColor: '#EBD3A0' },
  bar: { width: 4 },
  title: { marginTop: 10, marginHorizontal: 12, fontFamily: fonts.bodyExtraBold, fontSize: 12.5 },
  body: { marginTop: 2, marginHorizontal: 12, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.body },
  link: { marginTop: 6, marginBottom: 10, marginHorizontal: 12, fontFamily: fonts.bodyExtraBold, fontSize: 12 },
});
