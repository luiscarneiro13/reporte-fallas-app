import React, { useState, useEffect, useRef } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '../../i18n';
import { getFaultById, getFaultCreationData, updateFault } from '../../api/faults';
import ScreenContainer, { ScrollContent } from '../../components/ScreenContainer';
import { getTodayString, toApiDate, fromApiDate } from '../../utils/dates';
import { catalogToOptions } from '../../utils/faultCatalog';
import { COLORS } from '../../constants/colors';

function toIntOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function SelectField({ label, value, onPress, required, error }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>
        {label}{required && <Text style={styles.req}> *</Text>}
      </Text>
      <TouchableOpacity style={[styles.selectBox, error && styles.inputError]} onPress={onPress} activeOpacity={0.7}>
        <Text style={[styles.selectText, !value && styles.placeholder]}>
          {value || 'Seleccione'}
        </Text>
        <Ionicons name="chevron-down-outline" size={16} color="#718096" />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function PickerModal({ visible, title, options, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.pickerBox}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(i) => i.value}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerRow} onPress={() => { onSelect(item); onClose(); }}>
                <Text style={styles.pickerRowText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function CloseFaultScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const faultId = route.params?.fault?.id;

  const [reportedBy,      setReportedBy]      = useState(null);
  const [equipment,       setEquipment]       = useState(null);
  const [serviceArea,     setServiceArea]     = useState(null);
  const [faultStatus,     setFaultStatus]     = useState(null);
  const [sparePartStatus, setSparePartStatus] = useState(null);
  const [description,     setDescription]     = useState('');
  const [reportDate,      setReportDate]      = useState('');
  const [scheduledExec,   setScheduledExec]   = useState('');
  const [completedExec,   setCompletedExec]   = useState(getTodayString());
  const [maintenanceLog,  setMaintenanceLog]  = useState('');
  const [executorInternal, setExecutorInternal] = useState(null);
  const [executorExternal, setExecutorExternal] = useState(null);
  const [activeModal,     setActiveModal]     = useState(null);
  const [fieldErrors,     setFieldErrors]     = useState({});

  const prefilled = useRef(false);

  const faultQuery = useQuery({
    queryKey: ['fault', faultId],
    queryFn: () => getFaultById(faultId),
    enabled: !!faultId,
  });

  const creationDataQuery = useQuery({
    queryKey: ['faultCreationData'],
    queryFn: getFaultCreationData,
    staleTime: 1000 * 60 * 30,
  });

  const data = creationDataQuery.data ?? {};
  const fault = faultQuery.data;

  const employeeOptions        = catalogToOptions(data.employee_reported);
  const equipmentOptions       = catalogToOptions(data.equipment);
  const serviceAreaOptions     = catalogToOptions(data.service_area);
  const faultStatusOptions     = catalogToOptions(data.fault_status);
  const sparePartStatusOptions = catalogToOptions(data.spare_part_status);
  const executorInternalOptions = catalogToOptions(data.executors_internal);
  const executorExternalOptions = catalogToOptions(data.executors_external);

  // Precarga el formulario con los valores reales de la falla, una sola vez.
  useEffect(() => {
    if (prefilled.current || !fault || creationDataQuery.isLoading) return;

    const findOpt = (options, id) => options.find((o) => o.value === String(id)) ?? null;

    setReportedBy(findOpt(employeeOptions, fault.reported_by_id));
    setEquipment(findOpt(equipmentOptions, fault.equipment_id));
    setServiceArea(findOpt(serviceAreaOptions, fault.service_area_id));
    setFaultStatus(findOpt(faultStatusOptions, fault.fault_status_id));
    setSparePartStatus(findOpt(sparePartStatusOptions, fault.spare_part_status_id));
    setDescription(fault.description ?? '');
    setReportDate(fromApiDate(fault.report_date) || getTodayString());
    setScheduledExec(fromApiDate(fault.scheduled_execution));
    if (fault.completed_execution) setCompletedExec(fromApiDate(fault.completed_execution));
    setMaintenanceLog(fault.equipment_maintenance_log ?? '');
    setExecutorInternal(findOpt(executorInternalOptions, fault.executor_id));
    setExecutorExternal(findOpt(executorExternalOptions, fault.executor_external_id));

    prefilled.current = true;
  }, [fault, creationDataQuery.isLoading]);

  const mutation = useMutation({
    mutationFn: (payload) => updateFault(faultId, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['faults'] });
      queryClient.invalidateQueries({ queryKey: ['fault', faultId] });
      if (result?.offline) {
        Alert.alert(t('common.saved') || 'Guardado', result.message || 'Guardado localmente');
      } else {
        Alert.alert(t('common.success') || 'OK', t('faults.closed_ok') || 'Falla cerrada y archivada correctamente');
      }
      navigation.navigate('FaultSummary');
    },
    onError: (err) => {
      if (err?.response?.status === 422 && err.response.data?.errors) {
        setFieldErrors(err.response.data.errors);
        Alert.alert(t('common.error') || 'Error', err.response.data.message || 'Revise los campos marcados');
        return;
      }
      const msg = err?.response?.data?.message || err?.message || 'No se pudo cerrar la falla';
      Alert.alert(t('common.error') || 'Error', msg);
    },
  });

  const modals = {
    reportedBy:       { setter: setReportedBy,       options: employeeOptions },
    equipment:        { setter: setEquipment,        options: equipmentOptions },
    serviceArea:      { setter: setServiceArea,      options: serviceAreaOptions },
    faultStatus:      { setter: setFaultStatus,      options: faultStatusOptions },
    sparePartStatus:  { setter: setSparePartStatus,  options: sparePartStatusOptions },
    executorInternal: { setter: setExecutorInternal, options: executorInternalOptions },
    executorExternal: { setter: setExecutorExternal, options: executorExternalOptions },
  };

  const handleClose = () => {
    if (
      !reportedBy || !equipment || !serviceArea || !faultStatus || !sparePartStatus ||
      !description.trim() || !maintenanceLog.trim()
    ) {
      Alert.alert(t('common.error') || 'Error', t('faults.required_fields') || 'Complete los campos obligatorios');
      return;
    }

    const reportISO      = toApiDate(reportDate);
    const scheduledISO   = toApiDate(scheduledExec);
    const completedISO   = toApiDate(completedExec);
    if (reportISO === undefined || scheduledISO === undefined || completedISO === undefined
        || !reportISO || !scheduledISO || !completedISO) {
      Alert.alert(t('common.error') || 'Error', 'Fechas inválidas o incompletas (dd-mm-yyyy)');
      return;
    }

    setFieldErrors({});

    const payload = {
      employee_reported_id:      toIntOrNull(reportedBy.value),
      equipment_id:               toIntOrNull(equipment.value),
      service_area_id:            toIntOrNull(serviceArea.value),
      description:                description.trim(),
      fault_status_id:            toIntOrNull(faultStatus.value),
      spare_part_status_id:       toIntOrNull(sparePartStatus.value),
      report_date:                reportISO,
      scheduled_execution:        scheduledISO,
      completed_execution:        completedISO,
      equipment_maintenance_log:  maintenanceLog.trim(),
      executor_id:                executorInternal ? toIntOrNull(executorInternal.value) : null,
      executor_external_id:       executorExternal ? toIntOrNull(executorExternal.value) : null,
      closed: true,
    };

    mutation.mutate(payload);
  };

  if (!faultId) return null;

  if (faultQuery.isLoading || creationDataQuery.isLoading) {
    return (
      <ScreenContainer style={{ paddingTop: insets.top }}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1E50A0" />
        </View>
      </ScreenContainer>
    );
  }

  if (faultQuery.isError || !fault) {
    return (
      <ScreenContainer style={{ paddingTop: insets.top }}>
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={48} color="#e53e3e" />
          <Text style={styles.emptyText}>{t('common.error') || 'Error al cargar datos'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>{t('actions.back') || 'Volver'}</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={{ paddingTop: insets.top }}>
      <LinearGradient colors={[COLORS.dark, COLORS.dark]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('faults.close_title')}</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollContent paddingBottom={120}>

        <SelectField label={t('faults.reported_by')}    value={reportedBy?.label}  onPress={() => setActiveModal('reportedBy')}  required error={fieldErrors.employee_reported_id?.[0]} />
        <SelectField label={t('faults.equipment')}      value={equipment?.label}   onPress={() => setActiveModal('equipment')}   required error={fieldErrors.equipment_id?.[0]} />
        <SelectField label={t('faults.service_area')}   value={serviceArea?.label} onPress={() => setActiveModal('serviceArea')} required error={fieldErrors.service_area_id?.[0]} />
        <SelectField label={t('faults.fault_status')}   value={faultStatus?.label} onPress={() => setActiveModal('faultStatus')} required error={fieldErrors.fault_status_id?.[0]} />
        <SelectField label={t('faults.spare_part_status')} value={sparePartStatus?.label} onPress={() => setActiveModal('sparePartStatus')} required error={fieldErrors.spare_part_status_id?.[0]} />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('faults.fault_description')}<Text style={styles.req}> *</Text></Text>
          <TextInput style={[styles.textInput, styles.textArea, fieldErrors.description && styles.inputError]} value={description} onChangeText={setDescription} multiline textAlignVertical="top" />
          {fieldErrors.description?.[0] && <Text style={styles.errorText}>{fieldErrors.description[0]}</Text>}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('faults.report_date')}<Text style={styles.req}> *</Text></Text>
          <TextInput style={[styles.textInput, fieldErrors.report_date && styles.inputError]} value={reportDate} onChangeText={setReportDate} placeholder="dd-mm-yyyy" placeholderTextColor="#a0aec0" />
          {fieldErrors.report_date?.[0] && <Text style={styles.errorText}>{fieldErrors.report_date[0]}</Text>}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('faults.scheduled_execution')}<Text style={styles.req}> *</Text></Text>
          <TextInput style={[styles.textInput, fieldErrors.scheduled_execution && styles.inputError]} value={scheduledExec} onChangeText={setScheduledExec} placeholder="dd-mm-yyyy" placeholderTextColor="#a0aec0" />
          {fieldErrors.scheduled_execution?.[0] && <Text style={styles.errorText}>{fieldErrors.scheduled_execution[0]}</Text>}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('faults.completed_execution')}<Text style={styles.req}> *</Text></Text>
          <TextInput style={[styles.textInput, fieldErrors.completed_execution && styles.inputError]} value={completedExec} onChangeText={setCompletedExec} placeholder="dd-mm-yyyy" placeholderTextColor="#a0aec0" />
          {fieldErrors.completed_execution?.[0] && <Text style={styles.errorText}>{fieldErrors.completed_execution[0]}</Text>}
        </View>

        <SelectField label={t('faults.executor_internal')} value={executorInternal?.label} onPress={() => setActiveModal('executorInternal')} error={fieldErrors.executor_id?.[0]} />
        <SelectField label={t('faults.executor_external')} value={executorExternal?.label} onPress={() => setActiveModal('executorExternal')} error={fieldErrors.executor_external_id?.[0]} />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('faults.activities_performed')}<Text style={styles.req}> *</Text></Text>
          <TextInput style={[styles.textInput, styles.textArea, fieldErrors.equipment_maintenance_log && styles.inputError]} value={maintenanceLog} onChangeText={setMaintenanceLog} multiline textAlignVertical="top" />
          {fieldErrors.equipment_maintenance_log?.[0] && <Text style={styles.errorText}>{fieldErrors.equipment_maintenance_log[0]}</Text>}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btnCancel} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.btnCancelText}>{t('actions.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnClose} onPress={handleClose} activeOpacity={0.85} disabled={mutation.isPending}>
            <LinearGradient colors={['#276749', '#38A169']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnCloseText}>{t('faults.close_title')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollContent>

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
  );
}

const styles = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  backBtn:      { padding: 2 },
  headerTitle:  { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
  fieldGroup:   { marginBottom: 16 },
  label:        { fontSize: 14, fontWeight: '600', color: '#2d3748', marginBottom: 6 },
  req:          { color: '#e53e3e' },
  selectBox:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e0', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14 },
  selectText:   { fontSize: 15, color: '#2d3748' },
  placeholder:  { color: '#718096' },
  inputError:   { borderColor: '#e53e3e' },
  errorText:    { fontSize: 12, color: '#e53e3e', marginTop: 4 },
  textInput:    { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e0', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: '#2d3748' },
  textArea:     { height: 90, textAlignVertical: 'top' },
  buttonRow:    { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnCancel:    { flex: 1, borderWidth: 1.5, borderColor: '#2d3748', borderRadius: 8, paddingVertical: 13, alignItems: 'center', backgroundColor: '#fff' },
  btnCancelText:{ fontSize: 15, fontWeight: '600', color: '#2d3748' },
  btnClose:     { flex: 1, borderRadius: 8, overflow: 'hidden' },
  btnGradient:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13 },
  btnCloseText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  pickerBox:    { backgroundColor: '#fff', borderRadius: 12, width: '80%', maxHeight: 320, paddingVertical: 8 },
  pickerTitle:  { fontSize: 15, fontWeight: '700', color: '#1A3A6B', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  pickerRow:    { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerRowText:{ fontSize: 15, color: '#2d3748' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText:    { fontSize: 14, color: '#a0aec0' },
  retryBtn:     { borderWidth: 1.5, borderColor: '#1E50A0', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 },
  retryText:    { fontSize: 14, fontWeight: '600', color: '#1E50A0' },
});
