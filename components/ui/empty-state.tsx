import {Feather} from '@expo/vector-icons';
import React from 'react';
import {Text, View} from 'react-native';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

export type EmptyStateProps = {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  /** Compact card-style empty (lists) vs full-screen centered. */
  variant?: 'page' | 'card';
};

export function EmptyState({
  icon = 'inbox',
  title,
  subtitle,
  actionLabel,
  onAction,
  className,
  variant = 'page',
}: EmptyStateProps) {
  const isCard = variant === 'card';

  return (
    <View
      className={cn(
        'items-center justify-center gap-2',
        isCard
          ? 'rounded-2xl border border-dashed border-zinc-300 bg-card p-6'
          : 'flex-1 px-10',
        className,
      )}
    >
      <View className="mb-1 h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <Feather name={icon} size={isCard ? 24 : 28} color="#94a3b8" />
      </View>
      <Text className="text-center text-[17px] font-bold text-foreground">{title}</Text>
      {subtitle ? (
        <Text className="text-center text-[14px] leading-5 text-muted-foreground">{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          size="sm"
          className="mt-3"
        />
      ) : null}
    </View>
  );
}
