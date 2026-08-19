import client from './client';

export const getEquipment = ({ pageParam, ...params } = {}) =>
  client.get('/equipos', { params: { page: pageParam, ...params } });

export const getEquipmentById = (id) =>
  client.get(`/equipos/${id}`).then((r) => r.data?.data ?? null);

export const getEquipmentHistory = (id) =>
  client.get(`/equipos/${id}/historial`).then((r) => r.data?.data ?? null);
