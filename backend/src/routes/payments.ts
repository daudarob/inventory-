import express from 'express';
import pool from '../config/database.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { createPayment } from '../services/paymentService.js';
import { io } from '../index.js';

const router = express.Router();
router.use(authMiddleware);

// Get all payments
router.get('/', async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    let query = 'SELECT * FROM payments WHERE 1=1';
    const params: any[] = [];

    // Shopkeepers can only see their own payments
    if (!user.isAdmin) {
      params.push(user.userId);
      query += ` AND shopkeeper_id = $${params.length}`;
    }

    query += ' ORDER BY timestamp DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments', code: 'PAYMENTS_FETCH_ERROR' });
  }
});

// Get single payment
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found', code: 'PAYMENT_NOT_FOUND' });
    }

    const payment = result.rows[0];

    // Shopkeepers can only see their own payments
    if (!req.user!.isAdmin && payment.shopkeeper_id !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment', code: 'PAYMENT_FETCH_ERROR' });
  }
});

// Create payment
router.post('/', async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    const payment = await createPayment(req.body, user.userId, (user as any).displayName);
    
    res.status(201).json(payment);
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'PAYMENT_CREATE_ERROR' });
  }
});

// Update payment (Admin only)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method, reference } = req.body;

    const result = await pool.query(
      `UPDATE payments SET
        amount = COALESCE($1, amount),
        method = COALESCE($2, method),
        reference = COALESCE($3, reference)
      WHERE id = $4 RETURNING *`,
      [amount, method, reference, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found', code: 'PAYMENT_NOT_FOUND' });
    }

    const payment = result.rows[0];
    io.emit('payment:updated', payment);

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payment', code: 'PAYMENT_UPDATE_ERROR' });
  }
});

// Delete payment (Admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM payments WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found', code: 'PAYMENT_NOT_FOUND' });
    }

    io.emit('payment:deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete payment', code: 'PAYMENT_DELETE_ERROR' });
  }
});

export default router;