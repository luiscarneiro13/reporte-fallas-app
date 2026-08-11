import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from '../../i18n';
import { getFaults, getFaultCreationData, getProjects } from '../../api/faults';
import ScreenContainer from '../../components/ScreenContainer';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { syncAll } from '../../services/syncService';
import { getQueue } from '../../services/offlineQueue';
import { COLORS } from '../../constants/colors';
import DateTimePicker from '@react-native-community/datetimepicker';

const STATUS_CONFIG = {
  'Open':        { color: '#e53e3e', bg: '#FFF5F5' },
  'In Progress': { color: '#d69e2e', bg: '#FFFFF0' },
  'Blocked':     { color: '#805ad5', bg: '#E9D8FD' },
  'Closed':      { color: '#38a169', bg: '#F0FFF4' },
};

const DEFAULT_STATUS = { color: '#718096', bg: '#F7FAFC' };

const SPANISH_TO_ENGLISH_STATUS = {
  'Creada': 'Open',
  'En Ejecución': 'In Progress',
  'Bloqueada': 'Blocked',
};

const ALL_OPTION         = { value: '', label: 'All' };
const STATUS_OPTIONS     = [
  ALL_OPTION,
  { value: 'Open',        labelKey: 'faults.status_open' },
  { value: 'In Progress', labelKey: 'faults.status_in_progress' },
  { value: 'Blocked',     labelKey: 'faults.status_blocked' },
];
const SPARE_PART_OPTIONS = [ALL_OPTION,
  { value: 'Por solicitar', label: 'Por solicitar' },
  { value: 'Solicitado',   label: 'Solicitado' },
  { value: 'Disponible',   label: 'Disponible' },
];

const buildParams = (f, statusIdMap) => {
  const p = {};
  if (f.equipment)       p.equipment         = f.equipment;
  if (f.serviceArea)     p.service_area       = f.serviceArea;
  if (f.faultStatus && statusIdMap[f.faultStatus]) p.fault_status_id = statusIdMap[f.faultStatus];
  if (f.sparePartStatus) p.spare_part_status  = f.sparePartStatus;
  if (f.project)         p.project           = f.project;
  if (f.from)            p.from              = f.from;
  if (f.to)              p.to                = f.to;
  if (f.search)          p.search            = f.search;
  return p;
};

function StatBadge({ count, label, color, isActive, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.statBadge, { borderColor: color, backgroundColor: isActive ? color : '#fff' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.statCount, { color: isActive ? '#fff' : color }]}>{count}</Text>
      <Text style={[styles.statLabel, { color: isActive ? '#fff' : '#718096' }]} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
    </TouchableOpacity>
  );
}

