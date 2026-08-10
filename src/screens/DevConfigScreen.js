import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import ScreenContainer from '../components/ScreenContainer';

export default function DevConfigScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const apiBaseUrl = useConfigStore((s) => s.apiBaseUrl);
  const environment = useConfigStore((s) => s.environment);
  const setProduction = useConfigStore((s) => s.setProduction);
  const setLocal = useConfigStore((s) => s.setLocal);

  const handleEnvironmentChange = (env) => {
    if (env === 'production') {
      setProduction();
    } else {
      setLocal();
    }
  };

  return (
    <SafeAreaProvider>
      <ScreenContainer>
        {/* Header */}
        <LinearGradient colors={['#1A3A6B', '#1E50A0']} style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={styles.menuBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu-outline" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Opciones de desarrollo</Text>
          <View style={styles.headerRight} />
        </LinearGradient>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entorno Actual</Text>
            <View style={styles.infoRow}>
              <Ionicons name="server-outline" size={20} color="#718096" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>URL</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{apiBaseUrl}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="layers-outline" size={20} color="#718096" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Entorno</Text>
                <Text style={styles.infoValue}>{environment === 'production' ? 'Producción' : 'Local'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cambiar Entorno</Text>
            <View style={styles.envButtons}>
              <TouchableOpacity
                style={[styles.envBtn, environment === 'production' && styles.envBtnActive]}
                onPress={() => handleEnvironmentChange('production')}
                activeOpacity={0.7}
              >
                <Ionicons name="cloud-outline" size={18} color={environment === 'production' ? '#fff' : '#1E50A0'} />
                <Text style={[styles.envBtnText, environment === 'production' && styles.envBtnTextActive]}>Producción</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.envBtn, environment === 'local' && styles.envBtnActive]}
                onPress={() => handleEnvironmentChange('local')}
                activeOpacity={0.7}
              >
                <Ionicons name="desktop-outline" size={18} color={environment === 'local' ? '#fff' : '#1E50A0'} />
                <Text style={[styles.envBtnText, environment === 'local' && styles.envBtnTextActive]}>Local</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScreenContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  menuBtn: { padding: 2 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
  headerRight: { width: 32 },
  content: { flex: 1, padding: 16 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A3A6B', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoContent: { marginLeft: 12, flex: 1 },
  infoLabel: { fontSize: 12, color: '#718096', marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1A3A6B' },
  envButtons: { flexDirection: 'row', gap: 12 },
  envBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    gap: 8,
  },
  envBtnActive: { backgroundColor: '#1E50A0' },
  envBtnText: { fontSize: 14, fontWeight: '600', color: '#1E50A0' },
  envBtnTextActive: { color: '#fff' },
});
