import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import ScreenContainer, { ScrollContent } from '../../components/ScreenContainer';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, DrawerActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '../../i18n';
import { createFault, getFaultCreationData } from '../../api/faults';
import useAuthStore from '../../store/authStore';
import { COLORS } from '../../constants/colors';
import { getTodayString, toApiDate } from '../../utils/dates';
import { catalogToOptions } from '../../utils/faultCatalog';

function toIntOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function SelectField({ label, value, onPress, required, disabled, error }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.selectInput, disabled && styles.selectInputDisabled, error && styles.inputError]}
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.selectText, disabled && styles.selectTextDisabled, !value && styles.placeholder]}>
          {value || 'Seleccione'}
        </Text>
        {!disabled && <Ionicons name="chevron-down-outline" size={16} color="#718096" />}
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function buildReporterOption(user, employeeOptions = []) {
  if (!user) return null;
  const linked = employeeOptions.find((e) => e.value === String(user.employee_id));
  if (linked) return linked;
  const byName = employeeOptions.find((e) => e.label.toLowerCase().includes(String(user.name ?? '').toLowerCase()));
  return byName ?? null;
}

function normalizeSearch(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function PickerModal({ visible, title, options, onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const filteredOptions = search.trim()
    ? options.filter((item) => normalizeSearch(item.label).includes(normalizeSearch(search)))
    : options;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.modalBox} activeOpacity={1} onPress={() => {}}>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={styles.modalSearchWrap}>
            <Ionicons name="search-outline" size={16} color="#718096" style={styles.modalSearchIcon} />
            <TextInput
              style={styles.modalSearchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar..."
              placeholderTextColor="#a0aec0"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#a0aec0" />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={styles.modalOptionText}>{item.label}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.modalEmptyText}>Sin resultados</Text>
            }
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function ReportFaultScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const prefillEquipmentId = route.params?.equipmentId;
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const isOperator = roles.includes('Operador');

  const [reportedBy, setReportedBy] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [serviceArea, setServiceArea] = useState(null);
  const [faultStatus, setFaultStatus] = useState(null);
  const [sparePartStatus, setSparePartStatus] = useState(null);
  const [description, setDescription] = useState('');
  const [reportDate, setReportDate] = useState(getTodayString());
  const [scheduledExecution, setScheduledExecution] = useState('');

  const [activeModal, setActiveModal] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const queryClient = useQueryClient();

  const creationDataQuery = useQuery({
    queryKey: ['faultCreationData'],
    queryFn: getFaultCreationData,
    staleTime: 1000 * 60 * 30,
  });

  const data = creationDataQuery.data ?? {};

  const resetForm = () => {
    setReportedBy(null);
    setEquipment(null);
    setServiceArea(null);
    setFaultStatus(null);
    setSparePartStatus(null);
    setDescription('');
    setReportDate(getTodayString());
    setScheduledExecution('');
    setFieldErrors({});
  };

  const mutation = useMutation({
    mutationFn: createFault,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['faults'] });
      queryClient.invalidateQueries({ queryKey: ['faultCreationData'] });
      if (result?.offline) {
        Alert.alert(t('common.saved') || 'Guardado', result.message || 'Guardado localmente');
      } else {
        Alert.alert(t('common.success') || 'OK', t('faults.created_ok') || 'Falla reportada correctamente');
      }
      resetForm();
      navigation.navigate('FaultSummary');
    },
    onError: (err) => {
      if (err?.response?.status === 422 && err.response.data?.errors) {
        setFieldErrors(err.response.data.errors);
        Alert.alert(t('common.error') || 'Error', err.response.data.message || 'Revise los campos marcados');
        return;
      }
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo guardar la falla';
      Alert.alert(t('common.error') || 'Error', msg);
    },
  });

  const employeeOptions = catalogToOptions(data.employee_reported);
  const equipmentOptions = catalogToOptions(data.equipment);
  const serviceAreaOptions = catalogToOptions(data.service_area);
  const faultStatusOptions = catalogToOptions(data.fault_status);
  const sparePartStatusOptions = catalogToOptions(data.spare_part_status);

  // Status de falla: precargado en "Por Programación Interna"; solo el Operador lo tiene bloqueado.
  useEffect(() => {
    if (faultStatus || faultStatusOptions.length === 0) return;
    const fixed = faultStatusOptions.find(
      (o) => o.label.trim().toLowerCase() === 'por programación interna'
    );
    if (fixed) setFaultStatus(fixed);
  }, [faultStatusOptions, faultStatus]);

  // Reportado por: precargado con el usuario actual (si existe en la lista),
  // pero siempre editable — cualquier rol puede elegir a otro de la lista.
  useEffect(() => {
    if (creationDataQuery.isLoading || reportedBy) return;

    if (isOperator && data.default_employee_reported_id != null) {
      const opt = employeeOptions.find((o) => o.value === String(data.default_employee_reported_id));
      if (opt) { setReportedBy(opt); return; }
    }

    const guess = buildReporterOption(user, employeeOptions);
    if (guess) setReportedBy(guess);
  }, [creationDataQuery.isLoading, data.default_employee_reported_id, isOperator, reportedBy]);

  useEffect(() => {
    if (prefillEquipmentId && equipmentOptions.length > 0 && !equipment) {
      const prefill = equipmentOptions.find((opt) => opt.value === String(prefillEquipmentId));
      if (prefill) setEquipment(prefill);
    }
  }, [prefillEquipmentId, equipmentOptions.length]);

  const modals = {
    reportedBy:       { setter: setReportedBy,       options: employeeOptions,        loading: creationDataQuery.isLoading },
    equipment:        { setter: setEquipment,        options: equipmentOptions,       loading: creationDataQuery.isLoading },
    serviceArea:      { setter: setServiceArea,      options: serviceAreaOptions,     loading: creationDataQuery.isLoading },
    faultStatus:      { setter: setFaultStatus,      options: faultStatusOptions,     loading: creationDataQuery.isLoading },
    sparePartStatus:  { setter: setSparePartStatus,  options: sparePartStatusOptions, loading: creationDataQuery.isLoading },
  };

  const handleSave = () => {
    const sparePartRequired = !isOperator;
    if (
      !reportedBy || !equipment || !serviceArea || !faultStatus || !description.trim() ||
      (sparePartRequired && !sparePartStatus)
    ) {
      Alert.alert(t('common.error') || 'Error', t('faults.required_fields') || 'Complete los campos obligatorios');
      return;
    }

    const reportISO = toApiDate(reportDate);
    const scheduledISO = toApiDate(scheduledExecution);
    if (reportISO === undefined || scheduledISO === undefined) {
      Alert.alert(t('common.error') || 'Error', 'Fecha inválida (dd-mm-yyyy)');
      return;
    }

    setFieldErrors({});

    const payload = {
      employee_reported_id: toIntOrNull(reportedBy.value),
      equipment_id:         toIntOrNull(equipment.value),
      service_area_id:      toIntOrNull(serviceArea.value),
      description:          description.trim(),
      fault_status_id:      toIntOrNull(faultStatus.value),
      spare_part_status_id: sparePartStatus ? toIntOrNull(sparePartStatus.value) : null,
      report_date:          reportISO,
      scheduled_execution:  scheduledISO,
    };

    mutation.mutate(payload);
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
          <Text style={styles.headerTitle}>{t('faults.report_title')}</Text>
          <View style={styles.headerRight} />
        </LinearGradient>

        {/* Form */}
        <ScrollContent paddingBottom={120}>
          <SelectField
            label={t('faults.reported_by')}
            value={reportedBy?.label}
            onPress={() => setActiveModal('reportedBy')}
            required
            disabled={isOperator}
            error={fieldErrors.employee_reported_id?.[0]}
          />
          <SelectField
            label={t('faults.equipment')}
            value={equipment?.label}
            onPress={() => setActiveModal('equipment')}
            required
            error={fieldErrors.equipment_id?.[0]}
          />
          <SelectField
            label={t('faults.service_area')}
            value={serviceArea?.label}
            onPress={() => setActiveModal('serviceArea')}
            required
            error={fieldErrors.service_area_id?.[0]}
          />
          <SelectField
            label={t('faults.fault_status')}
            value={faultStatus?.label}
            onPress={() => setActiveModal('faultStatus')}
            required
            disabled={isOperator}
            error={fieldErrors.fault_status_id?.[0]}
          />
          <SelectField
            label={t('faults.spare_part_status')}
            value={sparePartStatus?.label}
            onPress={() => setActiveModal('sparePartStatus')}
            required={!isOperator}
            error={fieldErrors.spare_part_status_id?.[0]}
          />

          {/* Fault Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t('faults.fault_description')}
              <Text style={styles.required}> *</Text>
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea, fieldErrors.description && styles.inputError]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {fieldErrors.description?.[0] && <Text style={styles.errorText}>{fieldErrors.description[0]}</Text>}
          </View>

          {/* Report Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t('faults.report_date')}
            </Text>
            <TextInput
              style={[styles.textInput, fieldErrors.report_date && styles.inputError]}
              value={reportDate}
              onChangeText={setReportDate}
              placeholder="dd-mm-yyyy"
              placeholderTextColor="#a0aec0"
            />
            {fieldErrors.report_date?.[0] && <Text style={styles.errorText}>{fieldErrors.report_date[0]}</Text>}
          </View>

          {/* Scheduled Execution */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('faults.scheduled_execution')}</Text>
            <TextInput
              style={[styles.textInput, fieldErrors.scheduled_execution && styles.inputError]}
              value={scheduledExecution}
              onChangeText={setScheduledExecution}
              placeholder="dd-mm-yyyy"
              placeholderTextColor="#a0aec0"
            />
            {fieldErrors.scheduled_execution?.[0] && <Text style={styles.errorText}>{fieldErrors.scheduled_execution[0]}</Text>}
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={styles.btnSave}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={mutation.isPending}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnSaveGradient}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnSaveText}>{t('actions.save')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollContent>

        {/* Picker Modals */}
        {activeModal && (
          <PickerModal
            visible
            title="Seleccione"
            options={modals[activeModal].options}
            onSelect={(item) => modals[activeModal].setter(item)}
            onClose={() => setActiveModal(null)}
          />
        )}
      </ScreenContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  menuBtn: {
    padding: 2,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRight: {
    width: 32,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 6,
  },
  required: {
    color: '#e53e3e',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  selectInputDisabled: {
    backgroundColor: '#edf2f7',
    borderColor: '#e2e8f0',
  },
  inputError: {
    borderColor: '#e53e3e',
  },
  errorText: {
    fontSize: 12,
    color: '#e53e3e',
    marginTop: 4,
  },
  selectText: {
    fontSize: 15,
    color: '#2d3748',
  },
  selectTextDisabled: {
    color: '#4a5568',
  },
  placeholder: {
    color: '#718096',
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#2d3748',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  btnSave: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  btnSaveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  btnSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '85%',
    maxHeight: 420,
    paddingVertical: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A3A6B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  modalSearchIcon: {
    marginRight: 6,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#2d3748',
    paddingVertical: 8,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#2d3748',
  },
  modalEmptyText: {
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: 14,
    paddingVertical: 20,
  },
});
