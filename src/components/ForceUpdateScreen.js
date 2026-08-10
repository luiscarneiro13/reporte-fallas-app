import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_PACKAGE_NAME, APP_VERSION } from '../constants';

export default function ForceUpdateScreen({ updateUrl, message, force, onSkip }) {
  const storeUrl =
    updateUrl ||
    (Platform.OS === 'android'
      ? `market://details?id=${APP_PACKAGE_NAME}`
      : `https://apps.apple.com/app/${APP_PACKAGE_NAME}`);

  const fallbackUrl =
    Platform.OS === 'android'
      ? `https://play.google.com/store/apps/details?id=${APP_PACKAGE_NAME}`
      : `https://apps.apple.com/app/${APP_PACKAGE_NAME}`;

  const handleUpdate = () => {
    Linking.openURL(storeUrl).catch(() => Linking.openURL(fallbackUrl));
  };

  return (
    <LinearGradient colors={['#1E3A8A', '#0066CC', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="cloud-download-outline" size={72} color="#fff" />
        </View>

        <Text style={styles.title}>Actualización disponible</Text>
        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity style={styles.btnUpdate} onPress={handleUpdate} activeOpacity={0.85}>
          <LinearGradient colors={['#38a169', '#2f855a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
            <Ionicons name="download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>Actualizar ahora</Text>
          </LinearGradient>
        </TouchableOpacity>

        {!force && (
          <TouchableOpacity style={styles.btnSkip} onPress={onSkip} activeOpacity={0.7}>
            <Text style={styles.skipText}>Más tarde</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconWrap: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 28,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  btnUpdate: { width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  btnGradient: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSkip: { paddingVertical: 12 },
  skipText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '500' },
});
