import React, { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { colors } from '../theme';

/**
 * Pull-to-refresh for a screen: pass the result as a ScrollView/FlatList's
 * `refreshControl`. Runs `reload`, keeps the spinner up until it settles, and
 * never throws — each screen already shows its own error state.
 */
export function usePullRefresh(reload: () => Promise<unknown> | unknown) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } catch {
      // The screen's own error state covers a failed reload.
    } finally {
      setRefreshing(false);
    }
  }, [reload]);
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />;
}
