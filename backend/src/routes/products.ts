import express from 'express';
import pool from '../config/database.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { io } from '../index.js';

const router = express.Router();
router.use(authMiddleware);

// Get all products
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { category, lowStock, search } = req.query;
    
    let query = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (lowStock === 'true') {
      query += ' AND stock <= min_stock_alert';
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR sku ILIKE $${params.length})`;
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products', code: 'PRODUCTS_FETCH_ERROR' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product', code: 'PRODUCT_FETCH_ERROR' });
  }
});

// Create product (Admin only)
router.post('/', adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { sku, name, category, sizes, wholesale_price, retail_price, stock, min_stock_alert } = req.body;

    const result = await pool.query(
      `INSERT INTO products (sku, name, category, sizes, wholesale_price, retail_price, stock, min_stock_alert)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [sku, name, category, sizes, wholesale_price, retail_price, stock || 0, min_stock_alert || 10]
    );

    const product = result.rows[0];
    io.emit('product:created', product);

    res.status(201).json(product);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'SKU already exists', code: 'DUPLICATE_SKU' });
    }
    res.status(500).json({ error: 'Failed to create product', code: 'PRODUCT_CREATE_ERROR' });
  }
});

// Update product
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { sku, name, category, sizes, wholesale_price, retail_price, stock, min_stock_alert } = req.body;
    const isAdmin = req.user!.isAdmin;

    let query, params;

    if (isAdmin) {
      // Admin can update all fields
      query = `UPDATE products SET
        sku = COALESCE($1, sku),
        name = COALESCE($2, name),
        category = COALESCE($3, category),
        sizes = COALESCE($4, sizes),
        wholesale_price = COALESCE($5, wholesale_price),
        retail_price = COALESCE($6, retail_price),
        stock = COALESCE($7, stock),
        min_stock_alert = COALESCE($8, min_stock_alert),
        updated_at = NOW()
      WHERE id = $9 RETURNING *`;

      params = [sku, name, category, sizes, wholesale_price, retail_price, stock, min_stock_alert, id];
    } else {
      // Shopkeeper can only update stock
      query = `UPDATE products SET
        stock = $1,
        updated_at = NOW()
      WHERE id = $2 RETURNING *`;

      params = [stock, id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }

    const product = result.rows[0];
    io.emit('product:updated', product);

    // Check low stock alert
    if (product.stock <= product.min_stock_alert) {
      const adminsResult = await pool.query('SELECT user_id FROM admins');
      for (const admin of adminsResult.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, 'warning')`,
          [admin.user_id, 'Low Stock Alert', `${product.name} is running low (${product.stock} remaining)`]
        );
        io.to(admin.user_id).emit('notification:created');
      }
    }

    res.json(product);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'SKU already exists', code: 'DUPLICATE_SKU' });
    }
    res.status(500).json({ error: 'Failed to update product', code: 'PRODUCT_UPDATE_ERROR' });
  }
});

// Delete product (Admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }

    io.emit('product:deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product', code: 'PRODUCT_DELETE_ERROR' });
  }
});

export default router;