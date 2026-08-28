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
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '../i18n';
import { getEquipmentHistory } from '../api/equipment';
import ScreenContainer, { ScrollContent } from '../components/ScreenContainer';
import { COLORS } from '../constants/colors';

function FaultHistoryItem({ fault }) {
  const { t } = useTranslation();
  return (
    <View style={styles.faultItem}>
      <Text style={styles.faultDesc} numberOfLines={2}>{fault.description}</Text>
      <Text style={styles.faultDate}>
        {t('faults.closed_date') || 'Fecha de cierre'}: {fault.closed_at?.slice(0, 10) || '—'}
      </Text>
    </View>
  );
}

export default function EquipmentDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const equipmentId = route.params?.equipmentId;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['equipmentHistory', equipmentId],
    queryFn: () => getEquipmentHistory(equipmentId),
    enabled: !!equipmentId,
  });

  const equipment = data?.equipment;
  const history = useMemo(() => data?.history ?? [], [data]);

  const handleReportFault = () => {
    if (!equipment) return;
    navigation.navigate('Main', {
      screen: 'ReportFault',
      params: { equipmentId: String(equipment.id) },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E50A0" />
      </View>
    );
  }

  if (isError || !equipment) {
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
        <LinearGradient colors={[COLORS.dark, COLORS.dark]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
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
            <Text style={styles.equipmentName}>{equipment.internal_code || equipment.placa || `#${equipment.id}`}</Text>
            {(equipment.brand_name || equipment.vehicle_model) && (
              <Text style={styles.equipmentSub}>
                {[equipment.brand_name, equipment.vehicle_model].filter(Boolean).join(' ')}
              </Text>
            )}
            <View style={styles.equipmentMeta}>
              {equipment.placa && (
                <Text style={styles.metaPill}>{equipment.placa}</Text>
              )}
              {equipment.type && (
                <Text style={styles.metaPill}>{equipment.type}</Text>
              )}
              {equipment.model_year && (
                <Text style={styles.metaPill}>{equipment.model_year}</Text>
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
              {t('equipment.fault_history') || 'Historial de Fallas'}
            </Text>

            {history.length === 0 && (
              <View style={styles.emptyBox}>
                <Ionicons name="document-text-outline" size={36} color="#cbd5e0" />
                <Text style={styles.emptyText}>{t('common.no_records') || 'No hay registros'}</Text>
              </View>
            )}

            {history.map((fault) => (
              <FaultHistoryItem key={fault.id} fault={fault} />
            ))}
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
  faultDesc: { fontSize: 13, color: '#2d3748', lineHeight: 18, marginBottom: 4 },
  faultDate: { fontSize: 11, color: '#a0aec0' },
  emptyBox: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 14, color: '#a0aec0' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  retryBtn: { borderWidth: 1.5, borderColor: '#1E50A0', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 },
  retryText: { fontSize: 14, fontWeight: '600', color: '#1E50A0' },
});
