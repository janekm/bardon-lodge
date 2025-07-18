import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker, { Env } from './index';

// A reusable mock for a D1 statement
const mockStatement = {
  bind: vi.fn(),
  all: vi.fn(),
  run: vi.fn(),
};
// Ensure that calling .bind() returns the statement, so we can chain .all() or .run()
mockStatement.bind.mockReturnValue(mockStatement);

// Mock D1 database
const mockDb = {
  prepare: vi.fn(() => mockStatement),
};

// Mock environment
const mockEnv: Env = {
  DB: mockDb as any,
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  mockStatement.bind.mockClear();
  mockStatement.all.mockClear();
  mockStatement.run.mockClear();
});

describe('Worker API Handlers', () => {
  describe('Authorization', () => {
    it('should return 403 if Cf-Access-Authenticated-User-Email header is missing', async () => {
      const request = new Request('http://example.com/api/recipients', { method: 'GET' });
      const response = await worker.fetch(request, mockEnv, {} as any);
      expect(response.status).toBe(403);
    });

    it('should return 403 if authenticated user is not in the recipients list', async () => {
      mockStatement.all.mockResolvedValue({ results: [] });
      const request = new Request('http://example.com/api/recipients', {
        method: 'GET',
        headers: { 'Cf-Access-Authenticated-User-Email': 'unauthorized@test.com' },
      });
      const response = await worker.fetch(request, mockEnv, {} as any);
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/recipients', () => {
    it('should return a list of recipients for an authorized user', async () => {
      const mockRecipients = [{ id: 1, email: 'director@test.com', active: 1 }];
      // Auth check
      mockStatement.all.mockResolvedValueOnce({ results: [{ id: 1 }] });
      // Get recipients
      mockStatement.all.mockResolvedValueOnce({ results: mockRecipients });

      const request = new Request('http://example.com/api/recipients', {
        method: 'GET',
        headers: { 'Cf-Access-Authenticated-User-Email': 'director@test.com' },
      });
      const response = await worker.fetch(request, mockEnv, {} as any);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(mockRecipients);
    });
  });

  describe('POST /api/recipients', () => {
    it('should add a new recipient', async () => {
      // Auth check
      mockStatement.all.mockResolvedValueOnce({ results: [{ id: 1 }] });
      // Insert
      mockStatement.run.mockResolvedValueOnce({ meta: { changes: 1 } });

      const request = new Request('http://example.com/api/recipients', {
        method: 'POST',
        headers: {
          'Cf-Access-Authenticated-User-Email': 'director@test.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'new@director.com' }),
      });

      const response = await worker.fetch(request, mockEnv, {} as any);
      expect(response.status).toBe(201);
    });
  });

  describe('DELETE /api/recipients/:id', () => {
    it('should deactivate a recipient', async () => {
      // Auth check
      mockStatement.all.mockResolvedValueOnce({ results: [{ id: 1 }] });
      // Deactivate
      mockStatement.run.mockResolvedValueOnce({ meta: { changes: 1 } });

      const request = new Request('http://example.com/api/recipients/2', {
        method: 'DELETE',
        headers: { 'Cf-Access-Authenticated-User-Email': 'director@test.com' },
      });

      const response = await worker.fetch(request, mockEnv, {} as any);
      expect(response.status).toBe(204);
    });
  });
});

describe('Worker Email Handler', () => {
  const mockMessage = {
    from: 'sender@example.com',
    to: 'directors@bardonlodge.co.uk',
    forward: vi.fn(),
    setReject: vi.fn(),
  };

  it('should forward email to all active recipients', async () => {
    const mockRecipients = [{ email: 'a@test.com' }, { email: 'b@test.com' }];
    mockStatement.all.mockResolvedValue({ results: mockRecipients });

    await worker.email(mockMessage as any, mockEnv, {} as any);

    expect(mockMessage.forward).toHaveBeenCalledTimes(2);
    expect(mockMessage.forward).toHaveBeenCalledWith('a@test.com');
    expect(mockMessage.forward).toHaveBeenCalledWith('b@test.com');
    expect(mockMessage.setReject).not.toHaveBeenCalled();
  });

  it('should reject email if no active recipients are found', async () => {
    mockStatement.all.mockResolvedValue({ results: [] });

    await worker.email(mockMessage as any, mockEnv, {} as any);

    expect(mockMessage.forward).not.toHaveBeenCalled();
    expect(mockMessage.setReject).toHaveBeenCalledWith('No active recipients for this alias.');
  });
});
