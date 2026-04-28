import express from 'express';
import pool from '../config/database.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);
router.use(adminMiddleware);

// Get all audit logs (Admin only)
router.get('/', async (req, res) => {
  try {
    const { shopkeeperId, from, to, search } = req.query;
    
    let query = 'SELECT * FROM logs WHERE 1=1';
    const params: any[] = [];

    if (shopkeeperId) {
      params.push(shopkeeperId);
      query += ` AND shopkeeper_id = $${params.length}`;
    }

    if (from) {
      params.push(from);
      query += ` AND timestamp >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      query += ` AND timestamp <= $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (action ILIKE $${params.length} OR details ILIKE $${params.length})`;
    }

    query += ' ORDER BY timestamp DESC LIMIT 500';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs', code: 'LOGS_FETCH_ERROR' });
  }
});

export default router;