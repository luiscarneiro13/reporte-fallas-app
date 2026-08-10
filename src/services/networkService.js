import { AppState } from 'react-native';
import axios from 'axios';
import { onlineManager } from '@tanstack/react-query';
import useConfigStore from '../store/configStore';
import useAuthStore from '../store/authStore';

const listeners = new Set();
let isOnline = true;
let pingInterval = null;
let appStateSubscription = null;

function notify() {
  listeners.forEach((fn) => fn(isOnline));
}

export function setIsOnline(value) {
  if (value !== isOnline) {
    isOnline = value;
    onlineManager.setOnline(value);
    notify();
  }
}

function buildPingUrl() {
  const baseUrl = useConfigStore.getState().apiBaseUrl;
  if (!baseUrl) return null;
  return baseUrl.replace(/\/+$/, '') + '/health';
}

async function checkConnectivity() {
  const url = buildPingUrl();
  if (!url) return;

  try {
    const token = useAuthStore.getState().token;
    const headers = {
      Accept: 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await axios.get(url, {
      headers,
      timeout: 8000,
      validateStatus: (status) => status < 500,
    });

    if (res.status < 500) {
      setIsOnline(true);
    }
  } catch (err) {
    if (!err.response) {
      setIsOnline(false);
    }
  }
}

export function subscribeToConnectivity(fn) {
  listeners.add(fn);
  fn(isOnline);
  return () => listeners.delete(fn);
}

export function getIsOnline() {
  return isOnline;
}

export function startConnectivityMonitoring() {
  if (pingInterval) return;
  checkConnectivity();
  pingInterval = setInterval(checkConnectivity, 30000);
  appStateSubscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      checkConnectivity();
    }
  });
}

export function stopConnectivityMonitoring() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}