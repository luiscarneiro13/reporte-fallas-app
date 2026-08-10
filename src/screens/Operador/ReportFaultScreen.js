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

function getTodayString() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function parseDateToISO(value) {
  if (!value) return null;
  const m = String(value).trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return undefined;
  const [, dd, mm, yyyy] = m;
  const iso = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  if (Number.isNaN(iso.getTime())) return undefined;
  return iso.toISOString();
}

function toIntOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function SelectField({ label, value, onPress, required, disabled }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.selectInput, disabled && styles.selectInputDisabled]}
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.selectText, disabled && styles.selectTextDisabled, !value && styles.placeholder]}>
          {value || 'Seleccione'}
        </Text>
        {!disabled && <Ionicons name="chevron-down-outline" size={16} color="#718096" />}
      </TouchableOpacity>
    </View>
  );
}

function buildReporterOption(user, employees = []) {
  if (!user) return null;

  if (!Array.isArray(employees)) return null;

  if (user.employee_id != null) {
    const linked = employees.find((e) => String(e.id) === String(user.employee_id));
    const label = linked
      ? `${linked.first_name ?? ''} ${linked.last_name ?? ''}`.trim()
      : user.name;
    return {
      value: String(user.employee_id),
      label: label || user.name || `#${user.employee_id}`,
    };
  }

  const linked = employees.find((e) =>
    e.users?.some((u) => u.id === user.id)
  );
  if (linked) {
    return {
      value: String(linked.id),
      label: `${linked.first_name ?? ''} ${linked.last_name ?? ''}`.trim() || user.name || `#${linked.id}`,
    };
  }

  return null;
}