function FaultCard({ fault, onPress }) {
  const cfg = STATUS_CONFIG[fault.status] || DEFAULT_STATUS;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.cardAccent, { backgroundColor: cfg.color }]} />
      <View style={styles.cardBody}>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg, alignSelf: 'flex-start' }]}>
          <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{fault.status}</Text>
        </View>
        <Text style={styles.cardEquipment} numberOfLines={1}>{fault.equipment}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{fault.description}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={13} color="#718096" />
            <Text style={styles.metaText}>{fault.serviceArea}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="folder-outline" size={13} color="#718096" />
            <Text style={styles.metaText}>{fault.project}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={13} color="#718096" />
            <Text style={styles.metaText}>{fault.reportedBy}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color="#a0aec0" />
            <Text style={styles.footerDate}>{fault.date || 'N/A'}</Text>
          </View>
          <View style={styles.waitingBadge}>
            <Ionicons name="time-outline" size={12} color="#e53e3e" />
            <Text style={styles.waitingText}>
              {fault.waitingDays === 0 ? 'Today' : `${fault.waitingDays}d`}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PickerModal({ visible, title, options, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.pickerBox}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerOption}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={styles.pickerOptionText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function FilterSheet({ visible, filters, onChange, onApply, onClose, equipmentOptions, serviceAreaOptions, projectOptions }) {
  const { t } = useTranslation();
  const [pickerModal, setPickerModal] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState(null);

  const fields = [
    { key: 'equipment',       label: t('faults.equipment'),         type: 'select', options: equipmentOptions },
    { key: 'serviceArea',     label: t('faults.service_area'),      type: 'select', options: serviceAreaOptions },
    { key: 'faultStatus',     label: t('faults.fault_status'),      options: STATUS_OPTIONS,       type: 'select' },
    { key: 'sparePartStatus', label: t('faults.spare_part_status'), options: SPARE_PART_OPTIONS,   type: 'select' },
    { key: 'project',         label: t('faults.projects'),          type: 'select', options: projectOptions },
    { key: 'from',            label: t('faults.from'),              type: 'date' },
    { key: 'to',              label: t('faults.to'),                type: 'date' },
    { key: 'search',          label: t('actions.search'),           type: 'text' },
  ];

  const activeOptions = pickerModal
    ? fields.find(f => f.key === pickerModal)?.options.map(opt => ({
        ...opt,
        label: opt.labelKey ? t(opt.labelKey) : opt.label,
      })) || []
    : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Sheet header */}
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t('faults.filters')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-outline" size={24} color="#2d3748" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
            {fields.map((field) => (
              <View key={field.key} style={styles.filterField}>
                <Text style={styles.filterLabel}>{field.label}</Text>
                {field.type === 'select' ? (
                  <TouchableOpacity
                    style={styles.filterSelect}
                    onPress={() => setPickerModal(field.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterSelectText, !filters[field.key] && styles.filterPlaceholder]}>
                      {filters[field.key] || 'Todos'}
                    </Text>
                    <Ionicons name="chevron-down-outline" size={15} color="#718096" />
                  </TouchableOpacity>
                ) : field.type === 'date' ? (
                  <>
                    <TouchableOpacity
                      style={styles.filterSelect}
                      onPress={() => {
                        setDatePickerField(field.key);
                        setShowDatePicker(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterSelectText, !filters[field.key] && styles.filterPlaceholder]}>
                        {filters[field.key] || 'Seleccionar fecha'}
                      </Text>
                      <Ionicons name="calendar-outline" size={15} color="#718096" />
                    </TouchableOpacity>
                    {Platform.OS === 'android' && showDatePicker && datePickerField === field.key && (
                      <DateTimePicker
                        value={(() => {
                          const m = filters[field.key]?.match(/^(\d{2})-(\d{2})-(\d{4})$/);
                          return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`) : new Date();
                        })()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(false);
                          if (event.type === 'set' && selectedDate) {
                            const dd = String(selectedDate.getDate()).padStart(2, '0');
                            const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                            const yyyy = selectedDate.getFullYear();
                            onChange(field.key, `${dd}-${mm}-${yyyy}`);
                          }
                        }}
                      />
                    )}
                  </>
                ) : (
                  <TextInput
                    style={styles.filterInput}
                    value={filters[field.key] || ''}
                    onChangeText={(v) => onChange(field.key, v)}
                    placeholderTextColor="#a0aec0"
                  />
                )}
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Apply button */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                fields.forEach(f => onChange(f.key, ''));
              }}
            >
              <Text style={styles.clearBtnText}>{t('faults.remove_filters')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={onApply} activeOpacity={0.85}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryLight]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.applyBtnGradient}
              >
                <Ionicons name="funnel-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.applyBtnText}>{t('actions.filter')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {pickerModal && (
        <PickerModal
          visible
          title={fields.find(f => f.key === pickerModal)?.label}
          options={activeOptions}
          onSelect={(item) => onChange(pickerModal, item.value)}
          onClose={() => setPickerModal(null)}
        />
      )}

      {Platform.OS === 'ios' && showDatePicker && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
          <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
            <View style={styles.pickerBox}>
              <Text style={styles.pickerTitle}>
                {datePickerField === 'from' ? t('faults.from') : t('faults.to')}
              </Text>
              <DateTimePicker
                value={(() => {
                  const m = filters[datePickerField]?.match(/^(\d{2})-(\d{2})-(\d{4})$/);
                  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`) : new Date();
                })()}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (event.type === 'set' && selectedDate) {
                    const dd = String(selectedDate.getDate()).padStart(2, '0');
                    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const yyyy = selectedDate.getFullYear();
                    onChange(datePickerField, `${dd}-${mm}-${yyyy}`);
                  }
                }}
              />
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setShowDatePicker(false)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.applyBtnGradient}
                >
                  <Text style={styles.applyBtnText}>OK</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </Modal>
  );
}

export default function FaultSummaryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isOnline = useNetworkStatus();
  const { pendingCount, isSyncing } = useSyncStatus();
  const [pendingFaults, setPendingFaults] = useState([]);

  React.useEffect(() => {
    if (pendingCount > 0) {
      getQueue().then((q) => setPendingFaults(q.filter((e) => e.type === 'create_fault')));
    } else {
      setPendingFaults([]);
    }
  }, [pendingCount]);

  React.useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncAll();
    }
  }, [isOnline]);

  const STATUS_LABEL_MAP = {
    'Open': t('faults.status_open'),
    'In Progress': t('faults.status_in_progress'),
    'Blocked': t('faults.status_blocked'),
    'Closed': t('faults.status_closed'),
  };

  const [showFilters,   setShowFilters]   = useState(false);
  const [filters,       setFilters]       = useState({});
  const [activeFilters, setActiveFilters] = useState({});
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [statusIdMap, setStatusIdMap] = useState({});

  const creationDataQuery = useQuery({
    queryKey: ['faultCreationData'],
    queryFn: getFaultCreationData,
    staleTime: 1000 * 60 * 30,
  });
  const creationData = creationDataQuery.data ?? {};

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
    staleTime: 1000 * 60 * 30,
  });
  const projects = projectsQuery.data ?? [];

  const unwrap = useCallback((field) => (creationData[field]?.data ?? []), [creationData]);

  const equipmentOptions = useMemo(() => {
    const items = unwrap('equipment');
    return [ALL_OPTION, ...items.map(e => {
      const label = `${e.brand_name ?? ''} ${e.vehicle_model ?? ''} ${e.placa ?? ''}`.trim() || `#${e.id}`;
      return { value: label, label };
    })];
  }, [creationData]);

  const serviceAreaOptions = useMemo(() => {
    const items = unwrap('service_area');
    return [ALL_OPTION, ...items.map(a => ({
      value: a.name ?? `#${a.id}`,
      label: a.name ?? `#${a.id}`,
    }))];
  }, [creationData]);

  const projectOptions = useMemo(() => {
    const items = Array.isArray(projects) ? projects : [];
    return [ALL_OPTION, ...items.map(p => ({
      value: p.project_name || p.name || `#${p.id}`,
      label: p.project_name || p.name || `#${p.id}`,
    }))];
  }, [projects]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['faults', activeFilters],
    queryFn: async ({ pageParam }) => {
      const res = await getFaults({ pageParam, filters: buildParams(activeFilters, statusIdMap) });
      const raw = res.data.data.data;
      
      // Extract status IDs from the response
      const statusIds = {};
      raw.forEach(f => {
        if (f.fault_status_name && f.fault_status_id) {
          const englishName = SPANISH_TO_ENGLISH_STATUS[f.fault_status_name] || f.fault_status_name;
          statusIds[englishName] = f.fault_status_id;
        }
      });
      setStatusIdMap(prev => ({ ...prev, ...statusIds }));
      
      const mapped = raw.map((f) => ({
        id: f.id,
        equipment: f.equipment_name,
        description: f.description,
        status: f.fault_status_name,
        serviceArea: f.service_area_name,
        project: f.project_name,
        reportedBy: f.reported_by_name,
        date: f.report_date,
        waitingDays: f.duration_days,
        sparePartStatus: f.spare_part_status_name,
        division: f.division_name,
      }));
      const pagination = res.data.data.pagination;
      const stats = res.data.data.stats || null;
      return { mapped, pagination, stats };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const p = lastPage.pagination;
      return p.current_page < p.last_page ? p.current_page + 1 : undefined;
    },
  });

  const faults = useMemo(
    () => data?.pages.flatMap((p) => p.mapped) ?? [],
    [data]
  );

  const filteredTotal = data?.pages[0]?.pagination?.total ?? 0;

  const backendStats = data?.pages[0]?.stats;
  const stats = useMemo(() => {
    const source = backendStats ?? {};
    return {
      total: source.total ?? 0,
      open: source.open ?? 0,
      inProgress: source.in_progress ?? 0,
      blocked: source.blocked ?? 0,
      closed: source.closed ?? 0,
    };
  }, [backendStats]);

  const activeFilterCount = Object.values(activeFilters).filter(v => v?.trim()).length;

  React.useEffect(() => {
    if (error) console.warn('[FaultSummary] API error:', error?.response?.data || error?.message || error);
  }, [error]);

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const handleApply = () => {
    setActiveFilters({ ...filters });
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    setFilters({});
    setSelectedStatus('todos');
  };

  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
    if (status === 'todos') {
      setActiveFilters(prev => {
        const { faultStatus, ...rest } = prev;
        return rest;
      });
    } else {
      setActiveFilters(prev => ({ ...prev, faultStatus: status }));
    }
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#1E50A0" />
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <ScreenContainer backgroundColor="#F0F2F7" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <LinearGradient colors={[COLORS.dark, COLORS.dark]} style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={styles.menuBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu-outline" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('faults.summary_title')}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => { setFilters({ ...activeFilters }); setShowFilters(true); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="funnel-outline" size={22} color="#fff" />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.onlineDot}>
              <View style={[styles.onlineIndicator, { backgroundColor: isOnline ? '#38a169' : '#e53e3e' }]} />
            </View>
          </View>
        </LinearGradient>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <StatBadge
            count={stats.total}
            label="Todos"
            color="#718096"
            isActive={selectedStatus === 'todos'}
            onPress={() => handleStatusFilter('todos')}
          />
          <StatBadge
            count={stats.open}
            label={STATUS_LABEL_MAP['Open']}
            color="#e53e3e"
            isActive={selectedStatus === 'Open'}
            onPress={() => handleStatusFilter('Open')}
          />
          <StatBadge
            count={stats.inProgress}
            label={STATUS_LABEL_MAP['In Progress']}
            color="#d69e2e"
            isActive={selectedStatus === 'In Progress'}
            onPress={() => handleStatusFilter('In Progress')}
          />
          <StatBadge
            count={stats.blocked}
            label={STATUS_LABEL_MAP['Blocked']}
            color="#805ad5"
            isActive={selectedStatus === 'Blocked'}
            onPress={() => handleStatusFilter('Blocked')}
          />
        </View>

        {/* Sync banner */}
        {pendingCount > 0 && (
          <TouchableOpacity style={styles.syncBanner} onPress={() => { if (isOnline) syncAll(); }} activeOpacity={0.8}>
            <Ionicons name={isSyncing ? 'sync-outline' : 'cloud-upload-outline'} size={18} color="#fff" />
            <Text style={styles.syncBannerText}>
              {isSyncing
                ? 'Sincronizando...'
                : `${pendingCount} pendiente(s) — toca para sincronizar`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Result count */}
        <View style={styles.resultRow}>
          <Text style={styles.resultText}>{filteredTotal} {t('common.records')}</Text>
          {activeFilterCount > 0 && (
            <TouchableOpacity onPress={handleClearFilters}>
              <Text style={styles.clearText}>{t('faults.remove_filters')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Loading first page */}
        {isLoading && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#1E50A0" />
          </View>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <View style={styles.centerBox}>
            <Ionicons name="cloud-offline-outline" size={48} color="#cbd5e0" />
            <Text style={styles.emptyText}>{t('common.error') || 'Error loading data'}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>{t('actions.retry') || 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Fault list */}
        {!isLoading && !isError && (
          <FlatList
            data={faults}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <FaultCard fault={item} onPress={() => navigation.navigate('FaultDetail', { fault: item })} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={renderFooter}
            onRefresh={refetch}
            refreshing={isLoading}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="document-text-outline" size={48} color="#cbd5e0" />
                <Text style={styles.emptyText}>{t('common.no_records') || 'No records found'}</Text>
              </View>
            }
          />
        )}

        <FilterSheet
          visible={showFilters}
          filters={filters}
          onChange={handleFilterChange}
          onApply={handleApply}
          onClose={() => setShowFilters(false)}
          equipmentOptions={equipmentOptions}
          serviceAreaOptions={serviceAreaOptions}
          projectOptions={projectOptions}
        />
      </ScreenContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  menuBtn: { padding: 2 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
  filterBtn: { padding: 2, position: 'relative' },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#e53e3e', borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineDot: { padding: 2 },
  onlineIndicator: { width: 10, height: 10, borderRadius: 5 },

  /* Sync banner */
  syncBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#d69e2e', paddingVertical: 10, paddingHorizontal: 16,
  },
  syncBannerText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  /* Stats */
  statsBar: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  statBadge: { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10, borderWidth: 1.5, minWidth: 60 },
  statCount: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 9, color: '#718096', fontWeight: '500', marginTop: 1 },

  /* Results row */
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  resultText: { fontSize: 13, color: '#718096', fontWeight: '500' },
  clearText: { fontSize: 13, color: '#3182ce', fontWeight: '600' },

  /* List */
  listContent: { padding: 12, paddingTop: 4, paddingBottom: 120 },

  /* Fault card */
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  cardAccent: { width: 5 },
  cardBody: { flex: 1, padding: 13 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardEquipment: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A3A6B', marginRight: 8, marginTop: 4, marginBottom: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: '#4a5568', lineHeight: 18, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: '#718096' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 7 },
  footerDate: { fontSize: 12, color: '#a0aec0' },
  waitingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFF5F5', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  waitingText: { fontSize: 11, color: '#e53e3e', fontWeight: '700' },

  /* Empty / center states */
  emptyBox:    { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:   { fontSize: 15, color: '#a0aec0' },
  centerBox:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  retryBtn:    { borderWidth: 1.5, borderColor: '#1E50A0', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 },
  retryText:   { fontSize: 14, fontWeight: '600', color: '#1E50A0' },
  footerLoader:{ paddingVertical: 20, alignItems: 'center' },

  /* Filter bottom sheet */
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetDismiss: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#cbd5e0', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1A3A6B' },
  sheetScroll: { paddingHorizontal: 20 },
  filterField: { marginTop: 16 },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#2d3748', marginBottom: 6 },
  filterSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#cbd5e0', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fff' },
  filterSelectText: { fontSize: 15, color: '#2d3748' },
  filterPlaceholder: { color: '#718096' },
  filterInput: { borderWidth: 1, borderColor: '#cbd5e0', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: '#2d3748', backgroundColor: '#fff' },
  sheetFooter: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  clearBtn: { flex: 1, borderWidth: 1.5, borderColor: '#2d3748', borderRadius: 8, paddingVertical: 13, alignItems: 'center', backgroundColor: '#fff' },
  clearBtnText: { fontSize: 14, fontWeight: '600', color: '#2d3748' },
  applyBtn: { flex: 1, borderRadius: 8, overflow: 'hidden' },
  applyBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13 },
  applyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  /* Inline picker modal */
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  pickerBox: { backgroundColor: '#fff', borderRadius: 12, width: '80%', maxHeight: 320, paddingVertical: 8 },
  pickerTitle: { fontSize: 15, fontWeight: '700', color: '#1A3A6B', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  pickerOption: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerOptionText: { fontSize: 15, color: '#2d3748' },
});
