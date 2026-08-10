import client from '../api/client';
import { APP_VERSION } from '../constants';

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

export async function checkForUpdate() {
  try {
    const res = await client.get('/app/version');
    const data = res.data?.data || res.data;

    const latestVersion = data.latest_version;
    const minVersion = data.min_version;
    const updateUrl = data.update_url;
    const force = data.force !== false;
    const message = data.message || 'Nueva versión disponible';

    const isMinMet = compareVersions(APP_VERSION, minVersion) >= 0;
    const isLatest = compareVersions(APP_VERSION, latestVersion) >= 0;

    if (isMinMet && isLatest) {
      return { updateRequired: false };
    }

    if (!isMinMet) {
      return {
        updateRequired: true,
        force: true,
        updateUrl,
        message: 'Tu versión ya no es compatible. Actualiza para continuar.',
      };
    }

    return {
      updateRequired: true,
      force,
      updateUrl,
      message,
      canSkip: !force,
    };
  } catch {
    return { updateRequired: false };
  }
}
