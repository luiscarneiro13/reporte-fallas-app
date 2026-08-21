import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CloseFaultScreen from '../Supervisor/CloseFaultScreen';
import { I18nProvider } from '../../i18n';
import { getFaultById, getFaultCreationData } from '../../api/faults';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({ params: { fault: { id: 42 } } }),
  DrawerActions: { toggleDrawer: jest.fn() },
}));

jest.mock('../../api/faults', () => ({
  getFaultById: jest.fn(),
  getFaultCreationData: jest.fn(),
  updateFault: jest.fn(),
}));

const CREATION_DATA = {
  employee_reported: [{ id: 1, label: 'Juan Pérez' }],
  equipment: [{ id: 2, label: 'Grúa 1' }],
  service_area: [{ id: 3, label: 'Patio' }],
  fault_status: [{ id: 4, label: 'Por Programación Interna' }],
  spare_part_status: [{ id: 5, label: 'Disponible' }],
  executors_internal: [],
  executors_external: [],
};

const FAULT = {
  id: 42,
  reported_by_id: 1,
  equipment_id: 2,
  service_area_id: 3,
  fault_status_id: 4,
  spare_part_status_id: 5,
  description: 'Falla original',
  report_date: '2026-08-01',
  scheduled_execution: '2026-08-05',
  completed_execution: '2026-08-06',
  equipment_maintenance_log: 'Cambio de repuesto',
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const renderWithProviders = (component) => {
  const queryClient = createTestQueryClient();
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider>{component}</I18nProvider>
      </QueryClientProvider>
    ),
  };
};

describe('CloseFaultScreen', () => {
  beforeEach(() => {
    getFaultById.mockResolvedValue(FAULT);
    getFaultCreationData.mockResolvedValue(CREATION_DATA);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing while loading', () => {
    const { queryClient, toJSON } = renderWithProviders(<CloseFaultScreen />);
    expect(toJSON()).toBeTruthy();
    queryClient.clear();
  });

  it('loads the fault and prefills the form from getFaultById/getFaultCreationData', async () => {
    const { queryClient, findByText, findAllByText, findByDisplayValue } = renderWithProviders(<CloseFaultScreen />);

    expect(await findByText('Grúa 1')).toBeTruthy();
    expect(await findByDisplayValue('Cambio de repuesto')).toBeTruthy();
    // El título del header y el texto del botón comparten la misma traducción.
    expect(await findAllByText('Cerrar Falla')).toHaveLength(2);
    queryClient.clear();
  });

  it('shows the loading error screen when the fault fails to load', async () => {
    getFaultById.mockRejectedValue(new Error('network down'));

    const { queryClient, findByText } = renderWithProviders(<CloseFaultScreen />);

    expect(await findByText('Atrás')).toBeTruthy();
    queryClient.clear();
  });
});
