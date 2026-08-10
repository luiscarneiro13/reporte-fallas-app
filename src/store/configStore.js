import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const PRODUCTION_URL = 'https://tryironflow.com/api/v1';
const LOCAL_URL = 'http://localhost:8090/api/v1';

const useConfigStore = create(
  persist(
    (set, get) => ({
      apiBaseUrl: PRODUCTION_URL,
      environment: 'production',

      setProduction: () => set({ apiBaseUrl: PRODUCTION_URL, environment: 'production' }),
      setLocal: () => set({ apiBaseUrl: LOCAL_URL, environment: 'local' }),
    }),
    {
      name: '@ironflow_config',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useConfigStore;
