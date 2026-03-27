import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import healthRouter from './health.js';

const app = express();
app.use('/health', healthRouter);

describe('GET /health', () => {
  it('returns healthy status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('healthy');
    expect(response.body.data.database).toBe('connected');
    expect(response.body.data.timestamp).toBeDefined();
  });
});
