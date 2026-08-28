import React from 'react';
import {Text, TextInput, View, type TextInputProps} from 'react-native';
import {cn} from '@/lib/utils';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  containerClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
};

export function FieldLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text
      className={cn(
        'text-muted-foreground text-xs font-bold uppercase tracking-[0.5px]',
        className,
      )}
    >
      {children}
    </Text>
  );
}

export function Input({
  label,
  error,
  containerClassName,
  inputClassName,
  labelClassName,
  className,
  multiline,
  ...rest
}: InputProps) {
  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label ? <FieldLabel className={labelClassName}>{label}</FieldLabel> : null}
      <TextInput
        className={cn(
          'rounded-xl border border-zinc-300 bg-card px-4 py-3 text-[15px] text-foreground',
          multiline && 'min-h-[90px]',
          error && 'border-red-500',
          className,
          inputClassName,
        )}
        placeholderTextColor="#94a3b8"
        multiline={multiline}
        style={multiline ? {textAlignVertical: 'top'} : undefined}
        {...rest}
      />
      {error ? <Text className="text-xs text-red-600">{error}</Text> : null}
    </View>
  );
}
