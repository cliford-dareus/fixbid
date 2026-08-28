import {Alert, Platform} from 'react-native';
import {toast} from '@/context/toast-context';

/**
 * Non-blocking feedback for success / soft errors.
 * Prefer this over Alert.alert for "Saved", "Copied", network hiccups, etc.
 */
export function notifySuccess(title: string, message?: string) {
  toast.success(title, message);
}

export function notifyError(title: string, message?: string) {
  toast.error(title, message);
}

export function notifyInfo(title: string, message?: string) {
  toast.info(title, message);
}

/** Map unknown thrown values to a short user-facing string. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as {message?: unknown}).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/**
 * Blocking confirm (delete, sign out, irreversible actions).
 * Resolves true if the user confirms.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
  } = options;

  // Web: prefer window.confirm when Alert is awkward
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      {text: cancelLabel, style: 'cancel', onPress: () => resolve(false)},
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

/**
 * Show an error toast; optionally fall back to Alert when toast is unavailable.
 */
export function reportError(err: unknown, title = 'Error') {
  const message = errorMessage(err);
  const id = toast.error(title, message);
  if (!id) {
    Alert.alert(title, message);
  }
}