function PickerModal({ visible, title, options, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={styles.modalOptionText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
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

  const [activeModal, setActiveModal] = useState(null);

  const queryClient = useQueryClient();

  const creationDataQuery = useQuery({
    queryKey: ['faultCreationData'],
    queryFn: getFaultCreationData,
    staleTime: 1000 * 60 * 30,
  });

  const data = creationDataQuery.data ?? {};

  const resetForm = () => {
    setReportedBy(buildReporterOption(user, Array.isArray(data.employee_reported) ? data.employee_reported : []));
    setEquipment(null);
    setServiceArea(null);
    setFaultStatus(null);
    setSparePartStatus(null);
    setDescription('');
    setReportDate(getTodayString());
  };

  const mutation = useMutation({
    mutationFn: createFault,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['faults'] });
      queryClient.invalidateQueries({ queryKey: ['faultCreationData'] });
      if (data?.offline) {
        Alert.alert(t('common.saved') || 'Guardado', data.message || 'Guardado localmente');
      } else {
        Alert.alert(t('common.success') || 'OK', t('faults.created_ok') || 'Falla reportada correctamente');
      }
      resetForm();
      navigation.navigate('FaultSummary');
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo guardar la falla';
      Alert.alert(t('common.error') || 'Error', msg);
    },
  });

  const employeeList = Object.entries(data.employee_reported || {}).map(([id, display]) => {
    const parts = display.split(' - ');
    return {
      id: Number(id),
      identification_number: parts[0] || '',
      first_name: parts[1]?.split(' ')[0] || '',
      last_name: parts[1]?.split(' ').slice(1).join(' ') || '',
    };
  });

  const employeeOptions = employeeList.map((e) => ({
    value: String(e.id),
    label: `${e.identification_number ?? ''} ${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || `#${e.id}`,
  }));

  useEffect(() => {
    if (isOperator) {
      const reporter = buildReporterOption(user, employeeList);
      if (reporter) setReportedBy(reporter);
      return;
    }
    if (creationDataQuery.isLoading) return;
    const reporter = buildReporterOption(user, employeeList);
    if (reporter) setReportedBy(reporter);
  }, [user, data.employee_reported, creationDataQuery.isLoading, isOperator]);

  const unwrap = (field) => (data[field]?.data ?? []);

  const equipmentOptions = unwrap('equipment').map((e) => {
    const label = `${e.brand_name ?? ''} ${e.vehicle_model ?? ''} ${e.placa ?? ''}`.trim() || `#${e.id}`;
    return { value: String(e.id), label, numericId: e.id };
  });

  useEffect(() => {
    if (prefillEquipmentId && equipmentOptions.length > 0 && !equipment) {
      const prefill = equipmentOptions.find((opt) => opt.value === String(prefillEquipmentId));
      if (prefill) {
        setEquipment(prefill);
      }
    }
  }, [prefillEquipmentId, equipmentOptions]);

  const serviceAreaOptions = unwrap('service_area').map((a) => ({
    value: String(a.id),
    label: a.name ?? `#${a.id}`,
  }));

  const faultStatusList = unwrap('fault_status');
  const faultStatusOptions = faultStatusList.map((s) => ({
    value: String(s.id),
    label: (s.name ?? `#${s.id}`).trim(),
  }));

  useEffect(() => {
    if (faultStatusList.length > 0 && !faultStatus) {
      const defaultStatusId = data.default_fault_status_id;
      const defaultStatus = faultStatusList.find(s => s.id === defaultStatusId);
      if (defaultStatus) {
        setFaultStatus({
          value: String(defaultStatus.id),
          label: defaultStatus.name,
        });
      }
    }
  }, [data.fault_status, data.default_fault_status_id, faultStatus]);

  const sparePartStatusOptions = unwrap('spare_part_status').map((s) => ({
    value: String(s.id),
    label: s.name ?? `#${s.id}`,
  }));

  const modals = {
    reportedBy:       { setter: setReportedBy,       options: employeeOptions,          loading: creationDataQuery.isLoading },
    equipment:        { setter: setEquipment,        options: equipmentOptions,         loading: creationDataQuery.isLoading },
    serviceArea:      { setter: setServiceArea,      options: serviceAreaOptions,       loading: creationDataQuery.isLoading },
    faultStatus:      { setter: setFaultStatus,      options: faultStatusOptions,       loading: creationDataQuery.isLoading },
    sparePartStatus:  { setter: setSparePartStatus,  options: sparePartStatusOptions,   loading: creationDataQuery.isLoading },
  };

  const handleSave = () => {
    if (!reportedBy || !equipment || !serviceArea || !faultStatus || !sparePartStatus || !description.trim()) {
      Alert.alert(t('common.error') || 'Error', t('faults.required_fields') || 'Complete los campos obligatorios');
      return;
    }

    const reportISO = parseDateToISO(reportDate);
    if (reportISO === undefined) {
      Alert.alert(t('common.error') || 'Error', 'Fecha de reporte inválida (dd-mm-yyyy)');
      return;
    }

    const payload = {
      employee_reported_id: toIntOrNull(reportedBy.value),
      equipment_id:         equipment.numericId,
      service_area_id:      toIntOrNull(serviceArea.value),
      description:          description.trim(),
      fault_status_id:      toIntOrNull(faultStatus.value),
      spare_part_status_id: toIntOrNull(sparePartStatus.value),
      report_date:          reportISO,
    };

    mutation.mutate(payload);
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
          />
          <SelectField
            label={t('faults.equipment')}
            value={equipment?.label}
            onPress={() => setActiveModal('equipment')}
            required
          />
          <SelectField
            label={t('faults.service_area')}
            value={serviceArea?.label}
            onPress={() => setActiveModal('serviceArea')}
            required
          />
          <SelectField
            label={t('faults.fault_status')}
            value={faultStatus?.label}
            onPress={() => setActiveModal('faultStatus')}
            required
            disabled={isOperator}
          />
          <SelectField
            label={t('faults.spare_part_status')}
            value={sparePartStatus?.label}
            onPress={() => setActiveModal('sparePartStatus')}
            required
          />

          {/* Fault Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t('faults.fault_description')}
              <Text style={styles.required}> *</Text>
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Report Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t('faults.report_date')}
              <Text style={styles.required}> *</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={reportDate}
              onChangeText={setReportDate}
              placeholder="dd-mm-yyyy"
              placeholderTextColor="#a0aec0"
            />
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={styles.btnSave}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={mutation.isPending}
          >
            <LinearGradient
              colors={['#1E3A8A', '#0066CC']}
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
    width: '80%',
    maxHeight: 320,
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
});

