import React, {Component, type ErrorInfo, type ReactNode} from 'react';
import {Text, View} from 'react-native';
import {Button} from '@/components/ui/button';

type Props = {
  children: ReactNode;
  /** Optional label for logs / UI */
  name?: string;
  onReset?: () => void;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

/**
 * Catches render errors in the subtree so the whole app does not white-screen.
 * Place around navigation trees or heavy feature screens.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = {hasError: false, message: ''};

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Something went wrong',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const tag = this.props.name || 'ErrorBoundary';
    console.error(`[${tag}]`, error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({hasError: false, message: ''});
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
          <Text className="text-center text-[20px] font-bold text-foreground">
            Something went wrong
          </Text>
          <Text className="text-center text-[14px] leading-5 text-muted-foreground">
            {this.state.message}
          </Text>
          <Button title="Try again" onPress={this.handleReset} className="mt-2 min-w-[160px]" />
        </View>
      );
    }

    return this.props.children;
  }
}
