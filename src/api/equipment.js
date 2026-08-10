import client from './client';

export const getEquipment = (params = {}) =>
  client.get('/equipos', { params }).then((r) => r.data?.data?.data ?? []);

export const getEquipmentByUuid = (uuid) =>
  client.get(`/equipos/uuid/${uuid}`).then((r) => r.data?.data?.equipment ?? null);
