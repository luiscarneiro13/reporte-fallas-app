import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../i18n';
import ScreenContainer, { ScrollContent } from '../../components/ScreenContainer';

const MOCK_EMPLOYEES  = [{ value: '1', label: 'Alcalá Alejandro' }, { value: '2', label: 'García María' }, { value: '3', label: 'Torres Juan' }];
const MOCK_EQUIPMENT  = [{ value: '1', label: 'Camioneta - CSM-VL-002 - A78AS1B' }, { value: '2', label: 'Excavator CAT 320' }, { value: '3', label: 'Crane Liebherr LTM' }];
const MOCK_AREAS      = [{ value: '1', label: 'Mecánica liviana' }, { value: '2', label: 'Hydraulics' }, { value: '3', label: 'Electrical' }];
const MOCK_STATUSES   = [{ value: '1', label: 'En espera de repuesto' }, { value: '2', label: 'In Progress' }, { value: '3', label: 'Scheduled' }, { value: '4', label: 'Closed' }];
const MOCK_SPARE      = [{ value: '1', label: 'Solicitado' }, { value: '2', label: 'Available' }, { value: '3', label: 'Missing' }];

function SelectField({ label, value, onPress, required }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>
        {label}{required && <Text style={styles.req}> *</Text>}
      </Text>
      <TouchableOpacity style={styles.selectBox} onPress={onPress} activeOpacity={0.7}>
        <Text style={[styles.selectText, !value && styles.placeholder]}>
          {value || 'Seleccione'}
        </Text>
        <Ionicons name="chevron-down-outline" size={16} color="#718096" />
      </TouchableOpacity>
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

export default function EditFaultScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const fault = route.params?.fault;

  const [reportedBy,     setReportedBy]     = useState(fault?.reportedBy     ? { label: fault.reportedBy }     : null);
  const [equipment,      setEquipment]      = useState(fault?.equipment      ? { label: fault.equipment }      : null);
  const [serviceArea,    setServiceArea]    = useState(fault?.serviceArea     ? { label: fault.serviceArea }    : null);
  const [faultStatus,    setFaultStatus]    = useState(fault?.status          ? { label: fault.status }          : null);
  const [sparePart,      setSparePart]      = useState(null);
  const [description,    setDescription]    = useState(fault?.description    || '');
  const [reportDate,     setReportDate]     = useState(fault?.date           || '');
  const [scheduledExec,  setScheduledExec]  = useState(fault?.scheduledExecution || '');
  const [activeModal,    setActiveModal]    = useState(null);

  const modals = {
    reportedBy: { setter: setReportedBy, options: MOCK_EMPLOYEES },
    equipment:  { setter: setEquipment,  options: MOCK_EQUIPMENT  },
    serviceArea:{ setter: setServiceArea,options: MOCK_AREAS      },
    faultStatus:{ setter: setFaultStatus,options: MOCK_STATUSES   },
    sparePart:  { setter: setSparePart,  options: MOCK_SPARE      },
  };

  return (
    <ScreenContainer style={{ paddingTop: insets.top }}>
      <LinearGradient colors={['#1A3A6B', '#1E50A0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('faults.edit_title')}</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollContent paddingBottom={120}>
        <SelectField label={t('faults.reported_by')} value={reportedBy?.label} onPress={() => setActiveModal('reportedBy')} />
        <SelectField label={t('faults.equipment')}   value={equipment?.label}  onPress={() => setActiveModal('equipment')} />
        <SelectField label={t('faults.service_area')}value={serviceArea?.label}onPress={() => setActiveModal('serviceArea')} />
        <SelectField label={t('faults.fault_status')}value={faultStatus?.label}onPress={() => setActiveModal('faultStatus')} />
        <SelectField label={t('faults.spare_part_status')} value={sparePart?.label} onPress={() => setActiveModal('sparePart')} />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('faults.fault_description')}</Text>
          <TextInput style={[styles.textInput, styles.textArea]} value={description} onChangeText={setDescription} multiline textAlignVertical="top" />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('faults.report_date')}<Text style={styles.req}> *</Text></Text>
          <TextInput style={styles.textInput} value={reportDate} onChangeText={setReportDate} placeholder="dd-mm-yyyy" placeholderTextColor="#a0aec0" />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('faults.scheduled_execution')}</Text>
          <TextInput style={styles.textInput} value={scheduledExec} onChangeText={setScheduledExec} placeholder="dd-mm-yyyy" placeholderTextColor="#a0aec0" />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btnCancel} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.btnCancelText}>{t('actions.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSave} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <LinearGradient colors={['#1E3A8A', '#0066CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
              <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.btnSaveText}>{t('actions.save')}</Text>
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
  header:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  backBtn:     { padding: 2 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
  fieldGroup:  { marginBottom: 16 },
  label:       { fontSize: 14, fontWeight: '600', color: '#2d3748', marginBottom: 6 },
  req:         { color: '#e53e3e' },
  selectBox:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e0', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14 },
  selectText:  { fontSize: 15, color: '#2d3748' },
  placeholder: { color: '#718096' },
  textInput:   { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e0', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: '#2d3748' },
  textArea:    { height: 90, textAlignVertical: 'top' },
  buttonRow:   { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnCancel:   { flex: 1, borderWidth: 1.5, borderColor: '#2d3748', borderRadius: 8, paddingVertical: 13, alignItems: 'center', backgroundColor: '#fff' },
  btnCancelText:{ fontSize: 15, fontWeight: '600', color: '#2d3748' },
  btnSave:     { flex: 1, borderRadius: 8, overflow: 'hidden' },
  btnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13 },
  btnSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  pickerBox:   { backgroundColor: '#fff', borderRadius: 12, width: '80%', maxHeight: 320, paddingVertical: 8 },
  pickerTitle: { fontSize: 15, fontWeight: '700', color: '#1A3A6B', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  pickerRow:   { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerRowText:{ fontSize: 15, color: '#2d3748' },
});
