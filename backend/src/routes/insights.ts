import express from 'express';
import pool from '../config/database.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { generateInsights } from '../services/aiService.js';
import { io } from '../index.js';

const router = express.Router();
router.use(authMiddleware);

// Get all insights
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM insights ORDER BY timestamp DESC LIMIT 50');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch insights', code: 'INSIGHTS_FETCH_ERROR' });
  }
});

// Generate new insights (Admin only)
router.post('/generate', adminMiddleware, async (req, res) => {
  try {
    const insights = await generateInsights();
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate insights', code: 'INSIGHTS_GENERATE_ERROR' });
  }
});

// Delete insight (Admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM insights WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete insight', code: 'INSIGHT_DELETE_ERROR' });
  }
});

export default router;