import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '../i18n';
import { getEquipment } from '../api/equipment';
import ScreenContainer from '../components/ScreenContainer';

function EquipmentCard({ item, onPress }) {
  const name = item.placa || item.name || `#${item.uuid || item.id}`;
  const subtitle = [item.brand_name, item.vehicle_model]
    .filter(Boolean)
    .join(' ');
  const meta = [
    item.equipment_type_name || item.type,
    item.year ? String(item.year) : null,
    item.color,
  ].filter(Boolean);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardLeft}>
        <View style={styles.iconCircle}>
          <Ionicons name="car-outline" size={24} color="#1E50A0" />
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{name}</Text>
        {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
        <View style={styles.cardMetaRow}>
          {meta.map((m, i) => (
            <View key={i} style={styles.metaPill}>
              <Text style={styles.metaPillText}>{m}</Text>
            </View>
          ))}
        </View>
      </View>
      <Ionicons name="chevron-forward-outline" size={18} color="#a0aec0" />
    </TouchableOpacity>
  );
}

export default function EquipmentScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => getEquipment({ per_page: 100 }),
    staleTime: 1000 * 60 * 30,
  });

  const equipmentList = useMemo(() => data ?? [], [data]);

  const handlePress = (item) => {
    navigation.navigate('EquipmentDetail', { equipmentId: String(item.uuid) });
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <ScreenContainer>
          <LinearGradient colors={['#1A3A6B', '#1E50A0']} style={[styles.header, { paddingTop: insets.top + 14 }]}>
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
              style={styles.menuBtn}
            >
              <Ionicons name="menu-outline" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('equipment.title') || 'Equipos'}</Text>
            <View style={styles.headerRight} />
          </LinearGradient>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1E50A0" />
          </View>
        </ScreenContainer>
      </SafeAreaProvider>
    );
  }

  if (isError) {
    return (
      <SafeAreaProvider>
        <ScreenContainer>
          <LinearGradient colors={['#1A3A6B', '#1E50A0']} style={[styles.header, { paddingTop: insets.top + 14 }]}>
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
              style={styles.menuBtn}
            >
              <Ionicons name="menu-outline" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('equipment.title') || 'Equipos'}</Text>
            <View style={styles.headerRight} />
          </LinearGradient>
          <View style={styles.center}>
            <Ionicons name="warning-outline" size={48} color="#e53e3e" />
            <Text style={styles.emptyText}>{t('common.error') || 'Error al cargar'}</Text>
          </View>
        </ScreenContainer>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ScreenContainer>
        <LinearGradient colors={['#1A3A6B', '#1E50A0']} style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={styles.menuBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu-outline" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('equipment.title') || 'Equipos'}</Text>
          <View style={styles.headerRight} />
        </LinearGradient>

        <FlatList
          data={equipmentList}
          keyExtractor={(item) => String(item.uuid) || String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <EquipmentCard item={item} onPress={() => handlePress(item)} />
          )}
          ListEmptyComponent={(
            <View style={styles.emptyBox}>
              <Ionicons name="car-outline" size={48} color="#cbd5e0" />
              <Text style={styles.emptyText}>{t('common.no_records') || 'No hay equipos'}</Text>
            </View>
          )}
        />
      </ScreenContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  menuBtn: { padding: 2 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
  headerRight: { width: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  listContent: { padding: 16, paddingBottom: 120 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLeft: { marginRight: 12 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A3A6B', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#718096', marginBottom: 6 },
  cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  metaPill: {
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  metaPillText: { fontSize: 11, color: '#718096' },
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14, color: '#a0aec0' },
});

