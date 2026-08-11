import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import ScreenContainer, { ScrollContent } from '../../components/ScreenContainer';
import { COLORS } from '../../constants/colors';

const STATUS_CONFIG = {
  'Open':        { color: '#e53e3e', bg: '#FFF5F5' },
  'In Progress': { color: '#d69e2e', bg: '#FFFFF0' },
  'Scheduled':   { color: '#3182ce', bg: '#EBF8FF' },
  'Closed':      { color: '#38a169', bg: '#F0FFF4' },
};

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color="#1E50A0" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function FaultDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const fault = route.params?.fault;
  const roles = useAuthStore((s) => s.roles);
  const isOperator = roles.includes('Operador');

  if (!fault) return null;

  const cfg = STATUS_CONFIG[fault.status] || STATUS_CONFIG['Open'];

  return (
    <ScreenContainer backgroundColor="#F0F2F7" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <LinearGradient colors={[COLORS.dark, COLORS.dark]} style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('faults.title')} #{fault.id}
        </Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollContent paddingBottom={120} showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroId}>
              <Text style={styles.heroIdText}>#{fault.id}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
              <Text style={[styles.statusPillText, { color: cfg.color }]}>{fault.status}</Text>
            </View>
          </View>
          <Text style={styles.heroEquipment}>{fault.equipment}</Text>
          <Text style={styles.heroDesc}>{fault.description}</Text>

          {fault.waitingDays > 0 && (
            <View style={styles.waitingRow}>
              <Ionicons name="time-outline" size={15} color="#e53e3e" />
              <Text style={styles.waitingText}>
                {fault.waitingDays === 1
                  ? `1 ${t('faults.days')} waiting`
                  : `${fault.waitingDays} ${t('faults.days')} waiting`}
              </Text>
            </View>
          )}
        </View>

        {/* Details */}
        <Section title={t('faults.fault_description')}>
          <InfoRow icon="construct-outline"   label={t('faults.equipment')}          value={fault.equipment} />
          <InfoRow icon="location-outline"    label={t('faults.service_area')}       value={fault.serviceArea} />
          <InfoRow icon="folder-outline"      label={t('faults.projects')}           value={fault.project} />
          <InfoRow icon="alert-circle-outline"label={t('faults.fault_status')}       value={fault.status} />
          <InfoRow icon="cube-outline"        label={t('faults.spare_part_status')}  value={fault.sparePartStatus || '—'} />
        </Section>

        <Section title={t('faults.reported_by')}>
          <InfoRow icon="person-outline"    label={t('faults.reported_by')}    value={fault.reportedBy} />
          <InfoRow icon="calendar-outline"  label={t('faults.report_date')}    value={fault.date} />
          <InfoRow icon="calendar-outline"  label={t('faults.scheduled_execution')} value={fault.scheduledExecution || '—'} />
        </Section>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.btnBack}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back-outline" size={17} color="#1E50A0" style={{ marginRight: 5 }} />
            <Text style={styles.btnBackText}>{t('actions.back')}</Text>
          </TouchableOpacity>

          {!isOperator && (
            <TouchableOpacity
              style={styles.btnEdit}
              onPress={() => navigation.navigate('EditFault', { fault })}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                <Ionicons name="create-outline" size={17} color="#fff" style={{ marginRight: 5 }} />
                <Text style={styles.btnGradientText}>{t('faults.edit_title')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {!isOperator && fault.status !== 'Closed' && (
          <TouchableOpacity
            style={styles.btnCloseFault}
            onPress={() => navigation.navigate('CloseFault', { fault })}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#276749', '#38A169']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
              <Ionicons name="checkmark-circle-outline" size={17} color="#fff" style={{ marginRight: 5 }} />
              <Text style={styles.btnGradientText}>{t('faults.close_title')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

      </ScrollContent>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({

  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  backBtn: { padding: 2 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
  headerRight: { width: 28 },

  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  heroId: { backgroundColor: '#EBF4FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  heroIdText: { fontSize: 13, fontWeight: '700', color: '#1E50A0' },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 13, fontWeight: '700' },
  heroEquipment: { fontSize: 18, fontWeight: '800', color: '#1A3A6B', marginBottom: 6 },
  heroDesc: { fontSize: 14, color: '#4a5568', lineHeight: 21, marginBottom: 10 },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF5F5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  waitingText: { fontSize: 13, color: '#e53e3e', fontWeight: '600' },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },

  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EBF4FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#a0aec0', fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#2d3748', fontWeight: '600' },

  actionRow:     { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 10 },
  btnBack:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#1E50A0', borderRadius: 10, paddingVertical: 13, backgroundColor: '#fff' },
  btnBackText:   { fontSize: 14, fontWeight: '600', color: '#1E50A0' },
  btnEdit:       { flex: 1, borderRadius: 10, overflow: 'hidden' },
  btnCloseFault: { borderRadius: 10, overflow: 'hidden', marginBottom: 4 },
  btnGradient:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  btnGradientText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
