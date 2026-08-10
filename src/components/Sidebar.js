import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation, LANGUAGES } from '../i18n';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';
import { logoutRequest } from '../api/auth';
import { updateLanguageRequest } from '../api/user';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { syncAll } from '../services/syncService';

const DARK_BLUE = '#1A3A6B';
const MENU_BLUE = '#1E50A0';
const ACTIVE_BLUE = '#2563C0';
const WHITE = '#FFFFFF';

const MENU_OPERADOR = [
  { key: 'ReportFault',  labelKey: 'menu.report_fault',  icon: 'flag-outline',          screen: 'ReportFault' },
  { key: 'FaultSummary', labelKey: 'menu.fault_summary', icon: 'document-text-outline', screen: 'FaultSummary' },
  { key: 'Equipment',    labelKey: 'menu.equipment',     icon: 'car-outline',           screen: 'Equipment' },
  { key: 'MyProfile',    labelKey: 'menu.my_profile',    icon: 'person-outline',        screen: 'MyProfile' },
];

const MENU_SUPERVISOR = [
  { key: 'FaultSummary', labelKey: 'menu.fault_summary', icon: 'document-text-outline', screen: 'FaultSummary' },
  { key: 'ReportFault',  labelKey: 'menu.report_fault',  icon: 'flag-outline',          screen: 'ReportFault' },
  { key: 'Equipment',    labelKey: 'menu.equipment',     icon: 'car-outline',           screen: 'Equipment' },
  { key: 'MyProfile',    labelKey: 'menu.my_profile',    icon: 'person-outline',        screen: 'MyProfile' },
];

const MENU_DEV = [
  { key: 'DevConfig', label: 'Desarrollo', icon: 'code-outline', screen: 'DevConfig' },
];

export default function Sidebar(props) {
  const { state, navigation } = props;
  const { t, locale, setLocale } = useTranslation();
  const user  = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const clearAuth   = useAuthStore((s) => s.clearAuth);
  const queryClient  = useQueryClient();
  const activeRouteName = state?.routes[state?.index]?.name;
  const isOnline = useNetworkStatus();
  const { pendingCount, isSyncing } = useSyncStatus();
  const isSupervisor = roles.includes('Supervisor');
  const menuItems    = isSupervisor ? MENU_SUPERVISOR : MENU_OPERADOR;
  const roleLabel    = roles[0] ?? '';

  const [showDevMenu, setShowDevMenu] = React.useState(() => {
    try {
      const saved = localStorage.getItem('@ironflow_show_dev_menu');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [tapCount, setTapCount] = React.useState(0);
  const tapTimerRef = useRef(null);

  React.useEffect(() => {
    try {
      localStorage.setItem('@ironflow_show_dev_menu', String(showDevMenu));
    } catch {}
  }, [showDevMenu]);

  const handleLogoTap = () => {
    setTapCount((prev) => {
      const newCount = prev + 1;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => setTapCount(0), 2000);
      if (newCount >= 5) {
        setShowDevMenu((prev) => !prev);
        setTapCount(0);
        return 0;
      }
      return newCount;
    });
  };

  const handleLanguage = async (code) => {
    if (code === locale) return;
    setLocale(code);
    try {
      await updateLanguageRequest(code);
    } catch (_) {}
  };

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch (_) {
    } finally {
      queryClient.clear();
      clearAuth();
    }
  };

  const handlePress = (item) => {
    navigation.navigate(item.screen);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleLogoTap} activeOpacity={0.7}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Ionicons name="wifi-outline" size={16} color="#fff" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.brandName}>IronFlow</Text>
          {user && (
            <>
              <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
              {roleLabel ? (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{roleLabel}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>

      {/* Menu items */}
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {menuItems.map((item) => {
          const isActive = activeRouteName === item.screen;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              onPress={() => handlePress(item)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={WHITE}
                style={styles.menuIcon}
              />
              <Text style={styles.menuLabel}>{t(item.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}

        {showDevMenu && MENU_DEV.map((item) => {
          const isActive = activeRouteName === item.screen;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, styles.menuItemDev, isActive && styles.menuItemActive]}
              onPress={() => handlePress(item)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={WHITE}
                style={styles.menuIcon}
              />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Language selector */}
        <View style={styles.langSection}>
          <View style={styles.langHeader}>
            <Ionicons name="globe-outline" size={15} color="rgba(255,255,255,0.55)" style={{ marginRight: 6 }} />
            <Text style={styles.langTitle}>{t('common.language')}</Text>
          </View>
          <View style={styles.langRow}>
            {LANGUAGES.map((lang) => {
              const active = locale === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => handleLanguage(lang.code)}
                  style={[styles.langPill, active && styles.langPillActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.langPillText, active && styles.langPillTextActive]}>
                    {lang.code.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sync status */}
        {pendingCount > 0 && (
          <View style={styles.syncSection}>
            <TouchableOpacity style={styles.syncBtn} onPress={() => syncAll()} disabled={isSyncing} activeOpacity={0.7}>
              <Ionicons name={isSyncing ? 'sync-outline' : 'cloud-upload-outline'} size={16} color="#fff" />
              <Text style={styles.syncBtnText}>
                {isSyncing ? 'Sincronizando...' : `${pendingCount} pendiente(s)`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.menuIcon} />
          <Text style={styles.logoutLabel}>{t('actions.logout') || 'Logout'}</Text>
        </TouchableOpacity>
      </DrawerContentScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MENU_BLUE,
  },
  headerLeft: {
    alignItems: 'center',
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: DARK_BLUE,
    paddingTop: 25,
    paddingBottom: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginTop: 2,
  },
  headerInfo: {
    flex: 1,
  },
  brandName: {
    color: WHITE,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  userName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 5,
  },
  roleBadgeText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 0,
  },
  menuItemDev: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  menuItemActive: {
    backgroundColor: ACTIVE_BLUE,
  },
  menuIcon: {
    width: 28,
  },
  menuLabel: {
    flex: 1,
    color: WHITE,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  logoutLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  langSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  langHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  langTitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  langPillActive: {
    borderColor: WHITE,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
  langPillTextActive: {
    color: WHITE,
  },
  syncSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  syncBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
