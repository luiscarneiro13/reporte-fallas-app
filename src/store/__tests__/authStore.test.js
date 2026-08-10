import { act } from '@testing-library/react-native';
import useAuthStore from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().clearAuth();
    });
  });

  it('initial state should be empty', () => {
    const state = useAuthStore.getState();

    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.roles).toEqual([]);
    expect(state.isAuthenticated()).toBe(false);
  });

  it('should set auth with setAuth', () => {
    act(() => {
      useAuthStore.getState().setAuth(
        'test-token',
        { id: 1, name: 'Test User', email: 'test@example.com' },
        ['operator']
      );
    });

    const state = useAuthStore.getState();
    expect(state.token).toBe('test-token');
    expect(state.user).toEqual({ id: 1, name: 'Test User', email: 'test@example.com' });
    expect(state.roles).toEqual(['operator']);
    expect(state.isAuthenticated()).toBe(true);
  });

  it('should default roles to empty array when not provided', () => {
    act(() => {
      useAuthStore.getState().setAuth('test-token', { id: 1 }, null);
    });

    expect(useAuthStore.getState().roles).toEqual([]);
  });

  it('should clear auth on logout', () => {
    act(() => {
      useAuthStore.getState().setAuth('test-token', { id: 1 }, ['operator']);
    });

    expect(useAuthStore.getState().isAuthenticated()).toBe(true);

    act(() => {
      useAuthStore.getState().clearAuth();
    });

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.roles).toEqual([]);
    expect(state.isAuthenticated()).toBe(false);
  });

  it('should check if user has specific role', () => {
    act(() => {
      useAuthStore.getState().setAuth('test-token', { id: 1 }, ['operator', 'supervisor']);
    });

    const state = useAuthStore.getState();
    expect(state.hasRole('operator')).toBe(true);
    expect(state.hasRole('supervisor')).toBe(true);
    expect(state.hasRole('admin')).toBe(false);
  });

  it('should set and clear pending route', () => {
    act(() => {
      useAuthStore.getState().setPendingRoute('Dashboard');
    });

    expect(useAuthStore.getState().pendingRoute).toBe('Dashboard');

    act(() => {
      useAuthStore.getState().clearPendingRoute();
    });

    expect(useAuthStore.getState().pendingRoute).toBeNull();
  });
});
