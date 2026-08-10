import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from '../i18n';
import { getEquipmentByUuid } from '../api/equipment';
import { getFaults } from '../api/faults';
import useAuthStore from '../store/authStore';
import ScreenContainer, { ScrollContent } from '../components/ScreenContainer';

const STATUS_CONFIG = {
  'Open':        { color: '#e53e3e', bg: '#FFF5F5' },
  'In Progress': { color: '#d69e2e', bg: '#FFFFF0' },
  'Scheduled':   { color: '#3182ce', bg: '#EBF8FF' },
  'Closed':      { color: '#38a169', bg: '#F0FFF4' },
};

const DEFAULT_STATUS = { color: '#718096', bg: '#F7FAFC' };

function FaultHistoryItem({ fault, isSupervisor }) {
  const cfg = STATUS_CONFIG[fault.status] || DEFAULT_STATUS;
  return (
    <View style={styles.faultItem}>
      <View style={styles.faultRow}>
        <View style={[styles.faultDot, { backgroundColor: cfg.color }]} />
        <View style={styles.faultContent}>
          <Text style={styles.faultDesc} numberOfLines={2}>{fault.description}</Text>
          <View style={styles.faultMeta}>
            <Text style={[styles.faultStatus, { color: cfg.color }]}>{fault.status}</Text>
            <Text style={styles.faultDate}>{fault.report_date}</Text>
          </View>
        </View>
      </View>
      {isSupervisor && (
        <View style={styles.faultActions}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDisabled]} activeOpacity={1}>
            <Ionicons name="create-outline" size={16} color="#a0aec0" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDisabled]} activeOpacity={1}>
            <Ionicons name="trash-outline" size={16} color="#a0aec0" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function EquipmentDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const isSupervisor = roles.includes('Supervisor');

  const equipmentId = route.params?.equipmentId;

  const { data: equipment, isLoading: isLoadingEq } = useQuery({
    queryKey: ['equipment', equipmentId],
    queryFn: () => getEquipmentByUuid(equipmentId),
    enabled: !!equipmentId,
  });

  const {
    data: faultsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingFaults,
  } = useInfiniteQuery({
    queryKey: ['faults', { equipment: equipment?.id }],
    queryFn: async ({ pageParam }) => {
      const res = await getFaults({
        pageParam,
        filters: { equipment_id: equipment?.id },
      });
      const raw = res.data?.data?.data ?? [];
      const mapped = raw.map((f) => ({
        id: f.id,
        description: f.description,
        status: f.fault_status_name,
        report_date: f.report_date,
        reported_by_id: f.reported_by_id,
      }));
      const pagination = res.data?.data?.pagination;
      return { mapped, pagination };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const p = lastPage.pagination;
      return p?.current_page < p?.last_page ? p.current_page + 1 : undefined;
    },
    enabled: !!equipment,
  });

  const faults = useMemo(
    () => faultsData?.pages.flatMap((p) => p.mapped) ?? [],
    [faultsData]
  );

  const handleReportFault = () => {
    if (!equipment) return;
    navigation.navigate('Main', {
      screen: 'ReportFault',
      params: { equipmentId: String(equipment.id) },
    });
  };

  if (isLoadingEq) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E50A0" />
      </View>
    );
  }

  if (!equipment) {
    return (
      <View style={styles.center}>
        <Ionicons name="warning-outline" size={48} color="#e53e3e" />
        <Text style={styles.emptyText}>{t('common.error') || 'Equipo no encontrado'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>{t('actions.back') || 'Volver'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ScreenContainer>
        <LinearGradient colors={['#1A3A6B', '#1E50A0']} style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('equipment.title') || 'Equipo'}</Text>
          <View style={styles.headerRight} />
        </LinearGradient>

        <ScrollContent paddingBottom={120}>
          <View style={styles.equipmentCard}>
            <View style={styles.equipmentIcon}>
              <Ionicons name="car-outline" size={40} color="#1A3A6B" />
            </View>
            <Text style={styles.equipmentName}>{equipment.placa || equipment.name || `#${equipment.id}`}</Text>
            {(equipment.brand_name || equipment.vehicle_model) && (
              <Text style={styles.equipmentSub}>
                {[equipment.brand_name, equipment.vehicle_model].filter(Boolean).join(' ')}
              </Text>
            )}
            <View style={styles.equipmentMeta}>
              {equipment.equipment_type_name && (
                <Text style={styles.metaPill}>{equipment.equipment_type_name}</Text>
              )}
              {equipment.year && (
                <Text style={styles.metaPill}>{equipment.year}</Text>
              )}
              {equipment.color && (
                <Text style={styles.metaPill}>{equipment.color}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.reportBtn} onPress={handleReportFault} activeOpacity={0.85}>
            <LinearGradient
              colors={['#e53e3e', '#c53030']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.reportBtnGradient}
            >
              <Ionicons name="flag-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.reportBtnText}>{t('menu.report_fault') || 'Reportar Falla'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('equipment.my_fault_history') || 'Mis Fallas Reportadas'}
            </Text>

            {isLoadingFaults && faults.length === 0 && (
              <ActivityIndicator size="small" color="#1E50A0" style={{ marginVertical: 20 }} />
            )}

            {faults.length === 0 && !isLoadingFaults && (
              <View style={styles.emptyBox}>
                <Ionicons name="document-text-outline" size={36} color="#cbd5e0" />
                <Text style={styles.emptyText}>{t('common.no_records') || 'No hay registros'}</Text>
              </View>
            )}

            {faults.map((fault) => (
              <FaultHistoryItem key={fault.id} fault={fault} isSupervisor={isSupervisor} />
            ))}

            {hasNextPage && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => { if (!isFetchingNextPage) fetchNextPage(); }}
              >
                {isFetchingNextPage ? (
                  <ActivityIndicator size="small" color="#1E50A0" />
                ) : (
                  <Text style={styles.loadMoreText}>{t('actions.load_more') || 'Cargar más'}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

        </ScrollContent>
      </ScreenContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  backBtn: { padding: 2 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
  headerRight: { width: 32 },
  equipmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  equipmentIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  equipmentName: { fontSize: 18, fontWeight: '700', color: '#1A3A6B', marginBottom: 4, textAlign: 'center' },
  equipmentSub: { fontSize: 14, color: '#718096', marginBottom: 8 },
  equipmentMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  metaPill: { fontSize: 12, color: '#a0aec0', backgroundColor: '#F7FAFC', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  reportBtn: { borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  reportBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  reportBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A3A6B', marginBottom: 12 },
  faultItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  faultRow: { flexDirection: 'row', alignItems: 'flex-start' },
  faultDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, marginRight: 10 },
  faultContent: { flex: 1 },
  faultDesc: { fontSize: 13, color: '#2d3748', lineHeight: 18, marginBottom: 4 },
  faultMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faultStatus: { fontSize: 11, fontWeight: '700' },
  faultDate: { fontSize: 11, color: '#a0aec0' },
  faultActions: { flexDirection: 'row', gap: 8, marginTop: 8, marginLeft: 18 },
  actionBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  actionBtnDisabled: { opacity: 0.4 },
  emptyBox: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 14, color: '#a0aec0' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  retryBtn: { borderWidth: 1.5, borderColor: '#1E50A0', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 },
  retryText: { fontSize: 14, fontWeight: '600', color: '#1E50A0' },
  loadMoreBtn: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 8 },
  loadMoreText: { fontSize: 13, fontWeight: '600', color: '#3182ce' },
});

