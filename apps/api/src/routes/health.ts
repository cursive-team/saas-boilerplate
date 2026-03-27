import { Router, type Router as ExpressRouter } from 'express';
import { prisma } from '@project/db';

const router: ExpressRouter = Router();

router.get('/', async (_req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      error: 'Service unavailable',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      },
    });
  }
});

export default router;
