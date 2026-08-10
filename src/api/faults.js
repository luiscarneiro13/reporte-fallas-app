import client from './client';
import { addToQueue } from '../services/offlineQueue';
import { getIsOnline } from '../services/networkService';

export const getFaults = ({ pageParam, filters = {} }) =>
  client.get('/fallas', { params: { page: pageParam, ...filters } });

export const createFault = async (payload) => {
  if (!getIsOnline()) {
    const entry = await addToQueue({ type: 'create_fault', payload });
    return { offline: true, localId: entry.localId, message: 'Guardado localmente. Se sincronizará cuando haya conexión.' };
  }
  return client.post('/fallas', payload).then((r) => r.data);
};

export const getFaultCreationData = () =>
  client.get('/fallas/crear-datos').then((r) => r.data?.data ?? {});

export const getProjects = () =>
  client.get('/proyectos', { params: { per_page: 200 } })
    .then((r) => r.data?.data?.data ?? []);
