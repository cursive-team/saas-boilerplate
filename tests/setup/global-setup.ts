/**
 * Global setup for integration tests.
 *
 * Sets up test containers for PostgreSQL and MinIO before tests run.
 */

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { execSync } from 'child_process';

let postgresContainer: StartedPostgreSqlContainer;
let minioContainer: StartedTestContainer;

export async function setup() {
  console.log('\n🔧 Starting test containers...\n');

  // Start PostgreSQL container
  postgresContainer = await new PostgreSqlContainer('postgres:16')
    .withDatabase('test_db')
    .withUsername('test')
    .withPassword('test')
    .start();

  // Start MinIO container for blob storage
  minioContainer = await new GenericContainer('minio/minio')
    .withExposedPorts(9000)
    .withEnvironment({
      MINIO_ROOT_USER: 'minioadmin',
      MINIO_ROOT_PASSWORD: 'minioadmin',
    })
    .withCommand(['server', '/data'])
    .withWaitStrategy(Wait.forHttp('/minio/health/live', 9000).forStatusCode(200))
    .start();

  // Set environment variables for tests
  const databaseUrl = postgresContainer.getConnectionUri();
  const minioEndpoint = `http://${minioContainer.getHost()}:${minioContainer.getMappedPort(9000)}`;

  process.env.DATABASE_URL = databaseUrl;
  process.env.BUCKET_ENDPOINT = minioEndpoint;
  process.env.BUCKET_ACCESS_KEY_ID = 'minioadmin';
  process.env.BUCKET_SECRET_ACCESS_KEY = 'minioadmin';
  process.env.BUCKET_NAME = 'test-bucket';
  process.env.BUCKET_REGION = 'us-east-1';

  // Run Prisma migrations
  console.log('📦 Running database migrations...');
  execSync('pnpm db:migrate:deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  console.log('\n✅ Test containers ready\n');
}

export async function teardown() {
  console.log('\n🧹 Stopping test containers...\n');

  await postgresContainer?.stop();
  await minioContainer?.stop();

  console.log('✅ Test containers stopped\n');
}
