import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, NativeModules } from 'react-native';
import { AlertCircle, RotateCcw } from 'lucide-react-native';
import { ThemeProvider } from '../theme/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Integration point for future crash reporting services (Sentry / Bugsnag)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Trigger dev reload or just reset state to Slot
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallbackContainer}>
          <AlertCircle size={64} color="#EF4444" style={{ marginBottom: 20 }} />
          <Text style={styles.fallbackTitle}>Application Crash Detected</Text>
          <Text style={styles.fallbackMsg}>
            GymFlow encountered an unexpected error. Don't worry, your offline sync queue is safe.
          </Text>
          <Text style={styles.fallbackTrace}>
            {this.state.error?.message || 'Unknown runtime error'}
          </Text>

          <Pressable onPress={this.handleReset} style={styles.resetBtn}>
            <RotateCcw size={16} color="#FFF" />
            <Text style={styles.resetBtnTxt}>Reload Layout</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#121214',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  fallbackMsg: {
    fontSize: 13,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  fallbackTrace: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    textAlign: 'center',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  resetBtnTxt: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  }
});
