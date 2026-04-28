import express from 'express';
import pool from '../config/database.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { createOrder } from '../services/orderService.js';
import { io } from '../index.js';

const router = express.Router();
router.use(authMiddleware);

// Get all orders
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { clientId, paymentStatus, from, to } = req.query;
    const user = req.user!;
    
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params: any[] = [];

    // Shopkeepers can only see their own orders
    if (!user.isAdmin) {
      params.push(user.userId);
      query += ` AND shopkeeper_id = $${params.length}`;
    }

    if (clientId) {
      params.push(clientId);
      query += ` AND client_id = $${params.length}`;
    }

    if (paymentStatus) {
      params.push(paymentStatus);
      query += ` AND payment_status = $${params.length}`;
    }

    if (from) {
      params.push(from);
      query += ` AND timestamp >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      query += ` AND timestamp <= $${params.length}`;
    }

    query += ' ORDER BY timestamp DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders', code: 'ORDERS_FETCH_ERROR' });
  }
});

// Get single order
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' });
    }

    const order = result.rows[0];

    // Shopkeepers can only see their own orders
    if (!req.user!.isAdmin && order.shopkeeper_id !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order', code: 'ORDER_FETCH_ERROR' });
  }
});

// Create order
router.post('/', async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    
    const order = await createOrder(req.body, user.userId, (user as any).displayName);
    
    res.status(201).json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'ORDER_CREATE_ERROR' });
  }
});

// Update order (Admin only)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    const result = await pool.query(
      `UPDATE orders SET
        payment_status = COALESCE($1, payment_status)
      WHERE id = $2 RETURNING *`,
      [payment_status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' });
    }

    const order = result.rows[0];
    io.emit('order:updated', order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order', code: 'ORDER_UPDATE_ERROR' });
  }
});

// Delete order (Admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' });
    }

    io.emit('order:deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order', code: 'ORDER_DELETE_ERROR' });
  }
});

export default router;