import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from '../i18n';
import { getEquipment } from '../api/equipment';
import { getProjects } from '../api/faults';
import ScreenContainer from '../components/ScreenContainer';
import { COLORS } from '../constants/colors';

const buildParams = (f) => {
  const p = {};
  if (f.query) p.query = f.query;
  if (f.internal_code) p.internal_code = f.internal_code;
  if (f.project_id) p.project_id = f.project_id;
  if (f.active) p.active = f.active;
  return p;
};

function EquipmentCard({ item, onPress }) {
  const name = item.internal_code || item.placa || item.name || `#${item.id}`;
  const subtitle = [item.brand_name, item.vehicle_model]
    .filter(Boolean)
    .join(' ');
  const meta = [
    item.placa,
    item.type,
    item.model_year,
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

function PickerModal({ visible, title, options, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.pickerBox}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => String(item.value)}
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

function FilterSheet({ visible, filters, onChange, onApply, onClear, onClose, projectOptions, statusOptions, t }) {
  const [pickerModal, setPickerModal] = useState(null);

  const fields = [
    { key: 'query',         label: t('actions.search'),         type: 'text' },
    { key: 'internal_code', label: t('equipment.internal_code'), type: 'text' },
    { key: 'project_id',    label: t('equipment.project'),       type: 'select', options: projectOptions },
    { key: 'active',        label: t('equipment.status'),        type: 'select', options: statusOptions },
  ];

  const activePicker = pickerModal ? fields.find(f => f.key === pickerModal) : null;

  const selectedLabel = (field) => {
    const value = filters[field.key];
    if (!value) return null;
    return field.options?.find(opt => String(opt.value) === String(value))?.label;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t('equipment.filters')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-outline" size={24} color="#2d3748" />
            </TouchableOpacity>
          </View>

          <View style={styles.sheetScroll}>
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
                      {selectedLabel(field) || t('equipment.all')}
                    </Text>
                    <Ionicons name="chevron-down-outline" size={15} color="#718096" />
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={styles.filterInput}
                    value={filters[field.key] || ''}
                    onChangeText={(v) => onChange(field.key, v)}
                    placeholder={field.label}
                    placeholderTextColor="#a0aec0"
                  />
                )}
              </View>
            ))}
            <View style={{ height: 20 }} />
          </View>

          <View style={styles.sheetFooter}>
            <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
              <Text style={styles.clearBtnText}>{t('actions.remove_filters')}</Text>
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

      {activePicker && (
        <PickerModal
          visible
          title={activePicker.label}
          options={activePicker.options}
          onSelect={(item) => onChange(pickerModal, item.value)}
          onClose={() => setPickerModal(null)}
        />
      )}
    </Modal>
  );
}

export default function EquipmentScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [showFilters,   setShowFilters]   = useState(false);
  const [filters,       setFilters]       = useState({});
  const [activeFilters, setActiveFilters] = useState({});

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
    staleTime: 1000 * 60 * 30,
  });
  const projects = projectsQuery.data ?? [];

  const ALL_OPTION = useMemo(() => ({ value: '', label: t('equipment.all') }), [t]);

  const projectOptions = useMemo(() => {
    const items = Array.isArray(projects) ? projects : [];
    return [ALL_OPTION, ...items.map(p => ({
      value: String(p.id),
      label: p.project_name || p.name || `#${p.id}`,
    }))];
  }, [projects, ALL_OPTION]);

  const statusOptions = useMemo(() => [
    ALL_OPTION,
    { value: '1', label: t('equipment.active_only') },
    { value: '0', label: t('equipment.inactive_only') },
  ], [ALL_OPTION, t]);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['equipment', activeFilters],
    queryFn: async ({ pageParam }) => {
      const res = await getEquipment({ pageParam, ...buildParams(activeFilters) });
      const items = res.data?.data?.data ?? [];
      const pagination = res.data?.data?.pagination;
      return { items, pagination };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const p = lastPage.pagination;
      return p?.current_page < p?.last_page ? p.current_page + 1 : undefined;
    },
    staleTime: 1000 * 60 * 30,
  });

  const equipmentList = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  const filteredTotal = data?.pages[0]?.pagination?.total ?? 0;

  const activeFilterCount = Object.values(activeFilters).filter(v => v !== undefined && v !== '').length;

  const handleFilterChange = useCallback((key, value) => setFilters(prev => ({ ...prev, [key]: value })), []);

  const handleApply = () => {
    setActiveFilters({ ...filters });
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters({});
    setActiveFilters({});
    setShowFilters(false);
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#1E50A0" />
      </View>
    );
  };

  const handlePress = (item) => {
    navigation.navigate('EquipmentDetail', { equipmentId: String(item.id) });
  };

  const Header = (
    <LinearGradient colors={[COLORS.dark, COLORS.dark]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <TouchableOpacity
        onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        style={styles.menuBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="menu-outline" size={28} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('equipment.title') || 'Equipos'}</Text>
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
    </LinearGradient>
  );

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <ScreenContainer>
          {Header}
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
          {Header}
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
        {Header}

        <View style={styles.resultRow}>
          <Text style={styles.resultText}>{filteredTotal} {t('common.records')}</Text>
          {activeFilterCount > 0 && (
            <TouchableOpacity onPress={handleClearFilters}>
              <Text style={styles.clearText}>{t('actions.remove_filters')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={equipmentList}
          keyExtractor={(item) => String(item.uuid ?? item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <EquipmentCard item={item} onPress={() => handlePress(item)} />
          )}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={(
            <View style={styles.emptyBox}>
              <Ionicons name="car-outline" size={48} color="#cbd5e0" />
              <Text style={styles.emptyText}>{t('common.no_records') || 'No hay equipos'}</Text>
            </View>
          )}
        />

        <FilterSheet
          visible={showFilters}
          filters={filters}
          onChange={handleFilterChange}
          onApply={handleApply}
          onClear={handleClearFilters}
          onClose={() => setShowFilters(false)}
          projectOptions={projectOptions}
          statusOptions={statusOptions}
          t={t}
        />
      </ScreenContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  /* Results row */
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  resultText: { fontSize: 13, color: '#718096', fontWeight: '500' },
  clearText: { fontSize: 13, color: '#3182ce', fontWeight: '600' },

  listContent: { padding: 16, paddingTop: 4, paddingBottom: 120 },
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
  footerLoader: { paddingVertical: 20 },

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
