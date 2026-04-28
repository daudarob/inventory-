import express from 'express';
import pool from '../config/database.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);
router.use(adminMiddleware);

// Total revenue
router.get('/revenue', async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    let interval;
    switch (period) {
      case 'week': interval = '7 days'; break;
      case 'month': interval = '30 days'; break;
      case 'year': interval = '365 days'; break;
      default: interval = '30 days';
    }

    const result = await pool.query(
      `SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders FROM orders WHERE timestamp >= NOW() - INTERVAL '${interval}'`
    );

    res.json({
      revenue: parseFloat(result.rows[0].revenue),
      orders: parseInt(result.rows[0].orders)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch revenue', code: 'REVENUE_FETCH_ERROR' });
  }
});

// Top products by units sold
router.get('/top-products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        item->>'productName' as name,
        SUM((item->>'quantity')::int) as quantity
      FROM orders,
      LATERAL jsonb_array_elements(items) as item
      WHERE timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY item->>'productId', item->>'productName'
      ORDER BY quantity DESC
      LIMIT 10
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch top products', code: 'TOP_PRODUCTS_ERROR' });
  }
});

// Top clients by spend
router.get('/top-clients', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        client_name as name,
        SUM(total) as total_spend,
        COUNT(*) as order_count
      FROM orders
      WHERE timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY client_id, client_name
      ORDER BY total_spend DESC
      LIMIT 10
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch top clients', code: 'TOP_CLIENTS_ERROR' });
  }
});

// Sales by category
router.get('/sales-by-category', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.category,
        COALESCE(SUM((item->>'quantity')::int * (item->>'unitPrice')::numeric), 0) as revenue
      FROM orders,
      LATERAL jsonb_array_elements(items) as item
      LEFT JOIN products p ON p.id = (item->>'productId')::uuid
      WHERE orders.timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY p.category
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category sales', code: 'CATEGORY_SALES_ERROR' });
  }
});

// Sales by shopkeeper
router.get('/sales-by-shopkeeper', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        shopkeeper_name,
        SUM(total) as revenue,
        COUNT(*) as order_count
      FROM orders
      WHERE timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY shopkeeper_id, shopkeeper_name
      ORDER BY revenue DESC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shopkeeper sales', code: 'SHOPKEEPER_SALES_ERROR' });
  }
});

// Payment status breakdown
router.get('/payment-status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        payment_status,
        COUNT(*) as count,
        SUM(total) as amount
      FROM orders
      GROUP BY payment_status
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment status', code: 'PAYMENT_STATUS_ERROR' });
  }
});

export default router;