import React from 'react';
import {Text, View, type ViewProps} from 'react-native';
import {cn} from '@/lib/utils';

export type CardProps = ViewProps & {
  className?: string;
  children?: React.ReactNode;
};

/** Standard surface card used across lists and detail pages. */
export function Card({className, children, ...rest}: CardProps) {
  return (
    <View className={cn('rounded-2xl bg-card p-4', className)} {...rest}>
      {children}
    </View>
  );
}

/** Dark hero / total banner (quote & job headers). */
export function HeroCard({className, children, ...rest}: CardProps) {
  return (
    <View
      className={cn('rounded-[20px] bg-secondary-foreground p-5', className)}
      {...rest}
    >
      {children}
    </View>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text
      className={cn(
        'mb-2 text-[14px] font-bold uppercase tracking-[0.5px] text-foreground',
        className,
      )}
    >
      {children}
    </Text>
  );
}

export function CardRow({
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <View
      className={cn(
        'flex-row items-center justify-between border-b border-zinc-200 py-2.5',
        className,
      )}
      {...rest}
    >
      {children}
    </View>
  );
}
