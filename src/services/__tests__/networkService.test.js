jest.mock('axios', () => ({ get: jest.fn() }));

jest.mock('../../store/authStore', () => {
  const mockStore = jest.fn();
  mockStore.getState = () => ({ token: 'test-token' });
  return { __esModule: true, default: mockStore };
});

jest.mock('../../store/configStore', () => {
  const mockStore = jest.fn();
  mockStore.getState = () => ({ apiBaseUrl: 'http://localhost:8090/api/v1/' });
  return { __esModule: true, default: mockStore };
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('networkService', () => {
  let axios;
  let networkService;

  beforeEach(() => {
    jest.resetModules();
    axios = require('axios');
    axios.get.mockReset();
    networkService = require('../networkService');
  });

  afterEach(() => {
    networkService.stopConnectivityMonitoring();
    jest.useRealTimers();
  });

  it('starts online by default', () => {
    expect(networkService.getIsOnline()).toBe(true);
  });

  it('notifies subscribers immediately and again only on real changes', () => {
    const fn = jest.fn();
    networkService.subscribeToConnectivity(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith(true);

    networkService.setIsOnline(true); // sin cambio real
    expect(fn).toHaveBeenCalledTimes(1);

    networkService.setIsOnline(false);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(false);
    expect(networkService.getIsOnline()).toBe(false);
  });

  it('stops notifying after unsubscribe', () => {
    const fn = jest.fn();
    const unsubscribe = networkService.subscribeToConnectivity(fn);
    unsubscribe();

    networkService.setIsOnline(false);

    expect(fn).toHaveBeenCalledTimes(1); // solo la llamada inicial al suscribirse
  });

  it('pings <apiBaseUrl>/health with the auth token and sets online on a healthy response', async () => {
    axios.get.mockResolvedValue({ status: 200 });
    networkService.setIsOnline(false);

    networkService.startConnectivityMonitoring();
    await flush();

    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:8090/api/v1/health',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      })
    );
    expect(networkService.getIsOnline()).toBe(true);
  });

  it('marks offline when the ping fails with no response (network error)', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'));

    networkService.startConnectivityMonitoring();
    await flush();

    expect(networkService.getIsOnline()).toBe(false);
  });

  it('leaves the online flag untouched when the server responds with a 5xx', async () => {
    axios.get.mockRejectedValue({ response: { status: 500 } });

    networkService.startConnectivityMonitoring();
    await flush();

    expect(networkService.getIsOnline()).toBe(true); // no lo tira offline por un error del servidor
  });

  it('only pings once immediately even if start is called twice', async () => {
    axios.get.mockResolvedValue({ status: 200 });

    networkService.startConnectivityMonitoring();
    networkService.startConnectivityMonitoring();
    await flush();

    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('re-pings on an interval until stopped', async () => {
    jest.useFakeTimers();
    axios.get.mockResolvedValue({ status: 200 });

    networkService.startConnectivityMonitoring();
    await jest.advanceTimersByTimeAsync(0);
    expect(axios.get).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(30000);
    expect(axios.get).toHaveBeenCalledTimes(2);

    networkService.stopConnectivityMonitoring();
    await jest.advanceTimersByTimeAsync(30000);
    expect(axios.get).toHaveBeenCalledTimes(2);
  });
});
