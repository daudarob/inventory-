import express from 'express';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { io } from '../index.js';

const router = express.Router();
router.use(authMiddleware);

// Get user notifications
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { read } = req.query;
    const userId = req.user!.userId;
    
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const params: any[] = [userId];

    if (read === 'false') {
      query += ' AND read = false';
    }

    query += ' ORDER BY timestamp DESC LIMIT 100';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications', code: 'NOTIFICATIONS_FETCH_ERROR' });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found', code: 'NOTIFICATION_NOT_FOUND' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification', code: 'NOTIFICATION_UPDATE_ERROR' });
  }
});

// Delete notification
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found', code: 'NOTIFICATION_NOT_FOUND' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification', code: 'NOTIFICATION_DELETE_ERROR' });
  }
});

export default router;