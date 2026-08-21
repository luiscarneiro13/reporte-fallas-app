import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';
import { I18nProvider } from '../../i18n';

// Mock the navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
  DrawerActions: { toggleDrawer: jest.fn() },
}));

// Mock the auth store
jest.mock('../../store/authStore', () => {
  const mockStore = jest.fn((selector) => {
    const state = {
      setAuth: jest.fn(),
      setPendingRoute: jest.fn(),
      pendingRoute: null,
      clearPendingRoute: jest.fn(),
    };
    return selector ? selector(state) : state;
  });
  mockStore.getState = () => ({
    setAuth: jest.fn(),
    setPendingRoute: jest.fn(),
    pendingRoute: null,
    clearPendingRoute: jest.fn(),
  });
  return { __esModule: true, default: mockStore };
});

// Mock the auth API
jest.mock('../../api/auth', () => ({
  loginRequest: jest.fn(),
}));

const renderWithProviders = (component) =>
  render(<I18nProvider>{component}</I18nProvider>);

describe('LoginScreen', () => {
  it('renders email and password inputs', () => {
    const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);

    expect(getByPlaceholderText('Correo Electrónico')).toBeTruthy();
    expect(getByPlaceholderText('Contraseña')).toBeTruthy();
  });

  it('shows error when submitting with empty fields', async () => {
    const { getByText, findByText } = renderWithProviders(<LoginScreen />);

    fireEvent.press(getByText('Ingresar'));

    const error = await findByText('Por favor ingresa tu correo y contraseña.');
    expect(error).toBeTruthy();
  });

  it('updates email input value', () => {
    const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);
    const emailInput = getByPlaceholderText('Correo Electrónico');

    fireEvent.changeText(emailInput, 'test@example.com');
    expect(emailInput.props.value).toBe('test@example.com');
  });

  it('updates password input value', () => {
    const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);
    const passwordInput = getByPlaceholderText('Contraseña');

    fireEvent.changeText(passwordInput, 'secret123');
    expect(passwordInput.props.value).toBe('secret123');
  });
});
