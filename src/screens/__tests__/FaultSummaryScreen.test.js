import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FaultSummaryScreen from '../Operador/FaultSummaryScreen';
import { I18nProvider } from '../../i18n';
import { getFaults } from '../../api/faults';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ dispatch: jest.fn(), navigate: jest.fn() }),
  DrawerActions: { toggleDrawer: jest.fn() },
}));

jest.mock('../../api/faults', () => ({
  getFaults: jest.fn(),
  getFaultCreationData: jest.fn().mockResolvedValue({}),
  getFaultFilterData: jest.fn().mockResolvedValue({}),
  getProjects: jest.fn().mockResolvedValue([]),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const renderWithProviders = (component) => {
  const queryClient = createTestQueryClient();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>{component}</I18nProvider>
    </QueryClientProvider>
  );
  return { ...utils, queryClient };
};

describe('FaultSummaryScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  // Saltados: la stats bar (badges Todos/Open/In Progress/Blocked) está comentada
  // en FaultSummaryScreen.js desde daabe8e. Reactivar estos tests si se reactiva esa UI.
  it.skip('uses stats.total for the Todos counter instead of pagination.total', async () => {
    getFaults.mockResolvedValue({
      data: {
        data: {
          data: [],
          pagination: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 26,
          },
          stats: {
            total: 129,
            open: 44,
            in_progress: 38,
            blocked: 21,
            scheduled: 0,
            closed: 0,
          },
        },
      },
    });

    const { getByText, getAllByText, queryClient } = renderWithProviders(<FaultSummaryScreen />);

    await waitFor(() => {
      expect(getByText('Todos')).toBeTruthy();
    });

    expect(getAllByText('129').length).toBeGreaterThan(0);
    expect(getByText('44')).toBeTruthy();
    expect(getByText('38')).toBeTruthy();
    expect(getByText('21')).toBeTruthy();
    expect(getByText(/26\s+records/i)).toBeTruthy();
    queryClient.clear();
  });

  it.skip('falls back to 0 when stats fields are missing', async () => {
    getFaults.mockResolvedValue({
      data: {
        data: {
          data: [],
          pagination: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 5,
          },
          stats: {},
        },
      },
    });

    const { getByText, getAllByText, queryClient } = renderWithProviders(<FaultSummaryScreen />);

    await waitFor(() => {
      expect(getByText('Todos')).toBeTruthy();
    });

    expect(getAllByText('0').length).toBeGreaterThanOrEqual(4);
    expect(getByText(/5\s+records/i)).toBeTruthy();
    queryClient.clear();
  });
});
