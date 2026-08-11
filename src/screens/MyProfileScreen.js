import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../i18n';
import useAuthStore from '../store/authStore';
import { logoutRequest, deletePushTokenRequest } from '../api/auth';
import { useContext } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';
import ScreenContainer, { ScrollContent } from '../components/ScreenContainer';
import { COLORS } from '../constants/colors';

export default function MyProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { expoPushToken } = useContext(NotificationContext);

  const handleLogout = () => {
    Alert.alert(
      t('actions.logout') || 'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: t('actions.cancel') || 'Cancelar', style: 'cancel' },
        {
          text: t('actions.logout') || 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              if (expoPushToken) {
                await deletePushTokenRequest(expoPushToken).catch(() => {});
              }
              await logoutRequest();
            } catch (_) {}
            clearAuth();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  const handleAvatarTap = () => {
    // TODO: Implement avatar change functionality
    Alert.alert(
      'Cambiar avatar',
      'Esta funcionalidad estará disponible próximamente.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaProvider>
      <ScreenContainer>
        {/* Header */}
        <LinearGradient colors={[COLORS.dark, COLORS.dark]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={styles.menuBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu-outline" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('menu.my_profile') || 'Mi Perfil'}</Text>
          <View style={styles.headerRight} />
        </LinearGradient>

        <ScrollContent paddingBottom={120}>
          {/* Profile card */}
          <View style={styles.profileCard}>
            <TouchableOpacity onPress={handleAvatarTap} activeOpacity={0.7}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person-outline" size={48} color="#1A3A6B" />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>{user?.name || user?.email || 'Usuario'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
            <View style={styles.rolesContainer}>
              {roles.map((role) => (
                <View key={role} style={styles.roleBadge}>
                  <Text style={styles.roleText}>{role}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Info sections */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.account_info')}</Text>

            {user?.email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color="#718096" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('profile.email')}</Text>
                  <Text style={styles.infoValue}>{user.email}</Text>
                </View>
              </View>
            )}

            {user?.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color="#718096" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('profile.phone')}</Text>
                  <Text style={styles.infoValue}>{user.phone}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Logout button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color="#e53e3e" />
            <Text style={styles.logoutText}>{t('actions.logout')}</Text>
          </TouchableOpacity>
        </ScrollContent>
      </ScreenContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  menuBtn: { padding: 2 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
  headerRight: { width: 32 },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: { fontSize: 20, fontWeight: '700', color: '#1A3A6B', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#718096', marginBottom: 12 },
  rolesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  roleBadge: {
    backgroundColor: '#1E50A0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  roleText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A3A6B', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoContent: { marginLeft: 12, flex: 1 },
  infoLabel: { fontSize: 12, color: '#718096', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#2d3748' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#e53e3e',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#e53e3e', marginLeft: 8 },
});
