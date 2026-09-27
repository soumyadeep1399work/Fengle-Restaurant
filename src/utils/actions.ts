import { Alert } from 'react-native';

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.';
}

export function showError(e: unknown) {
  Alert.alert('Couldn’t do that', errorMessage(e));
}

/** Rejecting can't be undone (the order moves to the next kitchen), so always ask first. */
export function confirmReject(onConfirm: () => void) {
  Alert.alert('Reject this order?', 'It will be offered to another kitchen. This can’t be undone.', [
    { text: 'Keep order', style: 'cancel' },
    { text: 'Reject', style: 'destructive', onPress: onConfirm },
  ]);
}
