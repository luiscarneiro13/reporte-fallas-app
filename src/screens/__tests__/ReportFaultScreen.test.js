import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReportFaultScreen from '../Operador/ReportFaultScreen';
import { I18nProvider } from '../../i18n';

// Mock navigation with useRoute
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({ params: {} }),
  DrawerActions: { toggleDrawer: jest.fn() },
}));

// Mock API client
jest.mock('../../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: [] })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

// Mock auth store
jest.mock('../../store/authStore', () => {
  const mockStore = jest.fn((selector) => {
    const state = {
      user: { id: 1, name: 'Test User' },
      token: 'test-token',
      roles: ['Operador'],
    };
    return selector ? selector(state) : state;
  });
  mockStore.getState = () => ({ user: { id: 1 }, token: 'test-token', roles: ['Operador'] });
  return { __esModule: true, default: mockStore };
});

// Mock config store
jest.mock('../../store/configStore', () => {
  const mockStore = jest.fn((selector) => {
    const state = { getApiBaseUrl: () => 'http://localhost:8090' };
    return selector ? selector(state) : state;
  });
  mockStore.getState = () => ({ getApiBaseUrl: () => 'http://localhost:8090' });
  return { __esModule: true, default: mockStore };
});

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

describe('ReportFaultScreen', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { queryClient, toJSON } = renderWithProviders(<ReportFaultScreen />);
    expect(toJSON()).toBeTruthy();
    queryClient.clear();
  });

  it('renders Save button', () => {
    const { queryClient, getByText } = renderWithProviders(<ReportFaultScreen />);
    expect(getByText('Save')).toBeTruthy();
    queryClient.clear();
  });
});
