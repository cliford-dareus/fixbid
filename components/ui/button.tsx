import {Feather} from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
  View,
} from 'react-native';
import {cn} from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = TouchableOpacityProps & {
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  iconPosition?: 'left' | 'right';
  className?: string;
  textClassName?: string;
  children?: React.ReactNode;
};

const variantContainer: Record<ButtonVariant, string> = {
  primary: 'bg-primary border border-primary',
  secondary: 'bg-secondary border border-transparent',
  outline: 'bg-transparent border border-zinc-300',
  ghost: 'bg-transparent border border-transparent',
  danger: 'bg-red-600 border border-red-600',
  success: 'bg-emerald-600 border border-emerald-600',
};

const variantText: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-foreground',
  outline: 'text-foreground',
  ghost: 'text-primary',
  danger: 'text-white',
  success: 'text-white',
};

const sizeContainer: Record<ButtonSize, string> = {
  sm: 'rounded-xl px-3 py-2',
  md: 'rounded-2xl px-4 py-3.5',
  lg: 'rounded-2xl px-5 py-4',
};

const sizeText: Record<ButtonSize, string> = {
  sm: 'text-[13px]',
  md: 'text-[15px]',
  lg: 'text-[16px]',
};

const iconSize: Record<ButtonSize, number> = {
  sm: 14,
  md: 18,
  lg: 20,
};

const iconColor: Record<ButtonVariant, string> = {
  primary: '#fff',
  secondary: '#111',
  outline: '#111',
  ghost: '#f97316',
  danger: '#fff',
  success: '#fff',
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  iconPosition = 'left',
  className,
  textClassName,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center gap-2',
        sizeContainer[size],
        variantContainer[variant],
        isDisabled && 'opacity-50',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' || variant === 'secondary' ? '#f97316' : '#fff'}
        />
      ) : children ? (
        children
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {icon && iconPosition === 'left' ? (
            <Feather name={icon} size={iconSize[size]} color={iconColor[variant]} />
          ) : null}
          {title ? (
            <Text
              className={cn(
                'font-bold',
                sizeText[size],
                variantText[variant],
                textClassName,
              )}
            >
              {title}
            </Text>
          ) : null}
          {icon && iconPosition === 'right' ? (
            <Feather name={icon} size={iconSize[size]} color={iconColor[variant]} />
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}
