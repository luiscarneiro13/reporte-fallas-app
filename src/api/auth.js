import client from './client';

export const loginRequest  = (email, password, locale, expoPushToken) =>
  client.post('/login', {
    email,
    password,
    locale,
    ...(expoPushToken ? { expo_token: expoPushToken } : {}),
  });

export const logoutRequest = () =>
  client.post('/logout');

export const deletePushTokenRequest = (expoPushToken) =>
  client.delete('/mobile/push-tokens', { data: { token: expoPushToken } });
