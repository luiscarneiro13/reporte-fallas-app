import React from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

export function ScrollContent({
  children,
  padding = 16,
  paddingBottom = 32,
  style,
  ...props
}) {
  return (
    <ScrollView
      contentContainerStyle={[{ padding, paddingBottom }, style]}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  );
}

export default function ScreenContainer({
  children,
  backgroundColor = '#F7F8FA',
  style,
  ...props
}) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1, backgroundColor }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      {...props}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
