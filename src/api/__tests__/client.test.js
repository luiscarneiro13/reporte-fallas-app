import MockAdapter from 'axios-mock-adapter';
import client from '../client';

// Mock authStore as a Zustand store (has .getState())
jest.mock('../../store/authStore', () => {
  const mockStore = jest.fn();
  mockStore.getState = () => ({ token: 'test-token', clearAuth: jest.fn() });
  return { __esModule: true, default: mockStore };
});

// Mock configStore as a Zustand store
jest.mock('../../store/configStore', () => {
  const mockStore = jest.fn();
  mockStore.getState = () => ({ getApiBaseUrl: () => 'http://localhost:8090' });
  return { __esModule: true, default: mockStore };
});

describe('API Client Integration Tests', () => {
  let mock;

  beforeEach(() => {
    mock = new MockAdapter(client);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('client configuration', () => {
    it('should have correct default headers', () => {
      expect(client.defaults.headers['Content-Type']).toBe('application/json');
      expect(client.defaults.headers.Accept).toBe('application/json');
    });

    it('should have timeout configured', () => {
      expect(client.defaults.timeout).toBeDefined();
    });
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockData = [
        { id: 1, description: 'Fault 1', status: 'open' },
        { id: 2, description: 'Fault 2', status: 'closed' },
      ];

      mock.onGet('/api/faults').reply(200, mockData);

      const response = await client.get('/api/faults');

      expect(response.data).toEqual(mockData);
    });

    it('should handle unauthorized access', async () => {
      mock.onGet('/api/faults').reply(401, { message: 'Unauthorized' });

      await expect(client.get('/api/faults')).rejects.toThrow();
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request', async () => {
      const faultData = { equipment_id: 1, description: 'Test fault' };
      const mockResponse = { id: 1, ...faultData, status: 'open' };

      mock.onPost('/api/faults').reply(201, mockResponse);

      const response = await client.post('/api/faults', faultData);

      expect(response.data).toEqual(mockResponse);
      expect(JSON.parse(mock.history.post[0].data)).toEqual(faultData);
    });

    it('should handle validation errors', async () => {
      mock.onPost('/api/faults').reply(422, { message: 'Validation failed' });

      await expect(client.post('/api/faults', {})).rejects.toThrow();
    });
  });
});

