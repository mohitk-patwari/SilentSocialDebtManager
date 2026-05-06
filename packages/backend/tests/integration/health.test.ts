import request from 'supertest';
import { createApp } from '../../src/app';

describe('Backend smoke tests', () => {
  const { app } = createApp();

  test('GET /health returns ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });

  test('GET /api/queue returns queue payload', async () => {
    const response = await request(app).get('/api/queue');

    expect(response.status).toBe(200);
    expect(response.body.queue).toBeDefined();
    expect(response.body.total).toBeDefined();
    expect(response.body.top_n).toBeDefined();
  });

  test('POST /api/action/:id/approve returns success', async () => {
    const response = await request(app)
      .post('/api/action/test-action/approve')
      .send({ edits: 'Looks good' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.action_id).toBe('test-action');
    expect(response.body.edits_applied).toBe(true);
  });

  test('POST /api/action/:id/dismiss returns success', async () => {
    const response = await request(app)
      .post('/api/action/test-action/dismiss')
      .send({ reason: 'Not needed' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.action_id).toBe('test-action');
    expect(response.body.reason).toBe('Not needed');
  });
});
