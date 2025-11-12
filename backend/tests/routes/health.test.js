import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const supabaseMock = {
  from: jest.fn(() => ({
    select: jest.fn(() => Promise.resolve({ data: null, error: null }))
  }))
};

jest.unstable_mockModule('../../src/config/supabase.js', () => ({
  supabase: supabaseMock
}));

const routes = (await import('../../src/routes/index.js')).default;

const app = express();
app.use(express.json());
app.use('/', routes);

describe('GET /health', () => {
  it('retorna status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      status: 'ok',
      service: 'TheProParking Backend'
    }));
  });
});

