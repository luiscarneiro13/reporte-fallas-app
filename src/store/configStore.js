import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCTION_URL = 'https://servicioscasmar.com/api/v1';
const LOCAL_URL = 'http://192.168.1.77:8000/api/v1';

const useConfigStore = create(
  persist(
    (set, get) => ({
      apiBaseUrl: LOCAL_URL,
      environment: 'local',

      setProduction: () => set({ apiBaseUrl: PRODUCTION_URL, environment: 'production' }),
      setLocal: () => set({ apiBaseUrl: LOCAL_URL, environment: 'local' }),
    }),
    {
      name: '@ironflow_config',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useConfigStore;
