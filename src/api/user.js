import client from './client';

export const updateLanguageRequest = (code) =>
  client.put('/user/language', { code });
