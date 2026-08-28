import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {Animated, Pressable, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import {cn} from '@/lib/utils';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export type ToastOptions = {
  title: string;
  message?: string;
  tone?: ToastTone;
  /** Auto-dismiss ms (default 3200). 0 = sticky until dismissed. */
  duration?: number;
};

type ToastItem = ToastOptions & {
  id: string;
  tone: ToastTone;
};

type ToastContextValue = {
  show: (opts: ToastOptions) => string;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  dismiss: (id?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<
  ToastTone,
  {bg: string; border: string; icon: keyof typeof Feather.glyphMap; iconColor: string}
> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'check-circle',
    iconColor: '#059669',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-200 dark:border-red-800',
    icon: 'alert-circle',
    iconColor: '#dc2626',
  },
  info: {
    bg: 'bg-sky-50 dark:bg-sky-950',
    border: 'border-sky-200 dark:border-sky-800',
    icon: 'info',
    iconColor: '#0284c8',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'alert-triangle',
    iconColor: '#d97706',
  },
};

let externalShow: ToastContextValue['show'] | null = null;

/** Imperative access outside React components (mutations, data layer). */
export const toast = {
  show: (opts: ToastOptions) => externalShow?.(opts) ?? '',
  success: (title: string, message?: string) =>
    externalShow?.({title, message, tone: 'success'}) ?? '',
  error: (title: string, message?: string) =>
    externalShow?.({title, message, tone: 'error'}) ?? '',
  info: (title: string, message?: string) =>
    externalShow?.({title, message, tone: 'info'}) ?? '',
  warning: (title: string, message?: string) =>
    externalShow?.({title, message, tone: 'warning'}) ?? '',
};

export function ToastProvider({children}: {children: React.ReactNode}) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id?: string) => {
    if (!id) {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      setItems([]);
      return;
    }
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (opts: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tone = opts.tone ?? 'info';
      const duration = opts.duration ?? 3200;
      const item: ToastItem = {
        id,
        title: opts.title,
        message: opts.message,
        tone,
        duration,
      };

      setItems((prev) => [...prev.slice(-2), item]); // keep stack small

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      dismiss,
      success: (title, message) => show({title, message, tone: 'success'}),
      error: (title, message) => show({title, message, tone: 'error'}),
      info: (title, message) => show({title, message, tone: 'info'}),
      warning: (title, message) => show({title, message, tone: 'warning'}),
    }),
    [show, dismiss],
  );

  externalShow = value.show;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 z-[9999] px-4"
        style={{top: insets.top + 8}}
      >
        {items.map((item) => (
          <ToastBanner key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastBanner({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const style = TONE_STYLES[item.tone];

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {toValue: 1, duration: 180, useNativeDriver: true}),
      Animated.timing(translateY, {toValue: 0, duration: 180, useNativeDriver: true}),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={{opacity, transform: [{translateY}]}}
      className="mb-2"
    >
      <Pressable
        onPress={onDismiss}
        className={cn(
          'flex-row items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm',
          style.bg,
          style.border,
        )}
      >
        <Feather name={style.icon} size={20} color={style.iconColor} style={{marginTop: 1}} />
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-bold text-foreground">{item.title}</Text>
          {item.message ? (
            <Text className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{item.message}</Text>
          ) : null}
        </View>
        <Feather name="x" size={16} color="#94a3b8" />
      </Pressable>
    </Animated.View>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
