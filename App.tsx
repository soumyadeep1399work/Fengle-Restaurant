import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { OrdersProvider, useOrders } from './src/context/OrdersContext';
import BottomNav, { Tab } from './src/components/BottomNav';
import LoginScreen from './src/screens/LoginScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import MenuScreen from './src/screens/MenuScreen';
import SalesScreen from './src/screens/SalesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import AgreementScreen from './src/screens/AgreementScreen';
import ItemSheet from './src/components/ItemSheet';
import CategorySheet from './src/components/CategorySheet';
import TakeoverScreen from './src/screens/TakeoverScreen';
import { colors, fonts } from './src/theme';
import { MenuItem } from './src/types';
import { fetchRestaurantProfile } from './src/api/menu';

SplashScreen.preventAutoHideAsync().catch(() => {});

const TITLES: Record<Tab, string> = {
  orders: 'Orders',
  menu: 'Menu management',
  sales: 'Sales & earnings',
  profile: 'Business profile',
};

function Shell() {
  const [tab, setTab] = useState<Tab>('orders');
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);
  // The item sheet: `{}` adds a new item, `{ item }` edits that one, null is closed.
  const [itemSheet, setItemSheet] = useState<{ item?: MenuItem } | null>(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [menuVersion, setMenuVersion] = useState(0);
  const { alertOrder, newOrders } = useOrders();

  // The takeover waits while an order's detail is open (the flatboard's rule).
  const takeover = alertOrder && openOrderId === null ? alertOrder : null;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (takeover) return true; // an unanswered order can't be dismissed
      if (categorySheetOpen) {
        setCategorySheetOpen(false);
        return true;
      }
      if (itemSheet) {
        setItemSheet(null);
        return true;
      }
      if (openOrderId !== null) {
        setOpenOrderId(null);
        return true;
      }
      if (tab !== 'orders') {
        setTab('orders');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [takeover, openOrderId, itemSheet, categorySheetOpen, tab]);

  if (takeover) {
    return (
      <>
        <StatusBar style="light" />
        <TakeoverScreen key={takeover.id} order={takeover} />
      </>
    );
  }

  if (openOrderId !== null) {
    return (
      <>
        <StatusBar style="dark" />
        <OrderDetailScreen orderId={openOrderId} onClose={() => setOpenOrderId(null)} />
      </>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <Text style={styles.title}>{TITLES[tab]}</Text>
        {tab === 'orders' && <OrdersScreen onOpenOrder={setOpenOrderId} />}
        {tab === 'menu' && <MenuScreen onAddItem={() => setItemSheet({})} onEditItem={(item) => setItemSheet({ item })} onAddCategory={() => setCategorySheetOpen(true)} refreshKey={menuVersion} />}
        {tab === 'sales' && <SalesScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </SafeAreaView>
      <BottomNav tab={tab} onChange={setTab} ordersAlert={newOrders.length > 0} />
      {categorySheetOpen && (
        <CategorySheet
          onClose={() => setCategorySheetOpen(false)}
          onDone={() => {
            setCategorySheetOpen(false);
            setMenuVersion((v) => v + 1);
          }}
        />
      )}
      {itemSheet && (
        <ItemSheet
          item={itemSheet.item}
          onClose={() => setItemSheet(null)}
          onSaved={() => {
            setItemSheet(null);
            setMenuVersion((v) => v + 1);
          }}
        />
      )}
    </View>
  );
}

type GateStatus = 'checking' | 'required' | 'clear';

/**
 * Blocks Orders/Menu/Sales/Profile — and the order polling they depend on —
 * until the owner has accepted the in-app agreement. Remounts fresh on every
 * login (Main only renders this while isLoggedIn), so a different account on
 * the same device always gets its own check.
 */
function AgreementGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<GateStatus>('checking');

  const check = useCallback(async () => {
    try {
      const profile = await fetchRestaurantProfile();
      // No profile (older backend, 404) or the field missing entirely -> nothing to gate against.
      setStatus(profile?.agreementRequired ? 'required' : 'clear');
    } catch {
      // Can't reach the backend to check — fail open rather than locking the owner out over a network blip.
      setStatus('clear');
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  if (status === 'checking') {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (status === 'required') {
    return <AgreementScreen onAccepted={() => setStatus('clear')} />;
  }
  return <>{children}</>;
}

function Main() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  const { isLoading: authLoading, isLoggedIn } = useAuth();
  const ready = (fontsLoaded || fontError) && !authLoading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  if (!isLoggedIn) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <LoginScreen />
      </View>
    );
  }

  // Orders (and their polling) only exist while signed in; remounting on
  // login/logout gives every session a clean slate.
  return (
    <View style={styles.root}>
      <AgreementGate>
        <OrdersProvider>
          <Shell />
        </OrdersProvider>
      </AgreementGate>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Main />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, fontFamily: fonts.heading, fontSize: 20, letterSpacing: -0.5, color: colors.ink },
});
