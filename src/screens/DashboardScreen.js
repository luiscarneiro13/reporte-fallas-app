import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';
import ScreenContainer from '../components/ScreenContainer';

export default function DashboardScreen() {
  return (
    <SafeAreaProvider>
      <ScreenContainer backgroundColor="#fff">
        <AppHeader title="Dashboard" />
        <View style={styles.content} />
      </ScreenContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
});
