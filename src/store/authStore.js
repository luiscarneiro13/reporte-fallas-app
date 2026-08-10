import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user:  null,
      roles: [],
      pendingRoute: null,

      setAuth: (token, user, roles) => set({ token, user, roles: roles ?? [] }),
      clearAuth: () => set({ token: null, user: null, roles: [], pendingRoute: null }),
      setPendingRoute: (route) => set({ pendingRoute: route }),
      clearPendingRoute: () => set({ pendingRoute: null }),
      isAuthenticated: () => {
        const { token } = get();
        return !!token;
      },
      hasRole: (role) => {
        const { roles } = get();
        return roles.includes(role);
      },

    }),
    {
      name: '@ironflow_auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useAuthStore;
