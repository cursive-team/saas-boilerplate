import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { prisma } from '@project/db';
import usersRouter from './users.js';
import { errorHandler } from '../middleware/error-handler.js';

// Mock auth to always return an authenticated user
// Note: Use literal strings since vi.mock is hoisted before constants are defined
vi.mock('@project/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: {
          id: 'users-test-user-id',
          email: 'users-test@example.com',
          name: 'Test User',
          emailVerified: false,
          image: null,
        },
        session: {
          id: 'users-test-session-id',
          userId: 'users-test-user-id',
          expiresAt: new Date(Date.now() + 86400000),
        },
      }),
    },
  },
  toAuthUser: vi.fn().mockImplementation((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    emailVerified: user.emailVerified,
    roles: [],
  })),
  hasRole: vi.fn().mockReturnValue(false),
  isAdmin: vi.fn().mockReturnValue(false),
  requireRole: vi
    .fn()
    .mockImplementation(() => (req: unknown, res: unknown, next: () => void) => next()),
}));

// Mock blob operations
vi.mock('@project/blob', () => ({
  getPresignedUploadUrl: vi.fn().mockResolvedValue({
    uploadUrl: 'https://storage.example.com/upload?signed=true',
    key: 'avatars/users-test-user-id/123456.jpg',
  }),
  getPresignedDownloadUrl: vi
    .fn()
    .mockResolvedValue('https://storage.example.com/download?signed=true'),
  deleteFile: vi.fn().mockResolvedValue(undefined),
}));

// Test IDs - unique per test file to avoid conflicts
const TEST_USER_ID = 'users-test-user-id';
const TEST_USER_EMAIL = 'users-test@example.com';

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);
app.use(errorHandler);

// Helper to clean up test data specific to this file
async function cleanupTestData() {
  await prisma.session.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.account.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
  // Also clean up any dynamically created users from GET /api/users/:id tests
  await prisma.user.deleteMany({ where: { email: 'get-test@example.com' } });
}

describe('GET /api/users/me', () => {
  beforeEach(async () => {
    // Clean up before each test - only this file's test data
    await cleanupTestData();

    // Create the test user that matches the mock auth
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        name: 'Test User',
        emailVerified: false,
      },
    });
  });

  it('returns the current authenticated user', async () => {
    const response = await request(app).get('/api/users/me');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(TEST_USER_EMAIL);
    expect(response.body.data.name).toBe('Test User');
  });
});

describe('GET /api/users/:id', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  it('returns a user by ID', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'get-test@example.com',
        name: 'Get Test User',
        emailVerified: false,
      },
    });

    const response = await request(app).get(`/api/users/${user.id}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('get-test@example.com');
    expect(response.body.data.name).toBe('Get Test User');
  });

  it('returns 404 for non-existent user', async () => {
    const response = await request(app).get('/api/users/non-existent-id');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('User not found');
  });
});

describe('PATCH /api/users/me', () => {
  beforeEach(async () => {
    await cleanupTestData();

    // Create the test user that matches the mock auth
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        name: 'Original Name',
        emailVerified: false,
      },
    });
  });

  it('updates user display name', async () => {
    const response = await request(app).patch('/api/users/me').send({
      name: 'Updated Name',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Updated Name');
    expect(response.body.message).toContain('updated successfully');

    // Verify in database
    const user = await prisma.user.findUnique({ where: { id: TEST_USER_ID } });
    expect(user?.name).toBe('Updated Name');
  });

  it('validates name field', async () => {
    const response = await request(app).patch('/api/users/me').send({
      name: '',
    });

    expect(response.status).toBe(400);
  });
});

describe('POST /api/users/me/avatar/presigned', () => {
  beforeEach(async () => {
    await cleanupTestData();

    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        name: 'Test User',
        emailVerified: false,
      },
    });
  });

  it('returns a presigned upload URL', async () => {
    const response = await request(app).post('/api/users/me/avatar/presigned').send({
      contentType: 'image/jpeg',
      extension: 'jpg',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.uploadUrl).toBeDefined();
    expect(response.body.data.key).toBeDefined();
  });

  it('validates content type', async () => {
    const response = await request(app).post('/api/users/me/avatar/presigned').send({
      contentType: 'text/plain',
      extension: 'txt',
    });

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/users/me/avatar', () => {
  beforeEach(async () => {
    await cleanupTestData();

    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        name: 'Test User',
        emailVerified: false,
        avatarKey: 'avatars/users-test-user-id/old-avatar.jpg',
      },
    });
  });

  it('deletes user avatar', async () => {
    const response = await request(app).delete('/api/users/me/avatar');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.image).toBeNull();
    expect(response.body.message).toContain('deleted');

    // Verify in database
    const user = await prisma.user.findUnique({ where: { id: TEST_USER_ID } });
    expect(user?.avatarKey).toBeNull();
  });
});
