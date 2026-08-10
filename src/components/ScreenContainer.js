import React from 'react';
import { View, ScrollView } from 'react-native';

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
    <View style={[{ flex: 1, backgroundColor }, style]} {...props}>
      {children}
    </View>
  );
}
