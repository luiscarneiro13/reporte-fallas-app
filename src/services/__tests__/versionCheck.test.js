import MockAdapter from 'axios-mock-adapter';
import client from '../../api/client';
import { checkForUpdate } from '../versionCheck';

jest.mock('../../store/authStore', () => {
  const mockStore = jest.fn();
  mockStore.getState = () => ({ token: 'test-token', clearAuth: jest.fn() });
  return { __esModule: true, default: mockStore };
});

jest.mock('../../store/configStore', () => {
  const mockStore = jest.fn();
  mockStore.getState = () => ({ apiBaseUrl: '' });
  return { __esModule: true, default: mockStore };
});

// APP_VERSION en src/constants/index.js es '1.0.2' al momento de escribir este test.
describe('versionCheck.checkForUpdate', () => {
  let mock;

  beforeEach(() => {
    mock = new MockAdapter(client);
  });

  afterEach(() => {
    mock.restore();
  });

  it('reports no update required when the app is on the latest version', async () => {
    mock.onGet('/app/version').reply(200, {
      data: { latest_version: '1.0.2', min_version: '1.0.0' },
    });

    await expect(checkForUpdate()).resolves.toEqual({ updateRequired: false });
  });

  it('forces an update when below the minimum supported version', async () => {
    mock.onGet('/app/version').reply(200, {
      data: { latest_version: '1.1.0', min_version: '1.1.0', update_url: 'https://x/update' },
    });

    const result = await checkForUpdate();

    expect(result).toEqual({
      updateRequired: true,
      force: true,
      updateUrl: 'https://x/update',
      message: 'Tu versión ya no es compatible. Actualiza para continuar.',
    });
  });

  it('reports a skippable update when there is a newer, non-mandatory version', async () => {
    mock.onGet('/app/version').reply(200, {
      data: {
        latest_version: '1.1.0',
        min_version: '1.0.0',
        update_url: 'https://x/update',
        force: false,
        message: 'Hay una versión nueva',
      },
    });

    const result = await checkForUpdate();

    expect(result).toEqual({
      updateRequired: true,
      force: false,
      updateUrl: 'https://x/update',
      message: 'Hay una versión nueva',
      canSkip: true,
    });
  });

  it('treats a missing force flag as mandatory', async () => {
    mock.onGet('/app/version').reply(200, {
      data: { latest_version: '1.1.0', min_version: '1.0.0', update_url: 'https://x/update' },
    });

    const result = await checkForUpdate();

    expect(result.force).toBe(true);
    expect(result.canSkip).toBe(false);
  });

  it('fails open (no update required) when the request errors', async () => {
    mock.onGet('/app/version').networkError();

    await expect(checkForUpdate()).resolves.toEqual({ updateRequired: false });
  });
});
