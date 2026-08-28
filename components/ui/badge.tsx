import React from 'react';
import {Text, View} from 'react-native';
import {cn} from '@/lib/utils';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const toneBox: Record<BadgeTone, string> = {
  neutral: 'bg-zinc-100',
  success: 'bg-green-100',
  warning: 'bg-amber-100',
  danger: 'bg-red-100',
  info: 'bg-sky-100',
};

const toneText: Record<BadgeTone, string> = {
  neutral: 'text-zinc-700',
  success: 'text-green-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  info: 'text-sky-700',
};

export function Badge({
  label,
  tone = 'neutral',
  className,
  textClassName,
}: {
  label: string;
  tone?: BadgeTone;
  className?: string;
  textClassName?: string;
}) {
  return (
    <View className={cn('self-start rounded-full px-3 py-1', toneBox[tone], className)}>
      <Text className={cn('text-xs font-medium capitalize', toneText[tone], textClassName)}>
        {label}
      </Text>
    </View>
  );
}

const PAID = new Set(['accepted', 'approved', 'deposit_paid', 'paid']);

/** Maps quote / job status strings to badge tones. */
export function statusTone(status: string): BadgeTone {
  const s = (status || '').toLowerCase();
  if (PAID.has(s) || s === 'completed') return 'success';
  if (s === 'declined' || s === 'cancelled') return 'danger';
  if (s === 'sent' || s === 'invoiced' || s === 'in-progress' || s === 'schedule') return 'warning';
  return 'neutral';
}

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return <Badge label={status || 'draft'} tone={statusTone(status)} className={className} />;
}
