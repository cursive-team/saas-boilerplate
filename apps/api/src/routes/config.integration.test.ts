import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import configRouter from './config.js';

// Create test app
const app = express();
app.use('/api/config', configRouter);

describe('GET /api/config', () => {
  it('returns public app configuration', async () => {
    const response = await request(app).get('/api/config');

    expect(response.status).toBe(200);
    expect(response.body.appName).toBeDefined();
    expect(response.body.version).toBeDefined();
    expect(response.body.trial).toBeDefined();
    expect(response.body.trial.durationDays).toBeTypeOf('number');
    expect(response.body.trial.requireCard).toBeTypeOf('boolean');
    expect(response.body.referrals).toBeDefined();
    expect(response.body.referrals.enabled).toBeTypeOf('boolean');
    expect(response.body.plans).toBeInstanceOf(Array);
  });

  it('returns plans as array of plan objects with IDs', async () => {
    const response = await request(app).get('/api/config');

    const planIds = response.body.plans.map((p: { id: string }) => p.id);
    expect(planIds).toContain('starter');
    expect(planIds).toContain('pro');
  });
});
